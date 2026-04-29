import type { UserPreferencesPatch } from "#routes/_signed_in/api/user-preferences/_route.js";

// Fire-and-forget: pref writes are best-effort — a dropped write only affects
// "what's the default next time", never the user's actual selection in the
// moment.
export function submitPrefs(patch: UserPreferencesPatch) {
  void fetch("/api/user-preferences", {
    body: JSON.stringify(patch),
    headers: { "Content-Type": "application/json" },
    method: "PATCH",
  });
}
