import { z } from "zod";

import { sandboxPublicUrl } from "./sandbox-public-url.js";

export const PREVIEW_PORT = 5173;
export const PREVIEW_SCRIPT_PATH = ".kill-the-backlog/preview.sh";

export const PREVIEW_STATUS = {
  crashed: "crashed",
  failed: "failed",
  notConfigured: "not_configured",
  restarting: "restarting",
  running: "running",
  starting: "starting",
  unhealthy: "unhealthy",
} as const;

export const PREVIEW_FAILURE_STATUSES = [
  PREVIEW_STATUS.crashed,
  PREVIEW_STATUS.failed,
  PREVIEW_STATUS.unhealthy,
] as const;

export type PreviewFailureStatus = (typeof PREVIEW_FAILURE_STATUSES)[number];

export const previewLogEntrySchema = z.object({
  at: z.string(),
  stream: z.enum(["stderr", "stdout", "system"]),
  text: z.string(),
});

export const previewLogsSchema = z.array(previewLogEntrySchema);

export type PreviewLogEntry = z.infer<typeof previewLogEntrySchema>;

export type PreviewStatus =
  (typeof PREVIEW_STATUS)[keyof typeof PREVIEW_STATUS];

export function previewBaseUrl(sandboxId: string): string {
  return sandboxPublicUrl({ port: PREVIEW_PORT, sandboxId });
}
