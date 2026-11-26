import type { EmbeddingProvider } from "@/lib/ai/types";
import type { Sql } from "@/lib/db/client";
import { modelKey, nearestChunks } from "@/lib/db/embeddings";
import { type Corpus, getCorpus } from "./corpus";

// Returns chunk id -> cosine, or null if vectors aren't available right now.
export type VectorSearch = (text: string) => Promise<Map<string, number> | null>;

export function createVectorSearch(sql: Sql, embedder: EmbeddingProvider, corpus: Corpus = getCorpus(), limit = 24): VectorSearch {
  const model = modelKey(embedder);
  const hashes = new Map(corpus.chunks.map((c) => [c.id, c.hash]));
  return async (text) => {
    try {
      const [vector] = await embedder.embed([text], "query");
      const matches = await nearestChunks(sql, model, vector, limit);
      // Skip vectors made from an older version of the text.
      const fresh = matches.filter((m) => hashes.get(m.chunkId) === m.hash);
      return new Map(fresh.map((m) => [m.chunkId, m.cosine]));
    } catch (err) {
      console.warn("[vectors] search failed, falling back to lexical search", err);
      return null;
    }
  };
}
