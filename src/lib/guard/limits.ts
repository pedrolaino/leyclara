// Daily limits per IP (stored hashed) and for model calls overall, so the free quota lasts.
// Days reset at midnight Argentina time.
import { createHash } from "node:crypto";
import type { KV } from "./store";

const DAY = 60 * 60 * 26; // keys already include the date, this is just cleanup

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

  async consumeIp(ipHash: string): Promise<boolean> {
    const n = await this.kv.incr(`rl:ip:${todayAR()}:${ipHash}`, DAY);
    return n <= this.perIpDaily;
  }

  async isExhausted(): Promise<boolean> {
    return (await this.kv.get(`rl:exhausted:${todayAR()}`)) === "1";
  }

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
