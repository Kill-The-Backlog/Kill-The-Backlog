import type { Updateable } from "@ktb/db/kysely-types";
import type { CardRun } from "@ktb/db/types";
import type { Job } from "bullmq";

import { Octokit } from "@octokit/rest";
import { Sandbox } from "e2b";
import { quote } from "shell-quote";

import { createClaudeCodeParser } from "#lib/.server/agents/claude-code.js";
import { db } from "#lib/.server/clients/db.js";
import { redis } from "#lib/.server/clients/redis.js";
import { serverEnv } from "#lib/.server/env/server.js";
import { defineWorker } from "#lib/.server/workers/define-worker.js";
import { makeOutputEmitter } from "#lib/run-output/.server/emitter.js";

export type CardRunJobData = {
  repoId: number;
  runId: string;
  userId: number;
};

const OUTPUT_TTL_SECONDS = 604_800; // 7 days
const REPO_PATH = "/home/user/repo";
const SANDBOX_TIMEOUT_MS = 600_000;

export function cardRunOutputKey(runId: string) {
  return `card-run:${runId}:output`;
}

export const cardRunWorker = defineWorker<CardRunJobData, undefined>(
  "card-run",
  cardRunHandler,
  {
    // @todo: Update value when we have a better idea of the concurrency limits.
    workerConcurrency: 20,
  },
);

type CardRunOutputEmitter = ReturnType<typeof makeOutputEmitter>;

function buildBranchName(runId: string) {
  const shortId = runId.slice(0, 8);
  return `ktb/run-${shortId}`;
}

