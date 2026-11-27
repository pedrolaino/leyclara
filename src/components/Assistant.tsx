"use client";

import { Briefcase, ShoppingBag, TrafficCone, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AREAS, type AreaId } from "@/config/laws";
import type { ApiError, AskResult } from "@/lib/assistant/types";
import type { LawSummary } from "@/lib/format";
import type { HomeExample } from "@/lib/home-example";
import { HOME_EVENT } from "./HomeLink";
import { ExampleSheet, ResultSheet } from "./AnswerSheet";
import { useTurnstile } from "./useTurnstile";

const AREA_ICONS: Record<AreaId, LucideIcon> = {
  trabajo: Briefcase,
  consumo: ShoppingBag,
  transito: TrafficCone,
};

// The counter only shows up near the limit
const COUNTER_FROM = 50;

interface Turn {
  id: number;
  question: string;
  result?: AskResult | ApiError;
}

interface Props {
  laws: LawSummary[];
  maxChars: number;
  turnstileSiteKey?: string;
  title: React.ReactNode;
  lead: string;
  example: HomeExample;
}

export function Assistant({ laws, maxChars, turnstileSiteKey, title, lead, example }: Props) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const nextId = useRef(1);
  const stageRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { getToken, container } = useTurnstile(turnstileSiteKey);

  const restart = useCallback(() => {
    setTurns([]);
    setInput("");
    window.scrollTo({ top: 0 });
  }, []);

  useEffect(() => {
    window.addEventListener(HOME_EVENT, restart);
    return () => window.removeEventListener(HOME_EVENT, restart);
  }, [restart]);

  // On phones the answer is below the form, so bring it into view.
  const showStage = useCallback(() => {
    const top = stageRef.current?.getBoundingClientRect().top;
    if (top !== undefined && (top < 0 || top > window.innerHeight * 0.6)) {
      stageRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const ask = useCallback(
    async (question: string, context?: string) => {
      const q = question.trim();
      if (loading) return;
      if (!q) return inputRef.current?.focus();
      const id = nextId.current++;
      setTurns((t) => [...t, { id, question: q }]);
      setInput("");
      setLoading(true);
      requestAnimationFrame(showStage);
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
    },
    [loading, getToken, showStage],
  );

  // The FAQ fills in the form, so the question can be edited before asking.
  const pick = (question: string) => {
    setInput(question);
    inputRef.current?.focus({ preventScroll: true });
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const started = turns.length > 0;
  const left = maxChars - input.length;
  const newestFirst = [...turns].reverse();

  return (
    <>
      <section className="hero" aria-labelledby="page-title">
        <div className={`wrap hero-layout ${started ? "started" : ""}`}>
          <div className="hero-copy">
            <h1 id="page-title">{title}</h1>
            <p className="hero-lead">{lead}</p>

            <form
              ref={formRef}
              className="ask-form"
              onSubmit={(e) => {
                e.preventDefault();
                ask(input);
              }}
            >
              <div className="composer">
                <label htmlFor="question">Contá qué te pasó</label>
                <textarea
                  id="question"
                  ref={inputRef}
                  value={input}
                  maxLength={maxChars}
                  rows={2}
                  placeholder="Ej.: compré por internet y me arrepentí."
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      ask(input);
                    }
                  }}
                />
                <div className="form-actions">
                  <span className="counter" aria-live="polite" hidden={left > COUNTER_FROM}>
                    {left === 1 ? "Queda 1 carácter" : `Quedan ${left} caracteres`}
                  </span>
                  {started && (
                    <button type="button" className="ghost" onClick={restart} disabled={loading}>
                      Volver al inicio
                    </button>
                  )}
                  <button type="submit" className="primary" disabled={loading}>
                    {loading ? "Buscando…" : "Consultar"}
                  </button>
                </div>
              </div>
              {container}
            </form>
          </div>

          <div className="stage" ref={stageRef} aria-live="polite">
            {started ? (
              newestFirst.map((turn, i) => (
                <div key={turn.id} className="turn">
                  {i === 0 && <div className="sheet-tab">Tu consulta</div>}
                  <ResultSheet turn={turn} onAsk={ask} disabled={loading} />
                </div>
              ))
            ) : (
              <>
                <div className="sheet-tab">Ejemplo</div>
                <ExampleSheet example={example} />
              </>
            )}
          </div>
        </div>
      </section>

      <section className="topics" id="preguntas" aria-labelledby="topics-title">
        <div className="wrap">
          <h2 id="topics-title">Preguntas frecuentes</h2>
          <div className="topics-grid">
            {AREAS.map((area) => {
              const law = laws.find((l) => l.id === area.lawIds[0]);
              const Icon = AREA_ICONS[area.id];
              return (
                <section key={area.id} className="topic" aria-labelledby={`topic-${area.id}`}>
                  <div className="topic-heading">
                    <Icon className="icon" aria-hidden size={22} strokeWidth={1.7} />
                    <h3 id={`topic-${area.id}`}>{area.title}</h3>
                    {law && (
                      <Link href={`/explorar/${law.id}`} className="law-number" title={`Leer la ${law.name}`}>
                        Ley {law.number}
                      </Link>
                    )}
                  </div>
                  <ul>
                    {area.examples.map((q) => (
                      <li key={q}>
                        <button type="button" className="question-link" onClick={() => pick(q)}>
                          {q}
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
