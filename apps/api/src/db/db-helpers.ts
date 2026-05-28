/**
 * Typed database helpers that encapsulate dialect-specific Drizzle ORM typing.
 *
 * The root cause of `as any` usage throughout the codebase is that `DbClient`
 * is a union type (`BetterSQLite3Database | NodePgDatabase`). When TypeScript
 * resolves methods on a union, it produces a union of return types that doesn't
 * match Drizzle's expected generic parameters.
 *
 * This module contains the dialect boundary in one place. All `as any` casts
 * live here; consumers get properly typed APIs.
 */

import { eq, and, isNull, desc, asc, inArray, type SQL } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { DbClient } from './connection.js';

// ─── Internal helpers ────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTable = { $inferSelect: any; $inferInsert: any };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyColumn = { name: string; mapToDriverValue?: (v: any) => any };

function rawDb(client: DbClient): BetterSQLite3Database | NodePgDatabase {
  // Both dialects share the same select/insert/update/delete API surface.
  // The actual dialect-specific behaviour is handled by the driver underneath.
  return client.db as unknown as BetterSQLite3Database;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Execute a SELECT query on a table with optional conditions.
 *
 * @example
 * ```ts
 * const users = await dbSelect(client, usersSqlite, {
 *   where: eq(usersSqlite.id, userId),
 *   limit: 1,
 * });
 * ```
 */
export async function dbSelect<TTable extends AnyTable>(
  client: DbClient,
  table: TTable,
  options?: {
    where?: SQL;
    orderBy?: SQL;
    limit?: number;
    columns?: Record<string, boolean>;
  },
): Promise<TTable['$inferSelect'][]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (rawDb(client) as any).select(options?.columns).from(table);

  if (options?.where) {
    query = query.where(options.where);
  }
  if (options?.orderBy) {
    query = query.orderBy(options.orderBy);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  return query as Promise<TTable['$inferSelect'][]>;
}

/**
 * Execute a SELECT query returning specific columns.
 */
export async function dbSelectColumns<
  TTable extends AnyTable,
  TColumns extends Record<string, boolean>,
>(
  client: DbClient,
  table: TTable,
  columns: TColumns,
  options?: {
    where?: SQL;
    orderBy?: SQL;
    limit?: number;
  },
): Promise<Record<keyof TColumns, unknown>[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (rawDb(client) as any).select(columns).from(table);

  if (options?.where) {
    query = query.where(options.where);
  }
  if (options?.orderBy) {
    query = query.orderBy(options.orderBy);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  return query;
}

/**
 * Execute an INSERT query.
 */
export async function dbInsert<TTable extends AnyTable>(
  client: DbClient,
  table: TTable,
  values: TTable['$inferInsert'],
): Promise<void> {
  await (rawDb(client) as any).insert(table).values(values);
}

/**
 * Execute an INSERT query with RETURNING.
 */
export async function dbInsertReturning<TTable extends AnyTable>(
  client: DbClient,
  table: TTable,
  values: TTable['$inferInsert'],
): Promise<TTable['$inferSelect'][]> {
  return (rawDb(client) as any).insert(table).values(values).returning();
}

/**
 * Execute an UPDATE query.
 */
export async function dbUpdate<TTable extends AnyTable>(
  client: DbClient,
  table: TTable,
  values: Partial<TTable['$inferInsert']>,
  where: SQL,
): Promise<void> {
  await (rawDb(client) as any).update(table).set(values).where(where);
}

/**
 * Execute an UPDATE query with RETURNING.
 */
export async function dbUpdateReturning<TTable extends AnyTable>(
  client: DbClient,
  table: TTable,
  values: Partial<TTable['$inferInsert']>,
  where: SQL,
): Promise<TTable['$inferSelect'][]> {
  return (rawDb(client) as any).update(table).set(values).where(where).returning();
}

/**
 * Execute a DELETE query.
 */
export async function dbDelete<TTable extends AnyTable>(
  client: DbClient,
  table: TTable,
  where: SQL,
): Promise<void> {
  await (rawDb(client) as any).delete(table).where(where);
}

/**
 * Execute a DELETE query with RETURNING.
 */
export async function dbDeleteReturning<TTable extends AnyTable>(
  client: DbClient,
  table: TTable,
  where: SQL,
): Promise<TTable['$inferSelect'][]> {
  return (rawDb(client) as any).delete(table).where(where).returning();
}

/**
 * Upsert (INSERT ... ON CONFLICT DO UPDATE) — works for both SQLite and PG.
 */
export async function dbUpsert<TTable extends AnyTable>(
  client: DbClient,
  table: TTable,
  values: TTable['$inferInsert'],
  target: AnyColumn,
  set: Partial<TTable['$inferInsert']>,
): Promise<void> {
  await (rawDb(client) as any)
    .insert(table)
    .values(values)
    .onConflictDoUpdate({ target, set });
}

// ─── Re-export commonly used drizzle operators for convenience ────────────────
export { eq, and, isNull, desc, asc, inArray };

// ─── Dialect-aware date helper ──────────────────────────────────────────────

/**
 * Converts a Date to the correct format for the current database dialect.
 * SQLite stores dates as TEXT (ISO strings), PostgreSQL uses native TIMESTAMPTZ.
 */
export function dialectDate(client: DbClient, date: Date): string | Date {
  return client.dialect === 'sqlite' ? date.toISOString() : date;
}
