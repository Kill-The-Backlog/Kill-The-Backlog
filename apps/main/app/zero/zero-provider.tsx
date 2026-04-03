import { schema } from "@ktb/db/zero";
import { ZeroProvider as BaseZeroProvider } from "@rocicorp/zero/react";
import { useMemo } from "react";

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
  const context = useMemo(() => ({ userId }), [userId]);

  return (
    <BaseZeroProvider
      cacheURL={cacheURL}
      context={context}
      mutators={mutators}
      schema={schema}
      userID={String(userId)}
    >
      {children}
    </BaseZeroProvider>
  );
}
