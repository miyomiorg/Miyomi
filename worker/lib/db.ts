/// <reference types="@cloudflare/workers-types" />
import { drizzle } from 'drizzle-orm/d1';
import type { D1Database } from '@cloudflare/workers-types';
import * as schema from '../db/schema.ts';

/**
 * Create a Drizzle ORM client bound to the Worker's D1 database.
 *
 * Usage inside a route handler:
 *
 *   const db = createDb(c.env.DB);
 *   const rows = await db.select().from(someTable).limit(10);
 *
 * Drizzle clients are cheap to construct; creating one per request is
 * fine and keeps the schema cache tied to the active isolate.
 */
export function createDb(db: D1Database) {
  return drizzle(db, { schema });
}