async function cardRunHandler(job: Job<CardRunJobData>): Promise<undefined> {
  const { repoId, runId, userId } = job.data;
  const key = cardRunOutputKey(runId);
  const output = makeOutputEmitter(async (event) => {
    await redis
      .pipeline()
      .rpush(key, JSON.stringify(event))
      .expire(key, OUTPUT_TTL_SECONDS)
      .exec();
  });

  let sandbox: null | Sandbox = null;

  try {
    const { ANTHROPIC_API_KEY, E2B_API_KEY } = requireCardRunEnv();

    await updateRun(runId, { status: "running" });

    sandbox = await Sandbox.create("claude", {
      apiKey: E2B_API_KEY,
      envs: { ANTHROPIC_API_KEY },
      timeoutMs: SANDBOX_TIMEOUT_MS,
    });

    await executeCardRun({ output, repoId, runId, sandbox, userId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    await updateRun(runId, { status: "failed" });

    output.emitError(message);

    throw error;
  } finally {
    try {
      output.emitDone();
      await output.flush();
    } finally {
      if (sandbox) await sandbox.kill();
    }
  }
}

async function cloneRepoAndCreateBranch({
  branchName,
  fullName,
  oauthAccessToken,
  output,
  sandbox,
}: {
  branchName: string;
  fullName: string;
  oauthAccessToken: string;
  output: CardRunOutputEmitter;
  sandbox: Sandbox;
}) {
  await output.step("Cloning repository...", async () => {
    await sandbox.git.clone(`https://github.com/${fullName}.git`, {
      depth: 1,
      path: REPO_PATH,
      ...githubHttpsTokenAuth(oauthAccessToken),
    });

    await sandbox.git.configureUser(
      "Kill The Backlog",
      // @todo: Use a real email address.
      "ktb@users.noreply.github.com",
    );
  });

  await output.step("Creating branch...", async () => {
    await sandbox.git.createBranch(REPO_PATH, branchName);
  });
}

async function executeCardRun({
  output,
  repoId,
  runId,
  sandbox,
  userId,
}: {
  output: CardRunOutputEmitter;
  repoId: number;
  runId: string;
  sandbox: Sandbox;
  userId: number;
}) {
  const context = await queryCardRunContext({ repoId, runId, userId });
  const branchName = buildBranchName(runId);

  await cloneRepoAndCreateBranch({
    branchName,
    fullName: context.fullName,
    oauthAccessToken: context.oauthAccessToken,
    output,
    sandbox,
  });

  await runClaudeCodeJob({
    cardTitle: context.cardTitle,
    output,
    sandbox,
  });

  await finalizeRunWithGit({
    branchName,
    cardTitle: context.cardTitle,
    fullName: context.fullName,
    oauthAccessToken: context.oauthAccessToken,
    output,
    runId,
    sandbox,
  });
}

async function finalizeRunWithGit({
  branchName,
  cardTitle,
  fullName,
  oauthAccessToken,
  output,
  runId,
  sandbox,
}: {
  branchName: string;
  cardTitle: string;
  fullName: string;
  oauthAccessToken: string;
  output: CardRunOutputEmitter;
  runId: string;
  sandbox: Sandbox;
}) {
  const [repoOwner, repoName] = fullName.split("/");

  await output.step("Committing and pushing...", async (emit) => {
    await sandbox.git.add(REPO_PATH, { all: true });

    const status = await sandbox.git.status(REPO_PATH);
    if (status.isClean) {
      await updateRun(runId, { status: "completed" });
      emit.emitText("No changes were made.");
      return;
    }

    await sandbox.git.commit(REPO_PATH, `ktb: ${cardTitle}`);

    await sandbox.git.push(REPO_PATH, {
      branch: branchName,
      remote: "origin",
      ...githubHttpsTokenAuth(oauthAccessToken),
    });

    await updateRun(runId, { branchName, status: "completed" });
    emit.emitText(`Done! Branch: ${branchName}`);
  });

  await output.step("Creating pull request...", async (emit) => {
    const octokit = new Octokit({ auth: oauthAccessToken });

    const { data: pr } = await octokit.rest.pulls.create({
      owner: repoOwner,
      repo: repoName,
      title: `[ktb] ${cardTitle}`,
      body: `Kill The Backlog - Card: ${cardTitle}`,
      head: branchName,
      base: "main",
    });

    const prUrl = pr.html_url;
    await updateRun(runId, { prUrl });

    emit.emitText(`Pull Request created: ${prUrl}`);
  });
}

function githubHttpsTokenAuth(oauthAccessToken: string) {
  return {
    password: oauthAccessToken,
    username: "x-access-token" as const,
  };
}

async function queryCardRunContext({
  repoId,
  runId,
  userId,
}: {
  repoId: number;
  runId: string;
  userId: number;
}) {
  return db
    .selectFrom("GitHubRepo")
    .innerJoin("GitHubAccount", "GitHubAccount.userId", "GitHubRepo.userId")
    .innerJoin("CardRun", "CardRun.repoId", "GitHubRepo.id")
    .innerJoin("KanbanCard", "KanbanCard.id", "CardRun.cardId")
    .select([
      "GitHubRepo.fullName",
      "GitHubAccount.oauthAccessToken",
      "KanbanCard.title as cardTitle",
    ])
    .where("GitHubRepo.id", "=", repoId)
    .where("GitHubRepo.userId", "=", userId)
    .where("CardRun.id", "=", runId)
    .executeTakeFirstOrThrow();
}

function requireCardRunEnv() {
  const { ANTHROPIC_API_KEY, E2B_API_KEY } = serverEnv;

  if (!ANTHROPIC_API_KEY || !E2B_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY and E2B_API_KEY are required to run cards",
    );
  }

  return { ANTHROPIC_API_KEY, E2B_API_KEY };
}

async function runClaudeCodeJob({
  cardTitle,
  output,
  sandbox,
}: {
  cardTitle: string;
  output: CardRunOutputEmitter;
  sandbox: Sandbox;
}) {
  await output.step("Running Claude Code...", async (emit) => {
    const parser = createClaudeCodeParser(emit.emitText);

    await sandbox.commands.run(
      quote([
        "claude",
        "--dangerously-skip-permissions",
        "--output-format",
        "stream-json",
        "--verbose",
        "-p",
        cardTitle,
      ]),
      {
        cwd: REPO_PATH,
        onStderr: (data) => {
          emit.emitError(data);
        },
        onStdout: (data) => {
          parser.feed(data);
        },
        timeoutMs: 0,
      },
    );

    parser.flush();
    await output.flush();
  });
}

async function updateRun(runId: string, values: Updateable<CardRun>) {
  await db
    .updateTable("CardRun")
    .set({ ...values, updatedAt: new Date() })
    .where("id", "=", runId)
    .execute();
}
