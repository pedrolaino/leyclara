// Downloads the updated text of each law into data/raw/. The raw HTML is committed
// so parsing doesn't depend on InfoLEG being up.
//
//   npm run laws:fetch          # all laws
//   npm run laws:fetch -- lct   # just one
//
// InfoLEG returns 403 to some clients without a User-Agent. Override with INFOLEG_USER_AGENT.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { LAWS } from "../src/config/laws";

const UA = process.env.INFOLEG_USER_AGENT ?? "ley-clara/0.1 (educational project)";
const META = "data/raw/meta.json";

type Meta = Record<string, { url: string; retrievedAt: string; bytes: number }>;
const only = process.argv.slice(2);
const meta: Meta = existsSync(META) ? JSON.parse(readFileSync(META, "utf8")) : {};

mkdirSync("data/raw", { recursive: true });
for (const law of LAWS) {
  if (only.length && !only.includes(law.id)) continue;
  const res = await fetch(law.textUrl, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${law.id}: HTTP ${res.status} from ${law.textUrl}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  writeFileSync(`data/raw/${law.id}.html`, bytes);
  meta[law.id] = { url: law.textUrl, retrievedAt: new Date().toISOString().slice(0, 10), bytes: bytes.length };
  console.log(`✓ ${law.shortName} ${law.number}: ${(bytes.length / 1024).toFixed(0)} KB`);
}
writeFileSync(META, JSON.stringify(meta, null, 2) + "\n");
console.log("Done. Next: npm run laws:parse && npm run index:build");
