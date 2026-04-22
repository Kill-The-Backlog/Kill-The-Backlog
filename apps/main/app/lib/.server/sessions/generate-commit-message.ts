import { anthropic } from "#lib/.server/clients/anthropic.js";

// Claude Haiku 4.5 — same model as session titling. Commit-message generation
// is a one-shot, low-stakes task; we explicitly avoid sending the diff itself
// so input stays small (~150 tokens per turn regardless of change size).
const MODEL = "claude-haiku-4-5-20251001";

const SYSTEM_PROMPT = [
  "You write one-line git commit subjects for automated sessions.",
  "Rules:",
  "- 50 to 72 characters.",
  "- Imperative mood (Add, Fix, Refactor, Remove).",
  "- Capitalize the first word; no trailing period.",
  "- No quotes, no emoji, no conventional-commit prefix.",
  "- Summarize the change, not the speaker.",
  "- Output only the subject, nothing else.",
].join("\n");

// `files` lists the paths + status (added/modified/deleted/renamed) of the
// staged changes for this turn. We deliberately do NOT pass patch content —
// the user's prompt plus the file list carries enough intent for a good
// subject line, and sending diffs would balloon token cost without a matching
// quality win.
export type CommitFileSummary = {
  path: string;
  status: string;
};

export async function generateCommitMessage({
  files,
  userPrompt,
}: {
  files: CommitFileSummary[];
  userPrompt: string;
}): Promise<string> {
  const fileList = files
    .map((f) => `- ${f.status}: ${f.path}`)
    .join("\n");

  const userContent = [
    "User prompt for this turn:",
    userPrompt,
    "",
    "Files changed:",
    fileList,
  ].join("\n");

  const message = await anthropic.messages.create({
    max_tokens: 64,
    messages: [{ content: userContent, role: "user" }],
    model: MODEL,
    system: SYSTEM_PROMPT,
  });

  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock) {
    throw new Error("Anthropic response contained no text block");
  }

  return textBlock.text.trim();
}
