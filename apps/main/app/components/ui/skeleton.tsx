import { cn } from "#lib/utils.js";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("bg-muted animate-pulse rounded-none", className)}
      data-slot="skeleton"
      {...props}
    />
  );
}

export { Skeleton };
