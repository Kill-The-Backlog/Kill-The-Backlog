import { startTransition } from "react";
import { hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";

import { NonceProvider } from "#hooks/use-nonce.js";

startTransition(() => {
  hydrateRoot(
    document,
    /* Empty nonce on the client - CSP nonces are only evaluated during
    initial HTML parsing, not after hydration. */
    <NonceProvider value="">
      <HydratedRouter />
    </NonceProvider>,
  );
});
