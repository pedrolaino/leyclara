// One chunk per article. Long ones are split by paragraph, but every chunk cites the same article.
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { LAWS } from "@/config/laws";
import type { Article, LawDocument } from "@/lib/types";
import { tokenize } from "./text";

export interface Chunk {
  id: string;
  articleId: string;
  lawId: string;
  text: string;
  tokens: string[];
}

export interface Corpus {
  laws: Map<string, LawDocument>;
  articles: Map<string, Article>;
  chunks: Chunk[];
  // Used to catch an embeddings index built from older texts
  hash: string;
}

const MAX_CHUNK_CHARS = 1400;

export const dataDir = () => process.env.DATA_DIR ?? path.join(process.cwd(), "data");

export function loadLaws(dir = dataDir()): LawDocument[] {
  return LAWS.map((l) => JSON.parse(readFileSync(path.join(dir, "laws", `${l.id}.json`), "utf8")) as LawDocument);
}

export function articleHeader(law: LawDocument, a: Article): string {
  return `${law.name} (Ley ${law.number}) — ${a.label}${a.title ? `: ${a.title}` : ""}`;
}

export function buildChunks(laws: LawDocument[]): Chunk[] {
  const chunks: Chunk[] = [];
  for (const law of laws) {
    for (const a of law.articles) {
      if (a.repealed || a.formal || !a.text) continue;
      const header = articleHeader(law, a);
      const section = a.path.at(-1) ?? "";
      const groups: string[] = [];
      let buf = "";
      for (const p of a.text.split("\n")) {
        if (buf && buf.length + p.length > MAX_CHUNK_CHARS) {
          groups.push(buf);
          buf = "";
        }
        buf = buf ? `${buf}\n${p}` : p;
      }
      if (buf) groups.push(buf);
      groups.forEach((g, i) => {
        const text = `${header}${groups.length > 1 ? ` (parte ${i + 1}/${groups.length})` : ""}\n${g}`;
        // The title counts twice, it says what the article is about.
        const tokens = [...tokenize(header), ...tokenize(a.title ?? ""), ...tokenize(section), ...tokenize(g)];
        chunks.push({ id: `${a.id}#${i}`, articleId: a.id, lawId: law.id, text, tokens });
      });
    }
  }
  return chunks;
}

export function corpusHash(chunks: Chunk[]): string {
  const h = createHash("sha256");
  for (const c of chunks) h.update(c.id).update(c.text);
  return h.digest("hex").slice(0, 16);
}

let cached: Corpus | null = null;

export function getCorpus(): Corpus {
  if (cached) return cached;
  const laws = loadLaws();
  const chunks = buildChunks(laws);
  cached = {
    laws: new Map(laws.map((l) => [l.id, l])),
    articles: new Map(laws.flatMap((l) => l.articles.map((a) => [a.id, a] as const))),
    chunks,
    hash: corpusHash(chunks),
  };
  return cached;
}

export interface EmbeddingIndexFile {
  provider: string;
  model: string;
  dimensions: number;
  corpusHash: string;
  createdAt: string;
  // base64 Float32, much smaller than JSON arrays
  vectors: Record<string, string>;
}

export interface EmbeddingIndex {
  provider: string;
  model: string;
  dimensions: number;
  vectors: Map<string, Float32Array>;
}

export const embeddingIndexPath = () => path.join(dataDir(), "index", "embeddings.json");

export function encodeVector(v: number[]): string {
  return Buffer.from(new Float32Array(normalizeVector(v)).buffer).toString("base64");
}

export function normalizeVector(v: number[]): number[] {
  const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / n);
}

let cachedIndex: EmbeddingIndex | null | undefined;

export function getEmbeddingIndex(corpus: Corpus): EmbeddingIndex | null {
  if (cachedIndex !== undefined) return cachedIndex;
  const file = embeddingIndexPath();
  if (!existsSync(file)) return (cachedIndex = null);
  const raw = JSON.parse(readFileSync(file, "utf8")) as EmbeddingIndexFile;
  if (raw.corpusHash !== corpus.hash) {
    console.warn(`[index] embeddings are stale (${raw.corpusHash} != ${corpus.hash}), using lexical search only. Run npm run index:build.`);
    return (cachedIndex = null);
  }
  const vectors = new Map<string, Float32Array>();
  for (const [id, b64] of Object.entries(raw.vectors)) {
    const buf = Buffer.from(b64, "base64");
    vectors.set(id, new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4));
  }
  return (cachedIndex = { provider: raw.provider, model: raw.model, dimensions: raw.dimensions, vectors });
}
