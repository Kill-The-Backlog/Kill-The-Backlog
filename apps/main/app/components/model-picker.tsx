import { CaretUpDownIcon } from "@phosphor-icons/react";

import type { ModelSelectionValue } from "#lib/opencode/models.js";

import { ModelMark } from "#components/model-mark.js";
import { Button } from "#components/ui/button.js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#components/ui/dropdown-menu.js";
import {
  getModelByValue,
  MODEL_PROVIDERS,
} from "#lib/opencode/models.js";

export function ModelPicker({
  className,
  onChange,
  value,
}: {
  className?: string;
  onChange: (selection: ModelSelectionValue) => void;
  value: ModelSelectionValue;
}) {
  const selectedModel = getModelByValue(value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className={className} type="button" variant="secondary">
          <ModelMark data-icon="inline-start" model={selectedModel} />
          {selectedModel.label}
          <CaretUpDownIcon data-icon="inline-end" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto">
        <DropdownMenuRadioGroup
          onValueChange={(next) => {
            onChange(getModelByValue(next).value);
          }}
          value={selectedModel.value}
        >
          {MODEL_PROVIDERS.map((provider, index) => (
            <div key={provider.id}>
              {index > 0 ? <DropdownMenuSeparator /> : null}
              <DropdownMenuLabel>{provider.label}</DropdownMenuLabel>
              {provider.models.map((model) => (
                <DropdownMenuRadioItem
                  key={model.modelID}
                  value={`${provider.id}:${model.modelID}`}
                >
                  {model.label}
                </DropdownMenuRadioItem>
              ))}
            </div>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
