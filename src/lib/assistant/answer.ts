// Answer pipeline. If no relevant article is found, the LLM is never called.
import { AREAS, type AreaId, areaById, LAWS } from "@/config/laws";
import type { ChatProvider } from "@/lib/ai/types";
import { normalize } from "@/lib/retrieval/text";
import { type ArticleHit, search } from "@/lib/retrieval/search";
import type { VectorSearch } from "@/lib/retrieval/vector";
import { AREA_HINTS, EXPANSIONS, UNCOVERED_TOPICS, type UncoveredTopic } from "@/lib/scope/lexicon";
import { buildUserPrompt, RESPONSE_SCHEMA, SYSTEM_PROMPT } from "./prompt";
import type { AskResult, CitedArticle, SourceInfo } from "./types";

export interface Thresholds {
  minCoverage: number;
  // Stricter when nothing in the question points to one of the three areas
  minCoverageNoArea: number;
  // Only with embeddings. Tune it with npm run eval.
  minCosine: number;
  maxArticles: number;
}

export const DEFAULT_THRESHOLDS: Thresholds = {
  minCoverage: 0.2,
  minCoverageNoArea: 0.5,
  minCosine: 0.6,
  maxArticles: 5,
};

export interface AnswerDeps {
  chat: ChatProvider;
  vectorSearch?: VectorSearch | null;
  maxAnswerChars: number;
  maxOutputTokens: number;
  thresholds?: Partial<Thresholds>;
}

export function detectAreas(question: string): AreaId[] {
  const n = normalize(question);
  const areas = new Set<AreaId>();
  for (const e of EXPANSIONS) if (e.pattern.test(n)) areas.add(e.area);
  for (const [area, re] of Object.entries(AREA_HINTS)) if (re.test(n)) areas.add(area as AreaId);
  return [...areas];
}

export function detectUncovered(question: string): UncoveredTopic | undefined {
  const n = normalize(question);
  return UNCOVERED_TOPICS.find((t) => t.pattern.test(n));
}

export function isRelevant(hit: ArticleHit, hasArea: boolean, t: Thresholds): boolean {
  if (hit.cosine !== undefined && hit.cosine >= t.minCosine) return true;
  return hit.coverage >= (hasArea ? t.minCoverage : t.minCoverageNoArea);
}

export async function answerQuestion(question: string, deps: AnswerDeps, context?: string): Promise<AskResult> {
  const t = { ...DEFAULT_THRESHOLDS, ...deps.thresholds };
  const meta = (extra: Partial<AskResult["meta"]> = {}): AskResult["meta"] => ({
    retrieval: "skipped",
    candidates: [],
    provider: deps.chat.name,
    model: deps.chat.model,
    ...extra,
  });

  const areas = detectAreas(`${question} ${context ?? ""}`);
  const uncovered = detectUncovered(question);

  // Uncovered legal topic: no need to search.
  if (uncovered && (areas.length === 0 || uncovered.exclusive)) {
    return notCovered(uncovered, meta({ reason: "uncovered-topic" }));
  }

  const vectorScores = deps.vectorSearch ? await deps.vectorSearch(context ? `${context}\n${question}` : question) : null;
  const result = search(question, { context, vectorScores, k: 8 });
  const candidates = result.hits.map((h) => ({
    id: h.article.id,
    score: round(h.score),
    coverage: round(h.coverage),
    cosine: h.cosine === undefined ? undefined : round(h.cosine),
  }));
  const m = (reason: string) => meta({ retrieval: result.mode, candidates, reason });

  const relevant = result.hits.filter((h) => isRelevant(h, areas.length > 0, t)).slice(0, t.maxArticles);

  // No source, no LLM call.
  if (relevant.length === 0) {
    if (uncovered) return notCovered(uncovered, m("uncovered-topic"));
    if (areas.length) return notFound(areas[0], m("no-relevant-articles"));
    return offTopic(m("no-relevant-articles"));
  }

  const allowed = new Map(relevant.map((h) => [h.article.id, h]));
  const raw = (await deps.chat.generateJson({
    system: SYSTEM_PROMPT,
    user: buildUserPrompt(question, relevant, context),
    schema: RESPONSE_SCHEMA,
    maxOutputTokens: deps.maxOutputTokens,
    temperature: 0.1,
    mockResponse: () => extractiveAnswer(relevant[0]),
  })) as Partial<{ status: string; answer: string; citations: string[]; follow_ups: string[] }>;

  const cited = (Array.isArray(raw.citations) ? raw.citations : [])
    .map((id) => String(id).trim())
    .filter((id, i, arr) => allowed.has(id) && arr.indexOf(id) === i)
    .slice(0, 3);

  if (raw.status === "off_topic") return offTopic(m("model-off-topic"));
  // Drop the answer if it doesn't cite any of the articles we gave it.
  if (raw.status !== "answered" || !raw.answer?.trim() || cited.length === 0) {
    const reason = raw.status === "answered" ? "no-valid-citations" : "model-not-found";
    if (uncovered) return notCovered(uncovered, m(reason));
    const area = relevant[0].law.area;
    return notFound(area, m(reason));
  }

  const hits = cited.map((id) => allowed.get(id)!);
  const area = hits[0].law.area;
  return {
    kind: "answer",
    answer: truncateAtSentence(raw.answer.trim(), deps.maxAnswerChars),
    citations: hits.map(toCited),
    sources: uniqueSources(hits),
    followUps: sanitizeFollowUps(raw.follow_ups, area, question),
    area,
    referral: areaById(area).referral,
    meta: m("answered"),
  };
}

