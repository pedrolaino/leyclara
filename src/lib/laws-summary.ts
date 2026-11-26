import "server-only";
import type { LawSummary } from "@/lib/format";
import { loadLaws } from "@/lib/retrieval/corpus";

export function getLawSummaries(): LawSummary[] {
  return loadLaws().map((l) => ({
    id: l.id,
    name: l.name,
    number: l.number,
    shortName: l.shortName,
    area: l.area,
    retrievedAt: l.retrievedAt,
    lastAmendment: l.lastAmendment,
    pageUrl: l.pageUrl,
    textUrl: l.textUrl,
    articleCount: l.articles.filter((a) => !a.repealed && !a.formal).length,
  }));
}
