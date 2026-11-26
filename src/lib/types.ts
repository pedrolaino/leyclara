import type { AreaId } from "@/config/laws";

export interface AmendmentNote {
  text: string;
  // Boletín Oficial date, yyyy-mm-dd
  date?: string;
}

export interface Article {
  // "lct-245", "ldc-10bis"
  id: string;
  lawId: string;
  number: string;
  label: string;
  title?: string;
  // ["Título XII: De la extinción...", "Capítulo IV: ..."]
  path: string[];
  text: string;
  notes: AmendmentNote[];
  // Repealed or vetoed articles are never used as a source.
  repealed: boolean;
  // "Comuníquese al Poder Ejecutivo" and similar, not indexed.
  formal: boolean;
}

export interface LawDocument {
  id: string;
  area: AreaId;
  number: string;
  name: string;
  shortName: string;
  textUrl: string;
  pageUrl: string;
  heading: string;
  // When the text was downloaded from InfoLEG
  retrievedAt: string;
  lastAmendment?: { date: string; text: string };
  articles: Article[];
}
