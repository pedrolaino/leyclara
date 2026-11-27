// Memory is enough for dev and tests. In production every instance shares the Postgres table.
import type { Sql } from "@/lib/db/client";
export interface KV {
  get(key: string): Promise<string | null>;
  // Reads a live entry and pushes its expiry forward, so entries in use don't expire.
  getAndExtend(key: string, ttlSeconds: number): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  incr(key: string, ttlSeconds: number): Promise<number>;
}

export class MemoryKV implements KV {
  private data = new Map<string, { value: string; expires: number }>();
  constructor(private maxEntries = 2000) {}

  private live(key: string) {
    const e = this.data.get(key);
    if (e && e.expires < Date.now()) {
      this.data.delete(key);
      return undefined;
    }
    return e;
  }

  async get(key: string) {
    return this.live(key)?.value ?? null;
  }

  async getAndExtend(key: string, ttlSeconds: number) {
    const e = this.live(key);
    if (!e) return null;
    e.expires = Date.now() + ttlSeconds * 1000;
    return e.value;
  }

  async set(key: string, value: string, ttlSeconds: number) {
    if (this.data.size >= this.maxEntries) this.data.delete(this.data.keys().next().value!);
    this.data.set(key, { value, expires: Date.now() + ttlSeconds * 1000 });
  }

  async incr(key: string, ttlSeconds: number) {
    const e = this.live(key);
    const next = Number(e?.value ?? 0) + 1;
    this.data.set(key, { value: String(next), expires: e?.expires ?? Date.now() + ttlSeconds * 1000 });
    return next;
  }
}

export class PostgresKV implements KV {
  constructor(private sql: Sql) {}

  async get(key: string) {
    const [row] = await this.sql<{ value: string }[]>`
      SELECT value FROM kv WHERE key = ${key} AND expires_at > now()`;
    return row?.value ?? null;
  }

  async getAndExtend(key: string, ttlSeconds: number) {
    const [row] = await this.sql<{ value: string }[]>`
      UPDATE kv SET expires_at = now() + make_interval(secs => ${ttlSeconds})
      WHERE key = ${key} AND expires_at > now()
      RETURNING value`;
    return row?.value ?? null;
  }

  async set(key: string, value: string, ttlSeconds: number) {
    await this.sql`
      INSERT INTO kv (key, value, expires_at) VALUES (${key}, ${value}, now() + make_interval(secs => ${ttlSeconds}))
      ON CONFLICT (key) DO UPDATE SET value = excluded.value, expires_at = excluded.expires_at`;
    // Expired rows are cleaned up a few at a time on writes.
    await this.sql`DELETE FROM kv WHERE key IN (SELECT key FROM kv WHERE expires_at < now() LIMIT 50)`;
  }

  async incr(key: string, ttlSeconds: number) {
    const [row] = await this.sql<{ value: string }[]>`
      INSERT INTO kv (key, value, expires_at) VALUES (${key}, '1', now() + make_interval(secs => ${ttlSeconds}))
      ON CONFLICT (key) DO UPDATE SET
        value = CASE WHEN kv.expires_at > now() THEN (kv.value::int + 1)::text ELSE '1' END,
        expires_at = CASE WHEN kv.expires_at > now() THEN kv.expires_at ELSE excluded.expires_at END
      RETURNING value`;
    return Number(row.value);
  }
}
