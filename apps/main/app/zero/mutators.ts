import { defineMutator, defineMutators } from "@rocicorp/zero";
import { z } from "zod";

import type {} from "./context.js";

export const mutators = defineMutators({
  stub: defineMutator(z.object(), async () => {
    // no-op
  }),
});
