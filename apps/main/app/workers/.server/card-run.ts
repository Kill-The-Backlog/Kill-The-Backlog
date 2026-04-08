import type { Updateable } from "@ktb/db/kysely-types";
import type { CardRun } from "@ktb/db/types";
import type { Job } from "bullmq";

import { Sandbox } from "e2b";
import { quote } from "shell-quote";

import type { RunOutputEvent } from "#lib/run-output.js";

import { createClaudeCodeParser } from "#lib/.server/agents/claude-code.js";
import { db } from "#lib/.server/clients/db.js";
import { redis } from "#lib/.server/clients/redis.js";
import { serverEnv } from "#lib/.server/env/server.js";
import { defineWorker } from "#lib/.server/workers/define-worker.js";

export type CardRunJobData = {
  repoId: number;
  runId: string;
  userId: number;
};

export function cardRunOutputKey(runId: string) {
  return `card-run:${runId}:output`;
}

const REPO_PATH = "/home/user/repo";
const OUTPUT_TTL_SECONDS = 604_800; // 7 days

export const cardRunWorker = defineWorker<CardRunJobData, undefined>(
  "card-run",
  handleCardRun,
  {
    // @todo: Update value when we have a better idea of the concurrency limits.
    workerConcurrency: 20,
  },
);

function buildBranchName(runId: string) {
  const shortId = runId.slice(0, 8);
  return `ktb/run-${shortId}`;
}

async function handleCardRun(job: Job<CardRunJobData>): Promise<undefined> {
  const { repoId, runId, userId } = job.data;
  const output = makeOutputAppender(runId);

  let sandbox: null | Sandbox = null;

  try {
    await updateRun(runId, { status: "running" });

    const { cardTitle, fullName, oauthAccessToken } = await db
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

    const branchName = buildBranchName(runId);

    sandbox = await Sandbox.create("claude", {
      envs: { ANTHROPIC_API_KEY: serverEnv.ANTHROPIC_API_KEY },
      timeoutMs: 600_000,
    });

    output.enqueue({ text: "Cloning repository...", type: "status" });

    await sandbox.git.clone(`https://github.com/${fullName}.git`, {
      depth: 1,
      password: oauthAccessToken,
      path: REPO_PATH,
      username: "x-access-token",
    });

    await sandbox.git.configureUser(
      "Kill The Backlog",
      // @todo: Use a real email address.
      "ktb@users.noreply.github.com",
    );

    output.enqueue({ text: "Creating branch...", type: "status" });

    await sandbox.git.createBranch(REPO_PATH, branchName);

    output.enqueue({ text: "Running Claude Code...", type: "status" });

    const parser = createClaudeCodeParser(output.enqueue);

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
          output.enqueue({ text: data, type: "error" });
        },
        onStdout: (data) => {
          parser.feed(data);
        },
      },
    );

    parser.flush();
    await output.flush();

    output.enqueue({ text: "Committing and pushing...", type: "status" });

    await sandbox.git.add(REPO_PATH, { all: true });

    const status = await sandbox.git.status(REPO_PATH);
    if (status.isClean) {
      await updateRun(runId, { status: "completed" });
      output.enqueue({ text: "No changes were made.", type: "status" });
    } else {
      await sandbox.git.commit(REPO_PATH, `ktb: ${cardTitle}`);

      await sandbox.git.push(REPO_PATH, {
        branch: branchName,
        password: oauthAccessToken,
        remote: "origin",
        username: "x-access-token",
      });

      await updateRun(runId, { branchName, status: "completed" });
      output.enqueue({
        text: `Done! Branch: ${branchName}`,
        type: "status",
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    await updateRun(runId, { error: message, status: "failed" });

    output.enqueue({ text: message, type: "error" });

    throw error;
  } finally {
    try {
      output.enqueue({ type: "done" });
      await output.flush();
    } finally {
      if (sandbox) await sandbox.kill();
    }
  }
}

function makeOutputAppender(runId: string) {
  const key = cardRunOutputKey(runId);
  let pending = Promise.resolve();

  function enqueue(event: RunOutputEvent) {
    pending = pending.then(async () => {
      await redis
        .pipeline()
        .rpush(key, JSON.stringify(event))
        .expire(key, OUTPUT_TTL_SECONDS)
        .exec();
    });
  }

  return {
    enqueue,
    flush: () => pending,
  };
}

async function updateRun(runId: string, values: Updateable<CardRun>) {
  await db
    .updateTable("CardRun")
    .set({ ...values, updatedAt: new Date() })
    .where("id", "=", runId)
    .execute();
}
