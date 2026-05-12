import { sandboxPublicUrl } from "./sandbox-public-url.js";

export const EDITOR_PORT = 8080;

export const EDITOR_STATUS = {
  crashed: "crashed",
  failed: "failed",
  running: "running",
  starting: "starting",
  unhealthy: "unhealthy",
} as const;

export const EDITOR_FAILURE_STATUSES = [
  EDITOR_STATUS.crashed,
  EDITOR_STATUS.failed,
  EDITOR_STATUS.unhealthy,
] as const;

export type EditorFailureStatus = (typeof EDITOR_FAILURE_STATUSES)[number];

export type EditorStatus = (typeof EDITOR_STATUS)[keyof typeof EDITOR_STATUS];

export function editorBaseUrl(sandboxId: string): string {
  return sandboxPublicUrl({ port: EDITOR_PORT, sandboxId });
}
