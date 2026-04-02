import { LockIcon } from "@phosphor-icons/react";

import { Badge } from "#components/ui/badge.js";

export function PrivateBadge() {
  return (
    <Badge className="shrink-0" variant="outline">
      <LockIcon />
      Private
    </Badge>
  );
}
