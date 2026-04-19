export const OPENCODE_PORT = 4096;

// E2B's public URL scheme is `<port>-<sandboxId>.e2b.app` (matches the E2B
// SDK's default domain). We build URLs from just the sandbox id so workers
// that only need to send HTTP traffic don't have to hold a live Sandbox
// instance — the edge proxy routes to the VM and auto-resumes it when the
// sandbox was created with `autoResume: true`.
const E2B_DOMAIN = "e2b.app";

export function opencodeBaseUrl(sandboxId: string): string {
  return `https://${OPENCODE_PORT}-${sandboxId}.${E2B_DOMAIN}`;
}
