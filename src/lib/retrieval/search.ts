// Searches all laws at once. BM25 always, plus pgvector results merged with RRF when available.
// RRF only ranks, so coverage and cosine are returned too for the relevance check.
import type { AreaId } from "@/config/laws";
import type { Article, LawDocument } from "@/lib/types";
import { EXPANSIONS } from "@/lib/scope/lexicon";
import { type Bm25Index, buildBm25, idf, scoreBm25 } from "./bm25";
import { type Corpus, getCorpus } from "./corpus";
import { normalize, tokenize } from "./text";

export interface ArticleHit {
  article: Article;
  law: LawDocument;
  score: number;
  bm25: number;
  // Share of the query weight found in the article, 0 to 1
  coverage: number;
  cosine?: number;
  chunkIds: string[];
}

export interface SearchResult {
  hits: ArticleHit[];
  expandedAreas: AreaId[];
  queryTerms: Map<string, number>;
  mode: "lexical" | "hybrid";
}

export interface SearchOptions {
  context?: string;
  k?: number;
  // chunk id -> cosine similarity, from the vector search
  vectorScores?: Map<string, number> | null;
  corpus?: Corpus;
}

const bm25Cache = new WeakMap<Corpus, Bm25Index>();

export function expandQuery(question: string): { extra: string[]; areas: AreaId[] } {
  const n = normalize(question);
  const matched = EXPANSIONS.filter((e) => e.pattern.test(n));
  return { extra: matched.map((e) => e.terms), areas: [...new Set(matched.map((e) => e.area))] };
}

export function buildQueryTerms(question: string, context?: string): { terms: Map<string, number>; areas: AreaId[] } {
  const terms = new Map<string, number>();
  const add = (tokens: string[], w: number) => {
    for (const t of tokens) terms.set(t, Math.max(terms.get(t) ?? 0, w));
  };
  const { extra, areas } = expandQuery(`${question} ${context ?? ""}`);
  add(tokenize(extra.join(" ")), 0.8);
  if (context) add(tokenize(context), 0.5);
  add(tokenize(question), 1);
  return { terms, areas };
}

export function search(question: string, opts: SearchOptions = {}): SearchResult {
  const corpus = opts.corpus ?? getCorpus();
  const k = opts.k ?? 6;
  let bm25 = bm25Cache.get(corpus);
  if (!bm25) {
    bm25 = buildBm25(corpus.chunks.map((c) => c.tokens));
    bm25Cache.set(corpus, bm25);
  }

  const { terms, areas } = buildQueryTerms(question, opts.context);
  const lexical = scoreBm25(bm25, terms);

  // Chunks outside the vector search results get -1.
  const scores = opts.vectorScores?.size ? opts.vectorScores : null;
  const cosines = scores ? Float64Array.from(corpus.chunks, (c) => scores.get(c.id) ?? -1) : null;

  // An article scores as its best chunk.
  type Agg = { bm25: number; cosine: number; chunks: { id: string; s: number }[] };
  const byArticle = new Map<string, Agg>();
  corpus.chunks.forEach((c, i) => {
    const agg = byArticle.get(c.articleId) ?? { bm25: 0, cosine: -1, chunks: [] };
    agg.bm25 = Math.max(agg.bm25, lexical[i]);
    if (cosines) agg.cosine = Math.max(agg.cosine, cosines[i]);
    agg.chunks.push({ id: c.id, s: lexical[i] + (cosines ? cosines[i] * 10 : 0) });
    byArticle.set(c.articleId, agg);
  });

  const entries = [...byArticle.entries()];
  const lexRank = rankOf(entries, (e) => e[1].bm25);
  const vecRank = cosines ? rankOf(entries, (e) => e[1].cosine) : null;
  const rrf = (id: string) => 1 / (60 + lexRank.get(id)!) + (vecRank ? 1 / (60 + vecRank.get(id)!) : 0);

  const scored = entries
    .filter(([, a]) => a.bm25 > 0 || (cosines && a.cosine > 0))
    .map(([id, a]) => ({ id, a, score: vecRank ? rrf(id) : a.bm25 }))
    .sort((x, y) => y.score - x.score)
    .slice(0, k);

  const maxIdf = Math.log(1 + (bm25.docs.length + 0.5) / 0.5);
  const totalWeight = [...terms].reduce((s, [t, w]) => s + w * (bm25!.df.has(t) ? idf(bm25!, t) : maxIdf), 0);
  const articleTokens = (id: string) => new Set(corpus.chunks.filter((c) => c.articleId === id).flatMap((c) => c.tokens));

  const hits: ArticleHit[] = scored.map(({ id, a, score }) => {
    const article = corpus.articles.get(id)!;
    const tokens = articleTokens(id);
    const matched = [...terms].reduce((s, [t, w]) => s + (tokens.has(t) ? w * idf(bm25!, t) : 0), 0);
    return {
      article,
      law: corpus.laws.get(article.lawId)!,
      score,
      bm25: a.bm25,
      coverage: totalWeight ? matched / totalWeight : 0,
      cosine: cosines && a.cosine >= 0 ? a.cosine : undefined,
      chunkIds: a.chunks.sort((x, y) => y.s - x.s).map((c) => c.id),
    };
  });

  return { hits, expandedAreas: areas, queryTerms: terms, mode: cosines ? "hybrid" : "lexical" };
}

function rankOf<T>(items: [string, T][], key: (e: [string, T]) => number): Map<string, number> {
  const sorted = [...items].sort((a, b) => key(b) - key(a));
  return new Map(sorted.map((e, i) => [e[0], i + 1]));
}
