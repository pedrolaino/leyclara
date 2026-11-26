/**
 * Evaluación del asistente con preguntas de prueba (eval/questions.json).
 *
 *   npm run eval                       # usa el proveedor configurado en el entorno
 *   LLM_PROVIDER=mock npm run eval     # solo búsqueda + router, sin modelo (gratis, determinístico)
 *   npm run eval -- --verbose          # muestra cada pregunta
 *   npm run eval -- --set holdout      # set separado, que NO se usó para ajustar el glosario
 *
 * Mide:
 *  - Búsqueda: ¿el artículo esperado aparece en el top-1 / top-3 / top-5? (MRR)
 *  - Router: ¿cada pregunta terminó en el tipo de respuesta correcto?
 *  - Citas: en las respondidas, ¿el modelo citó un artículo esperado?
 * Escribe un reporte en eval/results/.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createChatProvider, createEmbeddingProvider } from "../src/lib/ai";
import { answerQuestion } from "../src/lib/assistant/answer";
import type { AskResult } from "../src/lib/assistant/types";
import { getEnv } from "../src/lib/env";
import { getCorpus, getEmbeddingIndex } from "../src/lib/retrieval/corpus";
import { search } from "../src/lib/retrieval/search";

interface Question {
  id: string;
  question: string;
  expected: { kind: AskResult["kind"]; articles?: string[]; topic?: string };
  needsModel?: boolean;
}

const verbose = process.argv.includes("--verbose");
const setArg = process.argv.indexOf("--set");
const setName = setArg > 0 ? process.argv[setArg + 1] : "questions";
const questions: Question[] = JSON.parse(readFileSync(`eval/${setName}.json`, "utf8"));
const env = getEnv();
const chat = createChatProvider(env);
const embedder = createEmbeddingProvider(env);
const index = getEmbeddingIndex(getCorpus());
const usesModel = chat.name !== "mock";
const retrievalMode = index && embedder ? "híbrida" : "léxica";

type Row = Question & { got: AskResult; rank?: number; routeOk: boolean; citationOk?: boolean; ms: number };
const rows: Row[] = [];

for (const q of questions) {
  const t0 = Date.now();
  let got: AskResult;
  try {
    got = await answerQuestion(q.question, {
      chat,
      embedder,
      embeddingIndex: index,
      maxAnswerChars: env.limits.maxAnswerChars,
      maxOutputTokens: env.limits.maxOutputTokens,
    });
  } catch (err) {
    console.error(`✗ ${q.id}: ${(err as Error).message}`);
    process.exitCode = 1;
    continue;
  }
  const ms = Date.now() - t0;

  let rank: number | undefined;
  if (q.expected.articles) {
    let vector: number[] | undefined;
    if (index && embedder) [vector] = await embedder.embed([q.question], "query");
    const hits = search(q.question, { k: 10, queryVector: vector, embeddingIndex: index }).hits;
    const pos = hits.findIndex((h) => q.expected.articles!.includes(h.article.id));
    rank = pos >= 0 ? pos + 1 : undefined;
  }
  const routeOk =
    got.kind === q.expected.kind &&
    (q.expected.kind !== "not_covered" || (got.kind === "not_covered" && got.topic.length > 0));
  const citationOk =
    got.kind === "answer" && q.expected.articles
      ? got.citations.some((c) => q.expected.articles!.includes(c.id))
      : undefined;
  rows.push({ ...q, got, rank, routeOk, citationOk, ms });

  if (verbose) {
    const cited = got.kind === "answer" ? got.citations.map((c) => c.id).join(",") : "";
    console.log(
      `${routeOk ? "✓" : "✗"} ${q.id} [${got.kind}${cited ? ` ${cited}` : ""}] rank=${rank ?? "-"} ${got.meta.reason ?? ""} — ${q.question}`,
    );
    if (!routeOk || (rank ?? 1) > 3) console.log(`    candidatos: ${got.meta.candidates.slice(0, 4).map((c) => `${c.id}(${c.coverage})`).join(" ")}`);
  }
  if (usesModel) await new Promise((r) => setTimeout(r, Number(process.env.EVAL_DELAY_MS ?? 4000))); // respetar el RPM del plan gratis
}

// --- Métricas
const answerable = rows.filter((r) => r.expected.articles);
const hitAt = (k: number) => answerable.filter((r) => r.rank !== undefined && r.rank <= k).length;
const mrr = answerable.reduce((s, r) => s + (r.rank ? 1 / r.rank : 0), 0) / answerable.length;
const routed = rows.filter((r) => usesModel || !r.needsModel);
const byKind = (kind: string) => routed.filter((r) => r.expected.kind === kind);
const pct = (a: number, b: number) => (b ? `${((100 * a) / b).toFixed(0)}% (${a}/${b})` : "—");
const citedRows = rows.filter((r) => r.citationOk !== undefined);
const falseAnswers = routed.filter((r) => r.expected.kind !== "answer" && r.got.kind === "answer");

const summary = [
  `# Evaluación (${setName === "questions" ? "set principal" : `set ${setName}`}) — ${new Date().toISOString().slice(0, 10)}`,
  "",
  `- Modelo: \`${chat.name}/${chat.model}\``,
  `- Búsqueda: ${retrievalMode}${index ? ` (embeddings ${index.provider}/${index.model}, ${index.dimensions} dims)` : ""}`,
  `- Preguntas: ${rows.length} (${answerable.length} con artículo esperado)${usesModel ? "" : `; ${rows.length - routed.length} requieren modelo y se omiten del router`}`,
  "",
  "## Búsqueda (¿aparece el artículo esperado?)",
  "",
  "| Métrica | Valor |",
  "|---|---|",
  `| Top-1 | ${pct(hitAt(1), answerable.length)} |`,
  `| Top-3 | ${pct(hitAt(3), answerable.length)} |`,
  `| Top-5 | ${pct(hitAt(5), answerable.length)} |`,
  `| MRR | ${mrr.toFixed(3)} |`,
  "",
  "## Router (¿terminó en el tipo de respuesta correcto?)",
  "",
  "| Caso esperado | Acierto |",
  "|---|---|",
  ...(["answer", "off_topic", "not_covered", "not_found"] as const).map(
    (k) => `| ${k} | ${pct(byKind(k).filter((r) => r.routeOk).length, byKind(k).length)} |`,
  ),
  `| **Total** | **${pct(routed.filter((r) => r.routeOk).length, routed.length)}** |`,
  "",
  `Respuestas indebidas (respondió algo que debía rechazar): **${falseAnswers.length}**`,
  "",
  "## Citas",
  "",
  `Respuestas que citan un artículo esperado: ${pct(citedRows.filter((r) => r.citationOk).length, citedRows.length)}`,
  "",
  `Latencia promedio: ${Math.round(rows.reduce((s, r) => s + r.ms, 0) / rows.length)} ms`,
  "",
  "## Detalle",
  "",
  "| id | pregunta | esperado | obtenido | rank | citas |",
  "|---|---|---|---|---|---|",
  ...rows.map((r) => {
    const cites = r.got.kind === "answer" ? r.got.citations.map((c) => c.id).join(", ") : "";
    const exp = r.expected.articles ? `${r.expected.kind}: ${r.expected.articles.join(" / ")}` : r.expected.kind;
    const skipped = !usesModel && r.needsModel ? " (omitida: requiere modelo)" : "";
    return `| ${r.id} | ${r.question} | ${exp} | ${r.routeOk ? "✓" : "✗"} ${r.got.kind}${skipped} | ${r.rank ?? "—"} | ${cites} |`;
  }),
  "",
].join("\n");

mkdirSync("eval/results", { recursive: true });
const file = `eval/results/${setName === "questions" ? "" : `${setName}-`}${chat.name}-${chat.model.replace(/[^\w.-]/g, "_")}-${retrievalMode === "híbrida" ? "hybrid" : "lexical"}.md`;
writeFileSync(file, summary);
console.log(summary.split("## Detalle")[0]);
console.log(`Reporte: ${file}`);
