// Parses the laws in data/raw and stores their embeddings in Postgres.
//
//   npm run ingest              # uses the committed HTML
//   npm run ingest -- --fetch   # downloads the latest text from InfoLEG first
//
// Without DATABASE_URL or an embedding provider it only parses.
import { createEmbeddingProvider } from "../src/lib/ai";
import { connect } from "../src/lib/db/client";
import { getEnv } from "../src/lib/env";
import { embedLaws, fetchLaws, parseLaws } from "../src/lib/ingest/pipeline";

const args = process.argv.slice(2);
if (args.includes("--fetch")) await fetchLaws(args.filter((a) => !a.startsWith("--")));

const laws = parseLaws();

const env = getEnv();
const provider = createEmbeddingProvider(env);
if (!env.databaseUrl || !provider) {
  console.log("No DATABASE_URL or embedding provider, skipping embeddings.");
} else {
  const sql = connect(env.databaseUrl);
  await embedLaws(sql, laws, provider);
  await sql.end();
}
