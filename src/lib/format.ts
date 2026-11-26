// "2026-03-06" -> "6/3/2026", without going through Date and time zones.
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d}/${m}/${y}`;
}

export interface LawSummary {
  id: string;
  name: string;
  number: string;
  shortName: string;
  area: string;
  retrievedAt: string;
  lastAmendment?: { date: string; text: string };
  pageUrl: string;
  textUrl: string;
  articleCount: number;
}

export function vigenciaText(law: Pick<LawSummary, "retrievedAt" | "lastAmendment">): string {
  const base = `Texto vigente según InfoLEG al ${formatDate(law.retrievedAt)}`;
  return law.lastAmendment
    ? `${base}. Última modificación incorporada: ${law.lastAmendment.text} (B.O. ${formatDate(law.lastAmendment.date)})`
    : base;
}
