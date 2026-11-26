/**
 * Parsea data/raw/<id>.html → data/laws/<id>.json (estructura + artículos + vigencia).
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { LAWS } from "../src/config/laws";
import { decodeHtmlBytes } from "../src/lib/ingest/html";
import { parseLaw } from "../src/lib/ingest/parse";

const meta = JSON.parse(readFileSync("data/raw/meta.json", "utf8"));
mkdirSync("data/laws", { recursive: true });

for (const source of LAWS) {
  const html = decodeHtmlBytes(readFileSync(`data/raw/${source.id}.html`));
  const doc = parseLaw(source, html, meta[source.id].retrievedAt);
  writeFileSync(`data/laws/${source.id}.json`, JSON.stringify(doc, null, 1) + "\n");
  const active = doc.articles.filter((a) => !a.repealed && !a.formal);
  const untitled = doc.articles.filter((a) => !a.title && !a.repealed).length;
  console.log(
    `✓ ${doc.shortName}: ${doc.articles.length} artículos (${active.length} vigentes indexables, ` +
      `${doc.articles.length - active.length} derogados/de forma, ${untitled} sin epígrafe). ` +
      `Última modificación: ${doc.lastAmendment?.text ?? "—"} (${doc.lastAmendment?.date ?? "—"})`,
  );
}
