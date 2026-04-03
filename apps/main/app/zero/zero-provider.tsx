import { schema } from "@ktb/db/zero";
import { ZeroProvider as BaseZeroProvider } from "@rocicorp/zero/react";

import { mutators } from "./mutators.js";

export function ZeroProvider({
  cacheURL,
  children,
  userId,
}: {
  cacheURL: string;
  children: React.ReactNode;
  userId: number;
}) {
  return (
    <BaseZeroProvider
      cacheURL={cacheURL}
      context={{ userId }}
      mutators={mutators}
      schema={schema}
      userID={String(userId)}
    >
      {children}
    </BaseZeroProvider>
  );
}