function toCited(h: ArticleHit): CitedArticle {
  return {
    id: h.article.id,
    lawId: h.law.id,
    lawName: h.law.name,
    lawNumber: h.law.number,
    label: h.article.label,
    title: h.article.title,
    path: h.article.path,
    text: h.article.text,
    notes: h.article.notes,
    url: h.law.textUrl,
  };
}

function uniqueSources(hits: ArticleHit[]): SourceInfo[] {
  const seen = new Map<string, SourceInfo>();
  for (const { law } of hits) {
    if (seen.has(law.id)) continue;
    seen.set(law.id, {
      lawId: law.id,
      lawName: law.name,
      lawNumber: law.number,
      retrievedAt: law.retrievedAt,
      lastAmendment: law.lastAmendment,
      url: law.textUrl,
    });
  }
  return [...seen.values()];
}

// Used by the mock provider: quotes the start of the best article.
function extractiveAnswer(hit: ArticleHit) {
  const lines = hit.article.text.split("\n");
  let quote = /^(.{40,400}?[.;])(\s|$)/.exec(lines[0])?.[1] ?? lines[0].slice(0, 400);
  // If it ends in ":", add the items that follow.
  if (quote.endsWith(":")) {
    for (const l of lines.slice(1)) {
      if (quote.length + l.length > 450) break;
      quote += ` ${l}`;
    }
  }
  return {
    status: "answered",
    answer: `Según el ${hit.article.label.replace("Art.", "artículo")} de la ${hit.law.name}: "${quote}"`,
    citations: [hit.article.id],
    follow_ups: [],
  };
}

export function sanitizeFollowUps(raw: unknown, area: AreaId, question: string): string[] {
  const q = normalize(question);
  const fromModel = (Array.isArray(raw) ? raw : [])
    .map((s) => String(s).replace(/\s+/g, " ").trim())
    .filter((s) => s.length >= 8 && s.length <= 140 && normalize(s) !== q)
    .map((s) => (/[?¿]/.test(s) ? s : `${s}?`).replace(/^([^¿])(.*\?)$/, "¿$1$2"));
  const fallback = areaById(area).examples.filter((e) => normalize(e) !== q);
  return [...new Set([...fromModel, ...fallback])].slice(0, 3);
}

export function truncateAtSentence(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf(".\n"));
  return end > max * 0.5 ? cut.slice(0, end + 1) : `${cut.trimEnd()}…`;
}

const round = (x: number) => Math.round(x * 1000) / 1000;

const allExamples = () => AREAS.map((a) => a.examples[0]);

export function offTopic(meta: AskResult["meta"]): AskResult {
  return {
    kind: "off_topic",
    message: "Respondo sobre derechos en el trabajo, en compras y en tránsito. Por ejemplo:",
    suggestions: allExamples(),
    meta,
  };
}

export function notCovered(topic: UncoveredTopic, meta: AskResult["meta"]): AskResult {
  return {
    kind: "not_covered",
    topic: topic.label,
    message: `Acá solo están cargadas la ${LAWS.map((l) => l.name).join(", la ").replace(/, la ([^,]+)$/, " y la $1")}.`,
    whereRegulated: topic.whereRegulated,
    whereToAsk: topic.whereToAsk,
    suggestions: allExamples(),
    meta,
  };
}

export function notFound(area: AreaId, meta: AskResult["meta"]): AskResult {
  const a = areaById(area);
  return {
    kind: "not_found",
    message:
      "Sin un artículo que lo respalde, prefiero no responder. Probá contando tu caso con más detalle o con alguna de estas preguntas:",
    area,
    referral: a.referral,
    suggestions: a.examples.slice(0, 3),
    meta,
  };
}
