// LLM_PROVIDER=gemini | openai | mock
// EMBEDDING_PROVIDER=gemini | openai | none
import type { Env } from "@/lib/env";
import { GeminiChat, GeminiEmbeddings } from "./gemini";
import { MockChat } from "./mock";
import { OpenAICompatibleChat, OpenAICompatibleEmbeddings } from "./openai-compatible";
import type { ChatProvider, EmbeddingProvider } from "./types";

export function createChatProvider(env: Env): ChatProvider {
  switch (env.llmProvider) {
    case "gemini":
      if (!env.gemini.apiKey) throw new Error("LLM_PROVIDER=gemini needs GEMINI_API_KEY");
      return new GeminiChat(env.gemini.apiKey, env.gemini.model, env.gemini.thinkingBudget);
    case "openai":
      return new OpenAICompatibleChat(env.openai.baseUrl, env.openai.apiKey, env.openai.model);
    case "mock":
      return new MockChat();
    default:
      throw new Error(`Unknown LLM_PROVIDER: ${env.llmProvider}`);
  }
}

export function createEmbeddingProvider(env: Env): EmbeddingProvider | null {
  switch (env.embeddingProvider) {
    case "gemini":
      if (!env.gemini.apiKey) throw new Error("EMBEDDING_PROVIDER=gemini needs GEMINI_API_KEY");
      return new GeminiEmbeddings(env.gemini.apiKey, env.gemini.embeddingModel, env.embeddingDimensions);
    case "openai":
      return new OpenAICompatibleEmbeddings(env.openai.baseUrl, env.openai.apiKey, env.openai.embeddingModel, env.embeddingDimensions);
    case "none":
      return null;
    default:
      throw new Error(`Unknown EMBEDDING_PROVIDER: ${env.embeddingProvider}`);
  }
}

export * from "./types";
