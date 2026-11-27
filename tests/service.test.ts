import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MockChat } from "@/lib/ai/mock";
import { type ChatProvider, QuotaExceededError } from "@/lib/ai/types";
import { cacheKey, handleAsk, MESSAGES, setServices, warmCache } from "@/lib/assistant/service";
import { getEnv } from "@/lib/env";
import { UsageLimiter } from "@/lib/guard/limits";
import { MemoryKV } from "@/lib/guard/store";

const headers = (ip = "1.2.3.4") => new Headers({ "x-forwarded-for": ip });

function setup(chat: ChatProvider = new MockChat(), limits: { perIp?: number; global?: number } = {}) {
  const env = getEnv({ LLM_PROVIDER: "mock", EMBEDDING_PROVIDER: "none" } as unknown as NodeJS.ProcessEnv);
  const kv = new MemoryKV();
  setServices({ env, kv, chat, limiter: new UsageLimiter(kv, limits.perIp ?? 3, limits.global ?? 100) });
  return { kv };
}

describe("handleAsk", () => {
  beforeEach(() => setup());
  afterEach(() => vi.useRealTimers());

  it("checks min and max length", async () => {
    expect((await handleAsk({ question: "" }, headers())).status).toBe(400);
    expect((await handleAsk({ question: "hola" }, headers())).body).toMatchObject({ message: MESSAGES.tooShort });
    const long = "a".repeat(301);
    expect((await handleAsk({ question: long }, headers())).body).toMatchObject({ message: MESSAGES.tooLong(300) });
  });

  it("caches answers so repeats do not use quota", async () => {
    const q = { question: "¿Cuál es la velocidad máxima en una autopista?" };
    const first = await handleAsk(q, headers());
    expect(first.body.kind).toBe("answer");
    for (let i = 0; i < 5; i++) {
      const again = await handleAsk(q, headers());
      expect(again.status).toBe(200);
      if (again.body.kind === "answer") expect(again.body.meta.cached).toBe(true);
    }
  });

  it("caches only answers, a decline may come from a search that was down", async () => {
    const declines: ChatProvider = { name: "fake", model: "x", generateJson: async () => ({ status: "not_found", answer: "", citations: [], follow_ups: [] }) };
    const { kv } = setup(declines);
    for (const question of ["¿Quién ganó el último mundial de fútbol?", "¿Cuántos días de vacaciones me corresponden?"]) {
      const r = await handleAsk({ question }, headers());
      expect(["off_topic", "not_found"]).toContain(r.body.kind);
      expect(await kv.get(cacheKey(question, undefined, declines))).toBeNull();
    }
  });

  it("ignores declines cached by older versions", async () => {
    const chat = new MockChat();
    const { kv } = setup(chat);
    const question = "¿Cuál es la velocidad máxima en una autopista?";
    await kv.set(cacheKey(question, undefined, chat), JSON.stringify({ kind: "not_found", message: "x", meta: {} }), 60);
    expect((await handleAsk({ question }, headers())).body.kind).toBe("answer");
  });

  it("warms the cache with the frequent questions, once", async () => {
    let calls = 0;
    const chat: ChatProvider = {
      name: "fake",
      model: "x",
      async generateJson(req) {
        calls++;
        return new MockChat().generateJson(req);
      },
    };
    setup(chat);
    const questions = ["¿Cuántos días de vacaciones me corresponden?", "¿Cuál es la velocidad máxima en autopista?"];
    expect(await warmCache(questions)).toEqual({ added: 2, skipped: 0 });
    expect(calls).toBe(2);
    expect(await warmCache(questions)).toEqual({ added: 0, skipped: 2 });
    expect(calls).toBe(2);

    const r = await handleAsk({ question: questions[1] }, headers());
    expect(r.body.kind === "answer" && r.body.meta.cached).toBe(true);
  });

  it("answers that keep being asked don't expire", async () => {
    vi.useFakeTimers();
    const question = "¿Cuál es la velocidad máxima en autopista?";
    await handleAsk({ question }, headers());
    for (let day = 0; day < 4; day++) {
      vi.advanceTimersByTime(60 * 24 * 3600 * 1000);
      const r = await handleAsk({ question }, headers());
      expect(r.body.kind === "answer" && r.body.meta.cached).toBe(true);
    }
  });

  it("a different prompt gives a different cache key", () => {
    const chat = new MockChat();
    expect(cacheKey("hola qué tal", undefined, chat, "prompt A")).not.toBe(cacheKey("hola qué tal", undefined, chat, "prompt B"));
  });

  it("daily limit per IP", async () => {
    const qs = ["¿Qué documentos tengo que llevar para manejar?", "¿Puedo manejar si tomé una cerveza?", "¿Cuánto dura el período de prueba?", "¿Cuándo me tienen que pagar el aguinaldo?"];
    const statuses = [];
    for (const question of qs) statuses.push((await handleAsk({ question }, headers("9.9.9.9"))).status);
    expect(statuses).toEqual([200, 200, 200, 429]);
    expect((await handleAsk({ question: qs[3] }, headers("8.8.8.8"))).status).toBe(200);
  });

  it("shows the quota message on a provider 429 and stops calling it", async () => {
    let calls = 0;
    const chat: ChatProvider = {
      name: "fake",
      model: "x",
      async generateJson() {
        calls++;
        throw new QuotaExceededError();
      },
    };
    setup(chat, { perIp: 50 });
    const r1 = await handleAsk({ question: "¿Cuántos días de vacaciones me corresponden?" }, headers());
    expect(r1).toMatchObject({ status: 429, body: { kind: "limit", message: MESSAGES.exhausted } });
    const r2 = await handleAsk({ question: "¿Cuánto dura el período de prueba?" }, headers());
    expect(r2.status).toBe(429);
    expect(calls).toBe(1);
  });

  it("global daily cap on model calls", async () => {
    const chat: ChatProvider = {
      name: "fake",
      model: "x",
      async generateJson() {
        return { status: "answered", answer: "Respuesta.", citations: [], follow_ups: [] };
      },
    };
    setup(chat, { perIp: 50, global: 1 });
    await handleAsk({ question: "¿Cuántos días de vacaciones me corresponden?" }, headers());
    const r = await handleAsk({ question: "¿Cuánto dura el período de prueba?" }, headers());
    expect(r.body).toMatchObject({ kind: "limit" });
  });

  it("rejections without a model call do not use the global quota", async () => {
    setup(new MockChat(), { perIp: 50, global: 0 });
    const r = await handleAsk({ question: "¿Quién ganó el mundial de fútbol?" }, headers());
    expect(r.body.kind).toBe("off_topic");
  });
});
