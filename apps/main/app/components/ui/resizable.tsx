import type { ComponentProps } from "react";

import { DotsSixVerticalIcon } from "@phosphor-icons/react";
import { Group, Panel, Separator } from "react-resizable-panels";

import { cn } from "#lib/utils.js";

function ResizableHandle({
  className,
  withHandle,
  ...props
}: ComponentProps<typeof Separator> & { withHandle?: boolean }) {
  return (
    <Separator
      className={cn(
        "bg-border focus-visible:ring-ring relative flex w-px items-center justify-center after:absolute after:inset-y-0 after:-right-1 after:-left-1 focus-visible:ring-1 focus-visible:ring-offset-1 focus-visible:outline-none data-[panel-group-orientation=vertical]:h-px data-[panel-group-orientation=vertical]:w-full data-[panel-group-orientation=vertical]:after:inset-x-0 data-[panel-group-orientation=vertical]:after:-top-1 data-[panel-group-orientation=vertical]:after:right-auto data-[panel-group-orientation=vertical]:after:-bottom-1 data-[panel-group-orientation=vertical]:after:left-auto",
        className,
      )}
      {...props}
    >
      {withHandle && (
        <div className="bg-border z-10 flex h-4 w-3 items-center justify-center rounded-sm border">
          <DotsSixVerticalIcon className="size-2.5" />
        </div>
      )}
    </Separator>
  );
}

function ResizablePanelGroup({
  className,
  ...props
}: ComponentProps<typeof Group>) {
  return (
    <Group
      className={cn(
        "flex h-full w-full data-[panel-group-orientation=vertical]:flex-col",
        className,
      )}
      {...props}
    />
  );
}

const ResizablePanel = Panel;

export { ResizableHandle, ResizablePanel, ResizablePanelGroup };
