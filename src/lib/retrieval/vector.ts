import type { EmbeddingProvider } from "@/lib/ai/types";
import type { Sql } from "@/lib/db/client";
import { modelKey, nearestChunks } from "@/lib/db/embeddings";
import { type Corpus, getCorpus } from "./corpus";

// Returns chunk id -> cosine, or null if vectors aren't available right now.
export type VectorSearch = (text: string) => Promise<Map<string, number> | null>;

export function createVectorSearch(sql: Sql, embedder: EmbeddingProvider, corpus: Corpus = getCorpus(), limit = 24): VectorSearch {
  const model = modelKey(embedder);
  const hashes = new Map(corpus.chunks.map((c) => [c.id, c.hash]));
  let complete = false;
  return async (text) => {
    try {
      // A half-done ingest would push the embedded laws above the rest, so wait until every chunk has a vector.
      if (!complete) {
        const missing = await countMissing(sql, model, hashes);
        if (missing > 0) {
          console.warn(`[vectors] ${missing} chunks without a vector, using lexical search. Run npm run ingest.`);
          return null;
        }
        complete = true;
      }
      const [vector] = await embedder.embed([text], "query");
      const matches = await nearestChunks(sql, model, vector, limit);
      // Skip vectors made from an older version of the text.
      const fresh = matches.filter((m) => hashes.get(m.chunkId) === m.hash);
      return new Map(fresh.map((m) => [m.chunkId, m.cosine]));
    } catch (err) {
      console.warn(`[vectors] search failed, using lexical search: ${String(err).split("\n")[0].slice(0, 160)}`);
      return null;
    }
  };
}

async function countMissing(sql: Sql, model: string, hashes: Map<string, string>): Promise<number> {
  const rows = await sql<{ chunk_id: string; content_hash: string }[]>`
    SELECT chunk_id, content_hash FROM chunk_embeddings WHERE model = ${model}`;
  const stored = new Map(rows.map((r) => [r.chunk_id, r.content_hash]));
  return [...hashes].filter(([id, hash]) => stored.get(id) !== hash).length;
}
