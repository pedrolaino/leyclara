/**
 * Límites de uso pensados para un plan gratuito con cupos:
 *  - por IP y por día (la IP se guarda hasheada),
 *  - global por día para las llamadas al modelo (protege el cupo del proveedor),
 *  - "demo agotada" cuando el proveedor responde 429, hasta el día siguiente.
 * El día se corta a medianoche de Argentina.
 */
import { createHash } from "node:crypto";
import type { KV } from "./store";

const DAY = 60 * 60 * 26; // TTL con margen: la clave ya incluye la fecha

export function todayAR(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(now);
}

export function hashIp(ip: string, salt: string): string {
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 24);
}

export function clientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "local";
}

export class UsageLimiter {
  constructor(
    private kv: KV,
    private perIpDaily: number,
    private globalDaily: number,
  ) {}

  /** Cuenta una pregunta de esta IP. Devuelve false si superó el límite diario. */
  async consumeIp(ipHash: string): Promise<boolean> {
    const n = await this.kv.incr(`rl:ip:${todayAR()}:${ipHash}`, DAY);
    return n <= this.perIpDaily;
  }

  async isExhausted(): Promise<boolean> {
    return (await this.kv.get(`rl:exhausted:${todayAR()}`)) === "1";
  }

  /** Cuenta una llamada al modelo. Devuelve false si se agotó el cupo global del día. */
  async consumeModelCall(): Promise<boolean> {
    if (await this.isExhausted()) return false;
    const n = await this.kv.incr(`rl:global:${todayAR()}`, DAY);
    if (n > this.globalDaily) {
      await this.markExhausted();
      return false;
    }
    return true;
  }

  async markExhausted() {
    await this.kv.set(`rl:exhausted:${todayAR()}`, "1", DAY);
  }
}
