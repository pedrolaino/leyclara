import type { AreaId } from "@/config/laws";
import type { AmendmentNote } from "@/lib/types";

// The text is always the official one, never generated.
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

export interface SourceInfo {
  lawId: string;
  lawName: string;
  lawNumber: string;
  retrievedAt: string;
  lastAmendment?: { date: string; text: string };
  url: string;
}

interface Base {
  // Debug info, used by the eval
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

export type ApiError = { kind: "error" | "limit"; message: string };
