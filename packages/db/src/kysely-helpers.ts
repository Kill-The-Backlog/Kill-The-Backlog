import type { Expression, RawBuilder } from "kysely";

import { sql } from "kysely";

/**
 * Atomically append `value` to a top-level text field of a jsonb column.
 *
 * Equivalent to: `data = data || { [field]: (data ->> field ?? '') + value }`.
 *
 * Doing this in a single statement lets concurrent writers append to the same
 * row without read-modify-write races.
 */
export function appendToJSONBField<T>(
  column: Expression<T>,
  field: string,
  value: string,
): RawBuilder<T> {
  return sql<T>`jsonb_set(${column}, array[${field}], to_jsonb(coalesce(${column} ->> ${field}, '') || ${value}))`;
}
