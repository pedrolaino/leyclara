// Runs the test questions and writes a report to eval/results/.
//
//   npm run eval                     # provider from env
//   LLM_PROVIDER=mock npm run eval   # search and routing only, no model
//   npm run eval -- --verbose
//   npm run eval -- --set holdout    # questions that were never used to tune the lexicon
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createChatProvider, createEmbeddingProvider } from "../src/lib/ai";
import { answerQuestion } from "../src/lib/assistant/answer";
import type { AskResult } from "../src/lib/assistant/types";
import { getEnv } from "../src/lib/env";
import { connect } from "../src/lib/db/client";
import { modelKey } from "../src/lib/db/embeddings";
import { search } from "../src/lib/retrieval/search";
import { createVectorSearch } from "../src/lib/retrieval/vector";

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
const sql = env.databaseUrl && embedder ? connect(env.databaseUrl) : null;
const vectorSearch = sql && embedder ? createVectorSearch(sql, embedder) : null;
const usesModel = chat.name !== "mock";
const retrievalMode = vectorSearch ? "hybrid" : "lexical";

type Row = Question & { got: AskResult; rank?: number; routeOk: boolean; citationOk?: boolean; ms: number };
const rows: Row[] = [];

for (const q of questions) {
  const t0 = Date.now();
  let got: AskResult;
  try {
    got = await answerQuestion(q.question, {
      chat,
      vectorSearch,
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
    const vectorScores = vectorSearch ? await vectorSearch(q.question) : null;
    const hits = search(q.question, { k: 10, vectorScores }).hits;
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
      `${routeOk ? "✓" : "✗"} ${q.id} [${got.kind}${cited ? ` ${cited}` : ""}] rank=${rank ?? "-"} ${got.meta.reason ?? ""}: ${q.question}`,
    );
    if (!routeOk || (rank ?? 1) > 3) console.log(`    candidates: ${got.meta.candidates.slice(0, 4).map((c) => `${c.id}(${c.coverage})`).join(" ")}`);
  }
  if (usesModel) await new Promise((r) => setTimeout(r, Number(process.env.EVAL_DELAY_MS ?? 4000))); // stay under the free tier rate limit
}

const answerable = rows.filter((r) => r.expected.articles);
const hitAt = (k: number) => answerable.filter((r) => r.rank !== undefined && r.rank <= k).length;
const mrr = answerable.reduce((s, r) => s + (r.rank ? 1 / r.rank : 0), 0) / answerable.length;
const routed = rows.filter((r) => usesModel || !r.needsModel);
const byKind = (kind: string) => routed.filter((r) => r.expected.kind === kind);
const pct = (a: number, b: number) => (b ? `${((100 * a) / b).toFixed(0)}% (${a}/${b})` : "-");
const citedRows = rows.filter((r) => r.citationOk !== undefined);
const falseAnswers = routed.filter((r) => r.expected.kind !== "answer" && r.got.kind === "answer");

const summary = [
  `# Eval, ${setName === "questions" ? "main set" : `${setName} set`} (${new Date().toISOString().slice(0, 10)})`,
  "",
  `- Model: \`${chat.name}/${chat.model}\``,
  `- Search: ${retrievalMode}${vectorSearch && embedder ? ` (embeddings ${modelKey(embedder)})` : ""}`,
  `- Questions: ${rows.length} (${answerable.length} with an expected article)${usesModel ? "" : `; ${rows.length - routed.length} need a model and are left out of routing`}`,
  "",
  "## Search: is the expected article found?",
  "",
  "| Metric | Value |",
  "|---|---|",
  `| Top-1 | ${pct(hitAt(1), answerable.length)} |`,
  `| Top-3 | ${pct(hitAt(3), answerable.length)} |`,
  `| Top-5 | ${pct(hitAt(5), answerable.length)} |`,
  `| MRR | ${mrr.toFixed(3)} |`,
  "",
  "## Routing: right kind of response?",
  "",
  "| Expected | Correct |",
  "|---|---|",
  ...(["answer", "off_topic", "not_covered", "not_found"] as const).map(
    (k) => `| ${k} | ${pct(byKind(k).filter((r) => r.routeOk).length, byKind(k).length)} |`,
  ),
  `| **Total** | **${pct(routed.filter((r) => r.routeOk).length, routed.length)}** |`,
  "",
  `Answered when it should have declined: **${falseAnswers.length}**`,
  "",
  "## Citations",
  "",
  `Answers citing an expected article: ${pct(citedRows.filter((r) => r.citationOk).length, citedRows.length)}`,
  "",
  `Average latency: ${Math.round(rows.reduce((s, r) => s + r.ms, 0) / rows.length)} ms`,
  "",
  "## Details",
  "",
  "| id | question | expected | got | rank | citations |",
  "|---|---|---|---|---|---|",
  ...rows.map((r) => {
    const cites = r.got.kind === "answer" ? r.got.citations.map((c) => c.id).join(", ") : "";
    const exp = r.expected.articles ? `${r.expected.kind}: ${r.expected.articles.join(" / ")}` : r.expected.kind;
    const skipped = !usesModel && r.needsModel ? " (skipped, needs a model)" : "";
    return `| ${r.id} | ${r.question} | ${exp} | ${r.routeOk ? "✓" : "✗"} ${r.got.kind}${skipped} | ${r.rank ?? "-"} | ${cites} |`;
  }),
  "",
].join("\n");

mkdirSync("eval/results", { recursive: true });
const file = `eval/results/${setName === "questions" ? "" : `${setName}-`}${chat.name}-${chat.model.replace(/[^\w.-]/g, "_")}-${retrievalMode}.md`;
writeFileSync(file, summary);
console.log(summary.split("## Details")[0]);
console.log(`Report: ${file}`);
await sql?.end();
