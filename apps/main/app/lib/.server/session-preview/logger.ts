import type { Job } from "bullmq";

import { appendToJSONBArray } from "@ktb/db/kysely-helpers";

import type { PreviewLogEntry } from "#lib/session-preview.js";

import { db } from "#lib/.server/clients/db.js";

const MAX_PREVIEW_LOGS = 200;

export type PreviewLogger = {
  flush: () => Promise<void>;
  output: (stream: PreviewOutputStream, text: string) => void;
  system: (text: string) => Promise<void>;
};

type PreviewOutputStream = Exclude<PreviewLogEntry["stream"], "system">;

export function createPreviewLogger({
  job,
  sessionId,
}: {
  job: Job;
  sessionId: string;
}): PreviewLogger {
  let previewLogWrite = Promise.resolve();

  const enqueuePreviewLog = (entry: Omit<PreviewLogEntry, "at">) => {
    previewLogWrite = previewLogWrite.then(() =>
      appendPreviewLog(sessionId, entry),
    );
    return previewLogWrite;
  };

  return {
    flush: () => previewLogWrite,
    output: (stream, text) => {
      void enqueuePreviewLog({ stream, text });
      void job.log(`[preview:${stream}] ${text}`);
    },
    system: async (text) => {
      await enqueuePreviewLog({ stream: "system", text });
      await job.log(`[preview:system] ${text}`);
    },
  };
}

async function appendPreviewLog(
  sessionId: string,
  entry: Omit<PreviewLogEntry, "at">,
): Promise<void> {
  const now = new Date();

  await db
    .updateTable("Session")
    .set((eb) => ({
      previewLogs: appendToJSONBArray(
        eb.ref("previewLogs"),
        {
          ...entry,
          at: now.toISOString(),
        },
        MAX_PREVIEW_LOGS,
      ),
      updatedAt: now,
    }))
    .where("id", "=", sessionId)
    .execute();
}
