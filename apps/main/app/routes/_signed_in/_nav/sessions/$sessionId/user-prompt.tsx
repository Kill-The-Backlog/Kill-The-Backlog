import type { Part } from "@opencode-ai/sdk/v2";

import invariant from "tiny-invariant";

import { Avatar, AvatarFallback, AvatarImage } from "#components/ui/avatar.js";
import { getInitials } from "#lib/utils/get-initials.js";
import { useRootLoaderData } from "#root.js";

import type { MessageRow } from "./timeline.js";

export function UserPrompt({ message }: { message: MessageRow }) {
  const { user } = useRootLoaderData();
  invariant(user, "User is required");

  const text = message.parts
    .map((row) => {
      const part = row.data as Part;
      return part.type === "text" ? part.text : "";
    })
    .join("");

  if (!text) return null;

  return (
    <div className="ml-auto flex max-w-[85%] items-start gap-2">
      <div className="bg-muted rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap">
        {text}
      </div>
      <Avatar size="sm" className="shrink-0">
        <AvatarImage alt={user.displayName} src={user.avatarUrl ?? undefined} />
        <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
      </Avatar>
    </div>
  );
}
