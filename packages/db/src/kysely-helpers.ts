import type { Expression, RawBuilder } from "kysely";

import { sql } from "kysely";

export { sql } from "kysely";

/**
 * Atomically append `value` to a jsonb array column, keeping only the newest
 * `maxItems` entries.
 *
 * Kysely has no DSL for PostgreSQL's jsonb array helpers, so keep the raw SQL
 * isolated here instead of spreading jsonb expressions across call sites.
 */
export function appendToJSONBArray<T>(
  column: Expression<T>,
  value: unknown,
  maxItems: number,
): RawBuilder<T> {
  if (maxItems < 1) {
    throw new Error("maxItems must be greater than 0");
  }

  return sql<T>`(
    select jsonb_agg(entry order by position)
    from (
      select entry, position
      from jsonb_array_elements(
        coalesce(${column}, '[]'::jsonb) || jsonb_build_array(${JSON.stringify(value)}::jsonb)
      ) with ordinality as entries(entry, position)
      order by position desc
      limit ${maxItems}
    ) kept
  )`;
}

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

/**
 * Wraps JSON values in an explicit JSONB cast so top-level arrays don't get
 * serialized by pg as Postgres arrays.
 */
export function jsonb<T>(value: T): RawBuilder<T> {
  return sql<T>`CAST(${JSON.stringify(value)} AS JSONB)`;
}
