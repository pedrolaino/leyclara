// Handles one question: validation, captcha, cache, limits, pipeline. No Next.js here so it's easy to test.
import { createHash } from "node:crypto";
import { createChatProvider, createEmbeddingProvider } from "@/lib/ai";
import { type ChatProvider, QuotaExceededError } from "@/lib/ai/types";
import { getEnv, type Env } from "@/lib/env";
import { clientIp, hashIp, UsageLimiter } from "@/lib/guard/limits";
import { type KV, MemoryKV, PostgresKV } from "@/lib/guard/store";
import { getSql } from "@/lib/db/client";
import { createVectorSearch, type VectorSearch } from "@/lib/retrieval/vector";
import { verifyTurnstile } from "@/lib/guard/turnstile";
import { getCorpus } from "@/lib/retrieval/corpus";
import { normalize } from "@/lib/retrieval/text";
import { answerQuestion } from "./answer";
import type { ApiError, AskResult } from "./types";

const CACHE_TTL = 60 * 60 * 24 * 7;

export const MESSAGES = {
  empty: "Escribí tu pregunta.",
  tooShort: "Contame un poco más para poder buscar en las leyes.",
  tooLong: (max: number) => `La pregunta es muy larga: el máximo es de ${max} caracteres.`,
  captcha: "No pudimos verificar que seas una persona. Recargá la página y probá de nuevo.",
  ipLimit:
    "Llegaste al máximo de preguntas por hoy. Mañana podés seguir. Las preguntas de ejemplo siguen funcionando.",
  exhausted:
    "Se terminó el cupo diario de consultas al modelo de IA. Volvé mañana. Las preguntas de ejemplo siguen funcionando.",
  error: "No se pudo generar la respuesta. Probá de nuevo en un rato.",
};

interface Services {
  env: Env;
  kv: KV;
  chat: ChatProvider;
  limiter: UsageLimiter;
  vectorSearch?: VectorSearch | null;
}

let services: Services | null = null;

export function getServices(): Services {
  if (services) return services;
  const env = getEnv();
  const sql = getSql(env.databaseUrl);
  if (!sql) console.warn("[db] DATABASE_URL not set: cache and limits live in memory and search is lexical only");
  const kv = sql ? new PostgresKV(sql) : new MemoryKV();
  const embedder = createEmbeddingProvider(env);
  services = {
    env,
    kv,
    chat: createChatProvider(env),
    limiter: new UsageLimiter(kv, env.limits.perIpDaily, env.limits.globalDaily),
    vectorSearch: sql && embedder ? createVectorSearch(sql, embedder) : null,
  };
  return services;
}

export function setServices(s: Services | null) {
  services = s;
}

export interface AskInput {
  question?: unknown;
  context?: unknown;
  captchaToken?: unknown;
}

export type AskResponse = { status: number; body: AskResult | ApiError };

export function cacheKey(question: string, context: string | undefined, chat: ChatProvider): string {
  const raw = [normalize(question), normalize(context ?? ""), chat.name, chat.model, getCorpus().hash].join("|");
  return `cache:${createHash("sha256").update(raw).digest("hex").slice(0, 32)}`;
}

export async function handleAsk(input: AskInput, headers: Headers): Promise<AskResponse> {
  const { env, kv, chat, limiter, vectorSearch } = getServices();
  const { maxQuestionChars, minQuestionChars } = env.limits;

  const question = typeof input.question === "string" ? input.question.replace(/\s+/g, " ").trim() : "";
  if (!question) return err(400, MESSAGES.empty);
  if (question.length > maxQuestionChars) return err(400, MESSAGES.tooLong(maxQuestionChars));
  if (question.length < minQuestionChars) return err(400, MESSAGES.tooShort);
  const context =
    typeof input.context === "string" && input.context.trim()
      ? input.context.replace(/\s+/g, " ").trim().slice(0, maxQuestionChars)
      : undefined;

  const ip = clientIp(headers);
  if (!(await verifyTurnstile(env.turnstileSecret, input.captchaToken, ip))) return err(403, MESSAGES.captcha);

  // Repeated questions, like the examples, don't use quota.
  const key = cacheKey(question, context, chat);
  const hit = await kv.get(key).catch(() => null);
  if (hit) {
    const cached = JSON.parse(hit) as AskResult;
    return { status: 200, body: { ...cached, meta: { ...cached.meta, cached: true } } };
  }

  if (!(await limiter.consumeIp(hashIp(ip, env.ipSalt)))) return { status: 429, body: { kind: "limit", message: MESSAGES.ipLimit } };
  if (await limiter.isExhausted()) return { status: 429, body: { kind: "limit", message: MESSAGES.exhausted } };

  // The global quota only counts real model calls.
  const meteredChat: ChatProvider = {
    name: chat.name,
    model: chat.model,
    async generateJson(req) {
      if (chat.name !== "mock" && !(await limiter.consumeModelCall())) throw new QuotaExceededError();
      return chat.generateJson(req);
    },
  };

  let result: AskResult;
  try {
    result = await answerQuestion(
      question,
      {
        chat: meteredChat,
        vectorSearch,
        maxAnswerChars: env.limits.maxAnswerChars,
        maxOutputTokens: env.limits.maxOutputTokens,
      },
      context,
    );
  } catch (e) {
    if (e instanceof QuotaExceededError) {
      await limiter.markExhausted();
      return { status: 429, body: { kind: "limit", message: MESSAGES.exhausted } };
    }
    console.error("[ask] error", e);
    return err(502, MESSAGES.error);
  }

  await kv.set(key, JSON.stringify(result), CACHE_TTL).catch(() => undefined);
  return { status: 200, body: result };
}

const err = (status: number, message: string): AskResponse => ({ status, body: { kind: "error", message } });
