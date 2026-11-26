import type { AreaId } from "@/config/laws";

/** Nota de InfoLEG sobre modificaciones: "(Artículo sustituido por art. 1º de la Ley Nº 27.802 B.O. 6/3/2026...)". */
export interface AmendmentNote {
  text: string;
  /** Fecha de publicación en el Boletín Oficial, ISO (yyyy-mm-dd), si se pudo leer. */
  date?: string;
}

export interface Article {
  /** Id único y estable: "lct-245", "ldc-10bis", "lnt-48". */
  id: string;
  lawId: string;
  /** "245", "10 bis". */
  number: string;
  /** Etiqueta para mostrar: "Art. 245". */
  label: string;
  /** Epígrafe del artículo, si tiene ("Indemnización por antigüedad o despido"). */
  title?: string;
  /** Ubicación en la ley: ["Título XII — De la extinción del contrato de trabajo", "Capítulo IV — ..."]. */
  path: string[];
  /** Texto oficial del artículo, sin las notas de modificación. */
  text: string;
  notes: AmendmentNote[];
  /** Derogado, vetado u observado en su totalidad: no se usa como fuente. */
  repealed: boolean;
  /** Artículo de forma ("Comuníquese al Poder Ejecutivo"): no se indexa. */
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
  /** Encabezado oficial del texto ("LEY N° 20.744 - TEXTO ORDENADO POR DECRETO 390/1976"). */
  heading: string;
  /** Fecha en que se descargó el texto actualizado de InfoLEG (ISO). */
  retrievedAt: string;
  /** Modificación más reciente incorporada al texto, según las notas de InfoLEG. */
  lastAmendment?: { date: string; text: string };
  articles: Article[];
}
