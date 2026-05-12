import { sandboxPublicUrl } from "#lib/sandbox-public-url.js";

export const OPENCODE_PORT = 4096;

export function opencodeBaseUrl(sandboxId: string): string {
  return sandboxPublicUrl({ port: OPENCODE_PORT, sandboxId });
}
