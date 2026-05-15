import type { Schema } from "@ktb/db/zero";

import { defineQueriesWithType, defineQueryWithType } from "@rocicorp/zero";

export type ZeroContext = {
  userId: number;
};

export const defineQuery = defineQueryWithType<Schema, ZeroContext>();
export const defineQueries = defineQueriesWithType<Schema>();
