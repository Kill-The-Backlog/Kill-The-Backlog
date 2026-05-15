import { defineMutator, defineMutators } from "@rocicorp/zero";
import { z } from "zod";

export const mutators = defineMutators({
  stub: defineMutator(z.object(), async () => {
    // no-op
  }),
});
