import { CaretUpDownIcon, StarFourIcon } from "@phosphor-icons/react";

import type { ModelId } from "#lib/opencode/models.js";

import { Button } from "#components/ui/button.js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "#components/ui/dropdown-menu.js";
import { MODELS } from "#lib/opencode/models.js";

export function ModelPicker({
  className,
  onChange,
  value,
}: {
  className?: string;
  onChange: (id: ModelId) => void;
  value: ModelId;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className={className} type="button" variant="secondary">
          <StarFourIcon data-icon="inline-start" />
          {MODELS.find((model) => model.id === value)?.label}
          <CaretUpDownIcon data-icon="inline-end" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto">
        <DropdownMenuRadioGroup
          onValueChange={(next) => {
            onChange(next as ModelId);
          }}
          value={value}
        >
          {MODELS.map((model) => (
            <DropdownMenuRadioItem key={model.id} value={model.id}>
              {model.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
