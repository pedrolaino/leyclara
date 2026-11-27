// Answers the frequent questions and stores them in the cache. Runs on every Vercel build.
import { AREAS } from "../src/config/laws";
import { warmCache } from "../src/lib/assistant/service";

const { added, skipped } = await warmCache(AREAS.flatMap((a) => a.examples));
console.log(`✓ cache: ${added} answers added, ${skipped} already cached`);
process.exit(0);
