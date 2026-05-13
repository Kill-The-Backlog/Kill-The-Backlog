type ModelConfig = {
  label: string;
  modelID: string;
};

type ModelProviderConfig = {
  apiKeyPlaceholder: string;
  description: string;
  id: string;
  label: string;
  models: readonly ModelConfig[];
};

// Static registry of opencode-routable models the user can choose from.
// Keep this aligned with the providers configured inside the E2B template's
// opencode runtime — these IDs are what opencode passes through to the
// underlying provider, so they have to match the provider's wire format
// (Anthropic uses dashes, e.g. `claude-opus-4-7`).
export const MODEL_PROVIDERS = [
  {
    apiKeyPlaceholder: "sk-ant-...",
    description: "Claude models for broad coding work and deep reasoning.",
    id: "anthropic",
    label: "Anthropic",
    models: [
      {
        label: "Claude Opus 4.7",
        modelID: "claude-opus-4-7",
      },
      {
        label: "Claude Sonnet 4.6",
        modelID: "claude-sonnet-4-6",
      },
      {
        label: "Claude Haiku 4.5",
        modelID: "claude-haiku-4-5",
      },
    ],
  },
  {
    apiKeyPlaceholder: "sk-...",
    description: "GPT and Codex models for OpenAI-powered sessions.",
    id: "openai",
    label: "OpenAI",
    models: [
      {
        label: "GPT-5.5",
        modelID: "gpt-5.5",
      },
    ],
  },
] as const satisfies readonly ModelProviderConfig[];

export type ProviderId = ModelProvider["id"];

type ModelProvider = (typeof MODEL_PROVIDERS)[number];

export const PROVIDER_IDS = MODEL_PROVIDERS.map((provider) => provider.id);

export type ModelSelectionValue = {
  [Provider in ModelProvider as Provider["id"]]: `${Provider["id"]}:${Provider["models"][number]["modelID"]}`;
}[ProviderId];

export const MODELS = MODEL_PROVIDERS.flatMap((provider) =>
  provider.models.map((model) => ({
    ...model,
    providerID: provider.id,
    providerLabel: provider.label,
    value: `${provider.id}:${model.modelID}`,
  })),
) as readonly ModelEntry[];

export type ModelEntry = {
  label: string;
  modelID: string;
  providerID: ProviderId;
  providerLabel: string;
  value: ModelSelectionValue;
};

export const MODEL_SELECTION_VALUES = MODELS.map((model) => model.value) as [
  ModelSelectionValue,
  ...ModelSelectionValue[],
];

export function findModelByValue(value: string): ModelEntry | null {
  return MODELS.find((model) => model.value === value) ?? null;
}

export function findProvider(provider: ProviderId) {
  return MODEL_PROVIDERS.find((entry) => entry.id === provider) ?? null;
}

export function getModelByValue(value: string): ModelEntry {
  const model = findModelByValue(value);
  if (!model) {
    throw new Error(`Unknown model selection: ${value}`);
  }
  return model;
}

export function getProvider(provider: ProviderId) {
  const config = findProvider(provider);
  if (!config) {
    throw new Error(`Unknown model provider: ${provider}`);
  }
  return config;
}
