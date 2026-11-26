// Needs a Postgres with pgvector: TEST_DATABASE_URL=postgres://... npm test
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { QuotaExceededError, type EmbeddingProvider } from "@/lib/ai/types";
import { answerQuestion } from "@/lib/assistant/answer";
import { MockChat } from "@/lib/ai/mock";
import { connect, migrate, type Sql } from "@/lib/db/client";
import { modelKey, nearestChunks, syncEmbeddings } from "@/lib/db/embeddings";
import { PostgresKV } from "@/lib/guard/store";
import { getCorpus, type Chunk } from "@/lib/retrieval/corpus";
import { tokenize } from "@/lib/retrieval/text";
import { createVectorSearch } from "@/lib/retrieval/vector";

const url = process.env.TEST_DATABASE_URL;

// Bag of words hashed into 64 dims: deterministic and close enough to test ranking.
function fakeEmbedder(model = "bow"): EmbeddingProvider & { calls: number } {
  return {
    name: "fake",
    model,
    dimensions: 64,
    calls: 0,
    async embed(texts) {
      this.calls += texts.length;
      return texts.map((t) => {
        const v = new Array(64).fill(0);
        for (const tok of tokenize(t)) {
          let h = 0;
          for (const ch of tok) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
          v[h % 64] += 1;
        }
        return v;
      });
    },
  };
}

describe.skipIf(!url)("postgres", () => {
  let sql: Sql;
  const chunks = getCorpus().chunks;

  beforeAll(async () => {
    sql = connect(url!);
    await migrate(sql);
    await migrate(sql);
    await sql`TRUNCATE chunk_embeddings, kv`;
  });

  afterAll(async () => {
    await sql?.end();
  });

  it("embeds only new or changed chunks", async () => {
    const embedder = fakeEmbedder();
    const first = await syncEmbeddings(sql, chunks, embedder);
    expect(first.embedded).toBe(chunks.length);

    const again = await syncEmbeddings(sql, chunks, embedder);
    expect(again).toEqual({ embedded: 0, unchanged: chunks.length, removed: 0 });

    const changed: Chunk[] = chunks.map((c, i) => (i === 0 ? { ...c, text: `${c.text} cambio`, hash: "changed" } : c));
    const third = await syncEmbeddings(sql, changed.slice(0, -1), embedder);
    expect(third).toEqual({ embedded: 1, unchanged: chunks.length - 2, removed: 1 });

    await syncEmbeddings(sql, chunks, embedder);
  });

  it("waits and retries when the provider is out of quota", async () => {
    const embedder = fakeEmbedder("quota");
    const embed = embedder.embed.bind(embedder);
    let failures = 1;
    embedder.embed = async (texts, kind) => {
      if (failures-- > 0) throw new QuotaExceededError();
      return embed(texts, kind);
    };
    const waits: number[] = [];
    const r = await syncEmbeddings(sql, chunks.slice(0, 3), embedder, { wait: async (ms) => void waits.push(ms) });
    expect(r.embedded).toBe(3);
    expect(waits).toHaveLength(1);
  });

  it("stops right away when the daily quota is used up", async () => {
    const embedder = fakeEmbedder("daily");
    embedder.embed = async () => {
      throw new QuotaExceededError('{"quotaId": "EmbedContentRequestsPerDayPerProjectPerModel-FreeTier"}');
    };
    const waits: number[] = [];
    await expect(syncEmbeddings(sql, chunks.slice(0, 3), embedder, { wait: async (ms) => void waits.push(ms) })).rejects.toThrow(QuotaExceededError);
    expect(waits).toHaveLength(0);
  });

  it("never mixes vectors from different models", async () => {
    const other = fakeEmbedder("other");
    await syncEmbeddings(sql, chunks.slice(0, 5), other);
    const [vector] = await other.embed(["velocidad máxima autopista"], "query");
    const matches = await nearestChunks(sql, modelKey(other), vector, 50);
    expect(matches).toHaveLength(5);
  });

  it("finds the right article and skips vectors of old text", async () => {
    const embedder = fakeEmbedder();
    const search = createVectorSearch(sql, embedder);
    // Querying with the chunk's own text has to bring it back first.
    const target = chunks.find((c) => c.id === "lnt-51#0")!;
    const scores = await search(target.text);
    const [best, cosine] = [...scores!.entries()].sort((a, b) => b[1] - a[1])[0];
    expect(best).toBe("lnt-51#0");
    expect(cosine).toBeCloseTo(1, 5);

    await sql`UPDATE chunk_embeddings SET content_hash = 'old' WHERE chunk_id LIKE 'lnt-51#%' AND model = ${modelKey(embedder)}`;
    const stale = await search(target.text);
    expect([...stale!.keys()].some((id) => id.startsWith("lnt-51#"))).toBe(false);
    await syncEmbeddings(sql, chunks, embedder);
  });

  it("doesn't use vectors until every chunk has one", async () => {
    const embedder = fakeEmbedder();
    await sql`DELETE FROM chunk_embeddings WHERE chunk_id LIKE 'lnt-%' AND model = ${modelKey(embedder)}`;
    expect(await createVectorSearch(sql, embedder)("velocidad máxima")).toBeNull();
    await syncEmbeddings(sql, chunks, embedder);
    expect(await createVectorSearch(sql, embedder)("velocidad máxima")).not.toBeNull();
  });

  it("answers with hybrid search when vectors are there", async () => {
    const r = await answerQuestion("¿Cuál es la velocidad máxima en una autopista?", {
      chat: new MockChat(),
      vectorSearch: createVectorSearch(sql, fakeEmbedder()),
      maxAnswerChars: 900,
      maxOutputTokens: 500,
    });
    expect(r.meta.retrieval).toBe("hybrid");
    expect(r.kind).toBe("answer");
  });

  it("stores cache entries and counters with expiry", async () => {
    const kv = new PostgresKV(sql);
    await kv.set("a", "1", 60);
    expect(await kv.get("a")).toBe("1");
    await kv.set("gone", "x", 0);
    expect(await kv.get("gone")).toBeNull();

    expect(await kv.incr("n", 60)).toBe(1);
    expect(await kv.incr("n", 60)).toBe(2);
    await kv.incr("old", 0);
    expect(await kv.incr("old", 60)).toBe(1);
  });
});
