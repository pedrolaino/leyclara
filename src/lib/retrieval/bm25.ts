export interface Bm25Index {
  docs: string[][];
  df: Map<string, number>;
  tf: Map<string, number>[];
  avgLen: number;
  k1: number;
  b: number;
}

export function buildBm25(docs: string[][], k1 = 1.2, b = 0.6): Bm25Index {
  const df = new Map<string, number>();
  const tf = docs.map((tokens) => {
    const m = new Map<string, number>();
    for (const t of tokens) m.set(t, (m.get(t) ?? 0) + 1);
    for (const t of m.keys()) df.set(t, (df.get(t) ?? 0) + 1);
    return m;
  });
  const avgLen = docs.reduce((s, d) => s + d.length, 0) / Math.max(docs.length, 1);
  return { docs, df, tf, avgLen, k1, b };
}

export function idf(index: Bm25Index, term: string): number {
  const n = index.docs.length;
  const df = index.df.get(term) ?? 0;
  return Math.log(1 + (n - df + 0.5) / (df + 0.5));
}

export function scoreBm25(index: Bm25Index, query: Map<string, number>): Float64Array {
  const scores = new Float64Array(index.docs.length);
  for (const [term, weight] of query) {
    if (!index.df.has(term)) continue;
    const w = idf(index, term) * weight;
    for (let i = 0; i < index.docs.length; i++) {
      const f = index.tf[i].get(term);
      if (!f) continue;
      const len = index.docs[i].length;
      scores[i] += (w * f * (index.k1 + 1)) / (f + index.k1 * (1 - index.b + (index.b * len) / index.avgLen));
    }
  }
  return scores;
}
