import type { ClassValue } from "clsx";

import { clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["2xs"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getInitials(name: string): string {
  const [first, ...rest] = name.split(" ").filter(Boolean);
  return ((first?.[0] ?? "") + (rest.at(-1)?.[0] ?? "")).toUpperCase();
}
