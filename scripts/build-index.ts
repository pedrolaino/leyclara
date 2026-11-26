/**
 * Calcula los embeddings de todos los chunks UNA sola vez y los guarda en data/index/embeddings.json.
 * En cada consulta solo se embebe la pregunta (1 llamada barata).
 *
 *   GEMINI_API_KEY=... npm run index:build
 *
 * Sin proveedor de embeddings configurado, la app funciona igual con búsqueda léxica (BM25).
 * Si se vuelve a parsear una ley, el hash del corpus cambia y la app ignora el índice viejo
 * hasta que se reconstruya.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createEmbeddingProvider } from "../src/lib/ai";
import { getEnv } from "../src/lib/env";
import { embeddingIndexPath, encodeVector, type EmbeddingIndexFile, getCorpus } from "../src/lib/retrieval/corpus";

const env = getEnv();
const provider = createEmbeddingProvider(env);
if (!provider) {
  console.log("EMBEDDING_PROVIDER=none (o falta GEMINI_API_KEY): no hay embeddings que calcular. La app usará búsqueda léxica.");
  process.exit(0);
}

const corpus = getCorpus();
console.log(`Embebiendo ${corpus.chunks.length} chunks con ${provider.name}/${provider.model} (${provider.dimensions} dims)…`);
const t0 = Date.now();
const vectors = await provider.embed(corpus.chunks.map((c) => c.text), "document");

const file: EmbeddingIndexFile = {
  provider: provider.name,
  model: provider.model,
  dimensions: vectors[0].length,
  corpusHash: corpus.hash,
  createdAt: new Date().toISOString(),
  vectors: Object.fromEntries(corpus.chunks.map((c, i) => [c.id, encodeVector(vectors[i])])),
};
const out = embeddingIndexPath();
mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(file));
console.log(`✓ ${out} (${vectors.length} vectores, ${((Date.now() - t0) / 1000).toFixed(1)} s)`);
