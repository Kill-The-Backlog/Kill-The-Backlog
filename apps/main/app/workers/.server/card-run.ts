import type { Updateable } from "@ktb/db/kysely-types";
import type { CardRun } from "@ktb/db/types";
import type { Job } from "bullmq";

import { Sandbox } from "e2b";
import { quote } from "shell-quote";

import { db } from "#lib/.server/clients/db.js";
import { redis } from "#lib/.server/clients/redis.js";
import { serverEnv } from "#lib/.server/env/server.js";
import { defineWorker } from "#lib/.server/workers/define-worker.js";

export type CardRunJobData = {
  repoId: number;
  runId: string;
  userId: number;
};

export const CARD_RUN_DONE_SENTINEL = "\n[ktb:done]";

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
  const appendOutput = makeOutputAppender(runId);

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

    await appendOutput("[ktb] Cloning repository...\n");

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

    await appendOutput("[ktb] Creating branch...\n");

    await sandbox.git.createBranch(REPO_PATH, branchName);

    await appendOutput("[ktb] Running Claude Code...\n");

    const prompt = `${cardTitle}\n\nAfter making changes, do NOT commit.`;

    await sandbox.commands.run(
      quote([
        "claude",
        "--dangerously-skip-permissions",
        "--output-format",
        "text",
        "-p",
        prompt,
      ]),
      {
        cwd: REPO_PATH,
        onStderr: (data) => void appendOutput(data),
        onStdout: (data) => void appendOutput(data),
      },
    );

    await appendOutput("\n[ktb] Committing and pushing...\n");

    await sandbox.git.add(REPO_PATH, { all: true });

    const status = await sandbox.git.status(REPO_PATH);
    if (status.isClean) {
      await updateRun(runId, { status: "completed" });
      await appendOutput("\n[ktb] No changes were made.\n");
    } else {
      await sandbox.git.commit(REPO_PATH, `ktb: ${cardTitle}`);

      await sandbox.git.push(REPO_PATH, {
        branch: branchName,
        password: oauthAccessToken,
        remote: "origin",
        username: "x-access-token",
      });

      await updateRun(runId, { branchName, status: "completed" });
      await appendOutput(`\n[ktb] Done! Branch: ${branchName}\n`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    await updateRun(runId, { error: message, status: "failed" });

    await appendOutput(`\n[ktb] Error: ${message}\n`);

    throw error;
  } finally {
    await appendOutput(CARD_RUN_DONE_SENTINEL);
    if (sandbox) await sandbox.kill();
  }
}

function makeOutputAppender(runId: string) {
  const key = cardRunOutputKey(runId);
  return (data: string) =>
    redis.pipeline().rpush(key, data).expire(key, OUTPUT_TTL_SECONDS).exec();
}

async function updateRun(runId: string, values: Updateable<CardRun>) {
  await db
    .updateTable("CardRun")
    .set({ ...values, updatedAt: new Date() })
    .where("id", "=", runId)
    .execute();
}
