// Download, parse and embed. Used by the scripts in scripts/.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { LAWS } from "@/config/laws";
import type { EmbeddingProvider } from "@/lib/ai/types";
import { migrate, type Sql } from "@/lib/db/client";
import { syncEmbeddings } from "@/lib/db/embeddings";
import { buildChunks } from "@/lib/retrieval/corpus";
import type { LawDocument } from "@/lib/types";
import { decodeHtmlBytes } from "./html";
import { parseLaw } from "./parse";

const META = "data/raw/meta.json";
type Meta = Record<string, { url: string; retrievedAt: string; bytes: number }>;

// InfoLEG returns 403 to some clients without a User-Agent.
const UA = process.env.INFOLEG_USER_AGENT ?? "ley-clara/0.1 (educational project)";

export async function fetchLaws(only: string[] = []) {
  const meta: Meta = existsSync(META) ? JSON.parse(readFileSync(META, "utf8")) : {};
  mkdirSync("data/raw", { recursive: true });
  for (const law of LAWS) {
    if (only.length && !only.includes(law.id)) continue;
    const res = await fetch(law.textUrl, { headers: { "User-Agent": UA } });
    if (!res.ok) throw new Error(`${law.id}: HTTP ${res.status} from ${law.textUrl}`);
    const bytes = new Uint8Array(await res.arrayBuffer());
    writeFileSync(`data/raw/${law.id}.html`, bytes);
    meta[law.id] = { url: law.textUrl, retrievedAt: new Date().toISOString().slice(0, 10), bytes: bytes.length };
    console.log(`✓ downloaded ${law.shortName} ${law.number} (${(bytes.length / 1024).toFixed(0)} KB)`);
  }
  writeFileSync(META, JSON.stringify(meta, null, 2) + "\n");
}

export function parseLaws(): LawDocument[] {
  const meta: Meta = JSON.parse(readFileSync(META, "utf8"));
  mkdirSync("data/laws", { recursive: true });
  return LAWS.map((source) => {
    const html = decodeHtmlBytes(readFileSync(`data/raw/${source.id}.html`));
    const doc = parseLaw(source, html, meta[source.id].retrievedAt);
    writeFileSync(`data/laws/${source.id}.json`, JSON.stringify(doc, null, 1) + "\n");
    const active = doc.articles.filter((a) => !a.repealed && !a.formal);
    console.log(
      `✓ parsed ${doc.shortName}: ${doc.articles.length} articles, ${active.length} indexed. ` +
        `Last amendment: ${doc.lastAmendment?.text ?? "none"} (${doc.lastAmendment?.date ?? "-"})`,
    );
    return doc;
  });
}

export async function embedLaws(sql: Sql, laws: LawDocument[], provider: EmbeddingProvider) {
  await migrate(sql);
  const chunks = buildChunks(laws);
  const r = await syncEmbeddings(sql, chunks, provider);
  console.log(`✓ embeddings: ${r.embedded} new or changed, ${r.unchanged} unchanged, ${r.removed} removed`);
}
