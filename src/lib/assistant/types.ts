import type { AreaId } from "@/config/laws";
import type { AmendmentNote } from "@/lib/types";

/** Artículo citado tal como lo ve el usuario: el texto es el oficial, nunca generado. */
export interface CitedArticle {
  id: string;
  lawId: string;
  lawName: string;
  lawNumber: string;
  label: string;
  title?: string;
  path: string[];
  text: string;
  notes: AmendmentNote[];
  url: string;
}

/** "Texto vigente al ..." de cada ley usada en la respuesta. */
export interface SourceInfo {
  lawId: string;
  lawName: string;
  lawNumber: string;
  retrievedAt: string;
  lastAmendment?: { date: string; text: string };
  url: string;
}

interface Base {
  /** Datos de diagnóstico (para evaluación y para mostrar "cómo se respondió"). */
  meta: {
    retrieval: "lexical" | "hybrid" | "skipped";
    candidates: { id: string; score: number; coverage: number; cosine?: number }[];
    provider: string;
    model: string;
    cached?: boolean;
    reason?: string;
  };
}

export type AskResult =
  | (Base & {
      kind: "answer";
      answer: string;
      citations: CitedArticle[];
      sources: SourceInfo[];
      followUps: string[];
      area: AreaId;
      referral: string;
    })
  | (Base & { kind: "off_topic"; message: string; suggestions: string[] })
  | (Base & {
      kind: "not_covered";
      topic: string;
      message: string;
      whereRegulated: string;
      whereToAsk: string;
      suggestions: string[];
    })
  | (Base & { kind: "not_found"; message: string; area?: AreaId; referral?: string; suggestions: string[] });

/** Respuestas de la API que no salen del pipeline (validación, cupo, captcha). */
export type ApiError = { kind: "error" | "limit"; message: string };
