"use client";

import { Briefcase, ShoppingBag, TrafficCone, type LucideIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AREAS, type AreaId } from "@/config/laws";
import type { ApiError, AskResult } from "@/lib/assistant/types";
import type { LawSummary } from "@/lib/format";
import { formatDate } from "@/lib/format";
import { HOME_EVENT } from "./HomeLink";
import { ResultCard } from "./ResultCard";
import { useTurnstile } from "./useTurnstile";

const AREA_ICONS: Record<AreaId, LucideIcon> = {
  trabajo: Briefcase,
  consumo: ShoppingBag,
  transito: TrafficCone,
};

interface Turn {
  id: number;
  question: string;
  result?: AskResult | ApiError;
}

interface Props {
  laws: LawSummary[];
  maxChars: number;
  turnstileSiteKey?: string;
  // Shown until the first question
  intro?: React.ReactNode;
}

export function Assistant({ laws, maxChars, turnstileSiteKey, intro }: Props) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const nextId = useRef(1);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { getToken, container } = useTurnstile(turnstileSiteKey);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns]);

  const restart = useCallback(() => {
    setTurns([]);
    window.scrollTo({ top: 0 });
  }, []);

  useEffect(() => {
    window.addEventListener(HOME_EVENT, restart);
    return () => window.removeEventListener(HOME_EVENT, restart);
  }, [restart]);

  const ask = useCallback(
    async (question: string, context?: string) => {
      const q = question.trim();
      if (!q || loading) return;
      const id = nextId.current++;
      setTurns((t) => [...t, { id, question: q }]);
      setInput("");
      setLoading(true);
      let result: AskResult | ApiError;
      try {
        const captchaToken = await getToken();
        const res = await fetch("/api/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: q, context, captchaToken }),
        });
        result = await res.json();
      } catch {
        result = { kind: "error", message: "No se pudo conectar. Revisá tu conexión y probá de nuevo." };
      }
      setTurns((t) => t.map((turn) => (turn.id === id ? { ...turn, result } : turn)));
      setLoading(false);
      inputRef.current?.focus();
    },
    [loading, getToken],
  );

  const lawFor = (lawId: string) => laws.find((l) => l.id === lawId);
  const started = turns.length > 0;

  return (
    <div className={`assistant ${started ? "started" : ""}`}>
      {!started && intro}
      {!started && (
        <section className="areas" aria-label="Temas que cubre el asistente">
          {AREAS.map((area) => {
            const law = lawFor(area.lawIds[0]);
            const Icon = AREA_ICONS[area.id];
            return (
              <div key={area.id} className={`area-card area-${area.id}`}>
                <div className="area-head">
                  <Icon className="area-icon" aria-hidden size={24} strokeWidth={1.75} />
                  <h2>{area.title}</h2>
                  <p className="area-subtitle">{area.subtitle}</p>
                </div>
                <ul className="examples">
                  {area.examples.map((q) => (
                    <li key={q}>
                      <button type="button" onClick={() => ask(q)} disabled={loading}>
                        {q}
                      </button>
                    </li>
                  ))}
                </ul>
                {law && (
                  <p className="area-law">
                    Ley {law.number}, texto vigente al {formatDate(law.retrievedAt)}
                  </p>
                )}
              </div>
            );
          })}
        </section>
      )}

      {started && (
        <section className="conversation" aria-live="polite">
          {turns.map((turn) => (
            <div key={turn.id} className="turn">
              <p className="question-bubble">
                <span>{turn.question}</span>
              </p>
              {turn.result ? (
                <ResultCard result={turn.result} onAsk={ask} question={turn.question} disabled={loading} />
              ) : (
                <div className="card loading" role="status">
                  <span className="dots" aria-hidden>
                    <i />
                    <i />
                    <i />
                  </span>
                  Buscando en las leyes…
                </div>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </section>
      )}

      <form
        className="ask-form"
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
      >
        <label htmlFor="question" className="visually-hidden">
          Tu pregunta
        </label>
        <textarea
          id="question"
          ref={inputRef}
          value={input}
          maxLength={maxChars}
          rows={2}
          placeholder={started ? "Escribí otra pregunta" : "O escribí tu caso, por ejemplo: «trabajo hace 3 años y me echaron»"}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              ask(input);
            }
          }}
        />
        <div className="form-row">
          <span className={`counter ${input.length > maxChars * 0.9 ? "warn" : ""}`}>
            {input.length}/{maxChars}
          </span>
          {started && (
            <button
              type="button"
              className="ghost"
              onClick={restart}
              disabled={loading}
            >
              Volver al inicio
            </button>
          )}
          <button type="submit" className="primary" disabled={loading || input.trim().length === 0}>
            {loading ? "Buscando…" : "Preguntar"}
          </button>
        </div>
        {container}
      </form>
    </div>
  );
}
