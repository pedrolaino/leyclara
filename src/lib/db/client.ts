import { readFileSync } from "node:fs";
import path from "node:path";
import postgres from "postgres";

export type Sql = postgres.Sql;

let shared: Sql | null | undefined;

// Same code for a local Postgres and Neon, only DATABASE_URL changes.
export function getSql(url = process.env.DATABASE_URL): Sql | null {
  if (shared !== undefined) return shared;
  // prepare: false because Neon's pooled endpoint runs PgBouncer.
  shared = url ? postgres(url, { max: 5, idle_timeout: 20, prepare: false, onnotice: () => {} }) : null;
  return shared;
}

export function connect(url: string): Sql {
  return postgres(url, { max: 5, prepare: false, onnotice: () => {} });
}

export async function migrate(sql: Sql) {
  const schema = readFileSync(path.join(process.cwd(), "db", "schema.sql"), "utf8");
  await sql.unsafe(schema);
}
