/**
 * Orquestación de una consulta, independiente de Next.js (se testea sin servidor):
 * validación → captcha → caché → límites → pipeline → caché.
 */
import { createHash } from "node:crypto";
import { createChatProvider, createEmbeddingProvider } from "@/lib/ai";
import { type ChatProvider, QuotaExceededError } from "@/lib/ai/types";
import { getEnv, type Env } from "@/lib/env";
import { clientIp, hashIp, UsageLimiter } from "@/lib/guard/limits";
import { type KV, MemoryKV, UpstashKV } from "@/lib/guard/store";
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
    "Llegaste al límite de preguntas de hoy para esta demo. Mañana vas a poder seguir preguntando. Mientras tanto, las preguntas de ejemplo siguen disponibles.",
  exhausted:
    "La demo se agotó por hoy: usa un plan gratuito con un cupo diario de consultas al modelo. Volvé mañana. Las preguntas de ejemplo siguen disponibles.",
  error: "Hubo un problema al generar la respuesta. Probá de nuevo en un rato.",
};

interface Services {
  env: Env;
  kv: KV;
  chat: ChatProvider;
  limiter: UsageLimiter;
}

let services: Services | null = null;

export function getServices(): Services {
  if (services) return services;
  const env = getEnv();
  const kv = env.upstash ? new UpstashKV(env.upstash.url, env.upstash.token) : new MemoryKV();
  services = {
    env,
    kv,
    chat: createChatProvider(env),
    limiter: new UsageLimiter(kv, env.limits.perIpDaily, env.limits.globalDaily),
  };
  return services;
}

/** Para tests: inyectar dependencias. */
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
  const { env, kv, chat, limiter } = getServices();
  const { maxQuestionChars, minQuestionChars } = env.limits;

  // 1. Validación
  const question = typeof input.question === "string" ? input.question.replace(/\s+/g, " ").trim() : "";
  if (!question) return err(400, MESSAGES.empty);
  if (question.length > maxQuestionChars) return err(400, MESSAGES.tooLong(maxQuestionChars));
  if (question.length < minQuestionChars) return err(400, MESSAGES.tooShort);
  const context =
    typeof input.context === "string" && input.context.trim()
      ? input.context.replace(/\s+/g, " ").trim().slice(0, maxQuestionChars)
      : undefined;

  // 2. Captcha invisible
  const ip = clientIp(headers);
  if (!(await verifyTurnstile(env.turnstileSecret, input.captchaToken, ip))) return err(403, MESSAGES.captcha);

  // 3. Caché: las preguntas repetidas (como las de ejemplo) no gastan cupo.
  const key = cacheKey(question, context, chat);
  const hit = await kv.get(key).catch(() => null);
  if (hit) {
    const cached = JSON.parse(hit) as AskResult;
    return { status: 200, body: { ...cached, meta: { ...cached.meta, cached: true } } };
  }

  // 4. Límites
  if (!(await limiter.consumeIp(hashIp(ip, env.ipSalt)))) return { status: 429, body: { kind: "limit", message: MESSAGES.ipLimit } };
  if (await limiter.isExhausted()) return { status: 429, body: { kind: "limit", message: MESSAGES.exhausted } };

  // El cupo global se descuenta solo cuando de verdad se llama al modelo.
  const meteredChat: ChatProvider = {
    name: chat.name,
    model: chat.model,
    async generateJson(req) {
      if (chat.name !== "mock" && !(await limiter.consumeModelCall())) throw new QuotaExceededError();
      return chat.generateJson(req);
    },
  };

  // 5. Pipeline
  let result: AskResult;
  try {
    result = await answerQuestion(
      question,
      {
        chat: meteredChat,
        embedder: getEmbedder(env),
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

let embedder: ReturnType<typeof createEmbeddingProvider> | undefined;
function getEmbedder(env: Env) {
  if (embedder === undefined) embedder = createEmbeddingProvider(env);
  return embedder;
}

const err = (status: number, message: string): AskResponse => ({ status, body: { kind: "error", message } });
