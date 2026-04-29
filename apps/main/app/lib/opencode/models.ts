// Static registry of opencode-routable models the user can choose from.
// Keep this aligned with the providers configured inside the E2B template's
// opencode runtime — these IDs are what opencode passes through to the
// underlying provider, so they have to match the provider's wire format
// (Anthropic uses dashes, e.g. `claude-opus-4-7`).
export const MODELS = [
  {
    id: "claude-opus-4-7",
    label: "Claude Opus 4.7",
    providerID: "anthropic",
  },
  {
    id: "claude-sonnet-4-6",
    label: "Claude Sonnet 4.6",
    providerID: "anthropic",
  },
  {
    id: "claude-haiku-4-5",
    label: "Claude Haiku 4.5",
    providerID: "anthropic",
  },
] as const;

export type ModelId = (typeof MODELS)[number]["id"];

export const MODEL_IDS = MODELS.map((model) => model.id);

// Narrows a raw `string` (e.g. a value read from the `Session.model` DB
// column) to a `ModelId`. The DB column is just `String`, but every write
// path validates against `MODEL_IDS`, so an unknown value here means the
// row was written through a path that bypassed validation — surface that
// loudly rather than silently dispatching to opencode with a bogus id.
export function assertModelId(value: string): ModelId {
  if (!MODELS.some((model) => model.id === value)) {
    throw new Error(`Invalid model id: ${value}`);
  }
  return value as ModelId;
}

// Resolves a `ModelId` into the `{ providerID, modelID }` shape opencode's
// SDK expects for `session.promptAsync`. The lookup can't fail at runtime
// because `ModelId` is constrained to ids that exist in `MODELS`.
export function resolveModel(id: ModelId): {
  modelID: string;
  providerID: string;
} {
  const model = MODELS.find((entry) => entry.id === id);
  if (!model) {
    throw new Error(`Unknown model id: ${id}`);
  }
  return { modelID: model.id, providerID: model.providerID };
}
