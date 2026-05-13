import type { ComponentType, SVGProps } from "react";

import type { ModelEntry, ProviderId } from "#lib/opencode/models.js";

import ClaudeMark from "#assets/claude-mark.svg?react";
import OpenAIMark from "#assets/openai-mark.svg?react";

const PROVIDER_MARKS = {
  anthropic: ClaudeMark,
  openai: OpenAIMark,
} satisfies Record<ProviderId, ComponentType<SVGProps<SVGSVGElement>>>;

export function ModelMark({
  model,
  ...props
}: SVGProps<SVGSVGElement> & {
  model: null | Pick<ModelEntry, "providerID">;
}) {
  if (!model) return null;

  return <ModelProviderMark providerID={model.providerID} {...props} />;
}

export function ModelProviderMark({
  providerID,
  ...props
}: SVGProps<SVGSVGElement> & {
  providerID: ProviderId;
}) {
  const ProviderMark = PROVIDER_MARKS[providerID];

  return <ProviderMark {...props} />;
}
