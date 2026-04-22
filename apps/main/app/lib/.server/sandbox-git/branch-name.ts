// A session's feature branch is deterministic in its ID, so we don't persist
// it on the Session row — callers derive it on demand. Session IDs are UUIDs,
// which are always valid git ref components.
export function branchNameForSession(sessionId: string): string {
  return `ktb/${sessionId}`;
}
