// One chunk per article. Long ones are split by paragraph, but every chunk cites the same article.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { LAWS } from "@/config/laws";
import type { Article, LawDocument } from "@/lib/types";
import { tokenize } from "./text";

export interface Chunk {
  id: string;
  articleId: string;
  lawId: string;
  text: string;
  // Stored next to each vector, so a vector for old text is never used
  hash: string;
  tokens: string[];
}

export interface Corpus {
  laws: Map<string, LawDocument>;
  articles: Map<string, Article>;
  chunks: Chunk[];
  // Part of the cache key, so cached answers expire when the laws change
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
        chunks.push({ id: `${a.id}#${i}`, articleId: a.id, lawId: law.id, text, hash: sha(text), tokens });
      });
    }
  }
  return chunks;
}

const sha = (text: string) => createHash("sha256").update(text).digest("hex").slice(0, 16);

export function corpusHash(chunks: Chunk[]): string {
  return sha(chunks.map((c) => `${c.id}:${c.hash}`).join("\n"));
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
