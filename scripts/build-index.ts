// Embeds every chunk once and saves data/index/embeddings.json.
// At query time only the question gets embedded.
//
//   GEMINI_API_KEY=... npm run index:build
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createEmbeddingProvider } from "../src/lib/ai";
import { getEnv } from "../src/lib/env";
import { embeddingIndexPath, encodeVector, type EmbeddingIndexFile, getCorpus } from "../src/lib/retrieval/corpus";

const env = getEnv();
const provider = createEmbeddingProvider(env);
if (!provider) {
  console.log("No embedding provider configured, nothing to do. The app will use lexical search.");
  process.exit(0);
}

const corpus = getCorpus();
console.log(`Embedding ${corpus.chunks.length} chunks with ${provider.name}/${provider.model} (${provider.dimensions} dims)...`);
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
console.log(`✓ ${out} (${vectors.length} vectors, ${((Date.now() - t0) / 1000).toFixed(1)} s)`);
