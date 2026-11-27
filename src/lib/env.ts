// All env config in one place. See .env.example.
import { DEFAULT_LIMITS } from "@/config/site";

const num = (v: string | undefined, fallback: number) => {
  const n = Number(v);
  return v !== undefined && v !== "" && Number.isFinite(n) ? n : fallback;
};

export function getEnv(e: NodeJS.ProcessEnv = process.env) {
  const geminiKey = e.GEMINI_API_KEY || undefined;
  const llmProvider = (e.LLM_PROVIDER || (geminiKey ? "gemini" : "mock")) as "gemini" | "openai" | "mock";
  const embeddingProvider = (e.EMBEDDING_PROVIDER || (geminiKey ? "gemini" : "none")) as "gemini" | "openai" | "none";

  return {
    llmProvider,
    embeddingProvider,
    gemini: {
      apiKey: geminiKey,
      model: e.GEMINI_MODEL || "gemini-3.1-flash-lite",
      embeddingModel: e.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001",
      thinkingBudget: e.GEMINI_THINKING_BUDGET === undefined ? 0 : e.GEMINI_THINKING_BUDGET === "" ? undefined : Number(e.GEMINI_THINKING_BUDGET),
    },
    openai: {
      baseUrl: e.OPENAI_BASE_URL || "https://api.groq.com/openai/v1",
      apiKey: e.OPENAI_API_KEY || undefined,
      model: e.OPENAI_MODEL || "llama-3.3-70b-versatile",
      embeddingModel: e.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small",
    },
    embeddingDimensions: num(e.EMBEDDING_DIMENSIONS, 768),
    limits: {
      maxQuestionChars: num(e.MAX_QUESTION_CHARS, DEFAULT_LIMITS.maxQuestionChars),
      minQuestionChars: DEFAULT_LIMITS.minQuestionChars,
      maxAnswerChars: num(e.MAX_ANSWER_CHARS, DEFAULT_LIMITS.maxAnswerChars),
      maxOutputTokens: num(e.MAX_OUTPUT_TOKENS, DEFAULT_LIMITS.maxOutputTokens),
      perIpDaily: num(e.RATE_LIMIT_PER_IP_DAILY, DEFAULT_LIMITS.perIpDaily),
      globalDaily: num(e.RATE_LIMIT_GLOBAL_DAILY, DEFAULT_LIMITS.globalDaily),
    },
    // Shared links need absolute URLs. Vercel sets the production domain.
    siteUrl: e.SITE_URL || (e.VERCEL_PROJECT_PRODUCTION_URL ? `https://${e.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000"),
    databaseUrl: e.DATABASE_URL || undefined,
    turnstileSecret: e.TURNSTILE_SECRET_KEY || undefined,
    ipSalt: e.IP_HASH_SALT || "change-me",
  };
}

export type Env = ReturnType<typeof getEnv>;
