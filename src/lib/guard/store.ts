/**
 * Almacenamiento clave-valor para límites de uso y caché.
 *  - En memoria: alcanza para desarrollo y un solo servidor.
 *  - Upstash Redis (REST, plan gratis): compartido entre instancias serverless.
 */
export interface KV {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  /** Incrementa y devuelve el nuevo valor; fija el TTL en el primer incremento. */
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

export class UpstashKV implements KV {
  constructor(
    private url: string,
    private token: string,
  ) {}

  private async pipeline(commands: (string | number)[][]): Promise<{ result: unknown }[]> {
    const res = await fetch(`${this.url.replace(/\/$/, "")}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(commands),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`Upstash HTTP ${res.status}`);
    return res.json();
  }

  async get(key: string) {
    const [r] = await this.pipeline([["GET", key]]);
    return (r.result as string | null) ?? null;
  }

  async set(key: string, value: string, ttlSeconds: number) {
    await this.pipeline([["SET", key, value, "EX", ttlSeconds]]);
  }

  async incr(key: string, ttlSeconds: number) {
    const [r] = await this.pipeline([["INCR", key], ["EXPIRE", key, ttlSeconds, "NX"]]);
    return Number(r.result);
  }
}
