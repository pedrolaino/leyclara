import type { EmbeddingProvider } from "@/lib/ai/types";
import type { Chunk } from "@/lib/retrieval/corpus";
import type { Sql } from "./client";

// Provider, model and size together, e.g. "gemini:gemini-embedding-001:768".
export function modelKey(provider: EmbeddingProvider): string {
  return `${provider.name}:${provider.model}:${provider.dimensions}`;
}

const toVector = (v: number[]) => `[${v.join(",")}]`;

export interface SyncResult {
  embedded: number;
  unchanged: number;
  removed: number;
}

// Embeds only new or changed chunks and drops rows for chunks that no longer exist.
export async function syncEmbeddings(sql: Sql, chunks: Chunk[], provider: EmbeddingProvider): Promise<SyncResult> {
  const model = modelKey(provider);
  const stored = await sql<{ chunk_id: string; content_hash: string }[]>`
    SELECT chunk_id, content_hash FROM chunk_embeddings WHERE model = ${model}`;
  const storedHash = new Map(stored.map((r) => [r.chunk_id, r.content_hash]));
  const todo = chunks.filter((c) => storedHash.get(c.id) !== c.hash);

  for (let i = 0; i < todo.length; i += 100) {
    const batch = todo.slice(i, i + 100);
    const vectors = await provider.embed(batch.map((c) => c.text), "document");
    const rows = batch.map((c, j) => ({ chunk_id: c.id, model, content_hash: c.hash, embedding: toVector(vectors[j]) }));
    await sql`
      INSERT INTO chunk_embeddings ${sql(rows, "chunk_id", "model", "content_hash", "embedding")}
      ON CONFLICT (chunk_id, model) DO UPDATE
      SET content_hash = excluded.content_hash, embedding = excluded.embedding, created_at = now()`;
  }

  const ids = chunks.map((c) => c.id);
  const removed = await sql`
    DELETE FROM chunk_embeddings WHERE model = ${model} AND NOT (chunk_id = ANY(${ids}))`;

  return { embedded: todo.length, unchanged: chunks.length - todo.length, removed: removed.count };
}

export interface VectorMatch {
  chunkId: string;
  hash: string;
  cosine: number;
}

export async function nearestChunks(sql: Sql, model: string, vector: number[], limit: number): Promise<VectorMatch[]> {
  const v = toVector(vector);
  const rows = await sql<{ chunk_id: string; content_hash: string; cosine: number }[]>`
    SELECT chunk_id, content_hash, 1 - (embedding <=> ${v}::vector) AS cosine
    FROM chunk_embeddings
    WHERE model = ${model}
    ORDER BY embedding <=> ${v}::vector
    LIMIT ${limit}`;
  return rows.map((r) => ({ chunkId: r.chunk_id, hash: r.content_hash, cosine: Number(r.cosine) }));
}
