"use client";

import { CalendarDays, ChevronRight, CircleAlert, ExternalLink, Info, SearchX } from "lucide-react";
import type { ApiError, AskResult, CitedArticle, SourceInfo } from "@/lib/assistant/types";
import { vigenciaText } from "@/lib/format";

interface Props {
  result: AskResult | ApiError;
  onAsk: (question: string, context?: string) => void;
  question: string;
  disabled?: boolean;
}

export function ResultCard({ result, onAsk, question, disabled }: Props) {
  switch (result.kind) {
    case "answer":
      return (
        <article className="card answer" aria-label="Respuesta">
          <p className="answer-text">{result.answer}</p>

          <section className="citations" aria-label="Artículos citados">
            <h3 className="section-label">
              {result.citations.length === 1 ? "Artículo citado" : "Artículos citados"}
            </h3>
            {result.citations.map((c, i) => (
              <ArticleDetails key={c.id} article={c} open={i === 0 && result.citations.length === 1} />
            ))}
          </section>

          <Sources sources={result.sources} />

          {result.followUps.length > 0 && (
            <Suggestions
              label="También podés preguntar"
              items={result.followUps}
              onPick={(q) => onAsk(q, question)}
              disabled={disabled}
            />
          )}

          <p className="referral">{result.referral}</p>
          <MetaNote meta={result.meta} />
        </article>
      );

    case "off_topic":
      return (
        <article className="card notice">
          <p className="notice-title">
            <Info aria-hidden size={18} /> Esa pregunta no es sobre trabajo, compras ni tránsito
          </p>
          <p>{result.message}</p>
          <Suggestions items={result.suggestions} onPick={(q) => onAsk(q)} disabled={disabled} />
        </article>
      );

    case "not_covered":
      return (
        <article className="card notice">
          <p className="notice-title">
            <Info aria-hidden size={18} /> Las consultas sobre {result.topic} no están cubiertas
          </p>
          <p>{result.message}</p>
          <dl className="orientation">
            <dt>Dónde se regula</dt>
            <dd>{result.whereRegulated}</dd>
            <dt>A quién consultar</dt>
            <dd>{result.whereToAsk}</dd>
          </dl>
          <Suggestions label="Esto sí lo puedo responder" items={result.suggestions} onPick={(q) => onAsk(q)} disabled={disabled} />
        </article>
      );

    case "not_found":
      return (
        <article className="card notice">
          <p className="notice-title">
            <SearchX aria-hidden size={18} /> No encontré un artículo que responda eso
          </p>
          <p>{result.message}</p>
          <Suggestions items={result.suggestions} onPick={(q) => onAsk(q)} disabled={disabled} />
          {result.referral && <p className="referral">{result.referral}</p>}
        </article>
      );

    case "limit":
      return (
        <article className="card notice limit" role="status">
          <p className="notice-title">
            <CircleAlert aria-hidden size={18} /> Demo agotada por hoy
          </p>
          <p>{result.message}</p>
        </article>
      );

    case "error":
      return (
        <article className="card notice error" role="alert">
          <p>{result.message}</p>
        </article>
      );
  }
}

function ArticleDetails({ article, open }: { article: CitedArticle; open?: boolean }) {
  return (
    <details className="article" open={open}>
      <summary>
        <ChevronRight className="chevron" aria-hidden size={16} />
        <span className="article-label">{article.label}</span>
        {article.title && <span className="article-title">{article.title}</span>}
        <span className="article-law">
          {article.lawName} ({article.lawNumber})
        </span>
      </summary>
      <div className="article-body">
        {article.path.length > 0 && <p className="article-path">{article.path.join(" › ")}</p>}
        <blockquote cite={article.url}>
          {article.text.split("\n").map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </blockquote>
        {article.notes.length > 0 && (
          <ul className="article-notes" aria-label="Modificaciones">
            {article.notes.map((n, i) => (
              <li key={i}>{n.text}</li>
            ))}
          </ul>
        )}
        <a href={article.url} target="_blank" rel="noopener noreferrer" className="source-link">
          Ver texto completo en InfoLEG <ExternalLink aria-hidden size={14} />
        </a>
      </div>
    </details>
  );
}

function Sources({ sources }: { sources: SourceInfo[] }) {
  return (
    <ul className="sources">
      {sources.map((s) => (
        <li key={s.lawId}>
          <CalendarDays aria-hidden size={14} /> {s.lawName}: {vigenciaText(s)}
        </li>
      ))}
    </ul>
  );
}

function Suggestions({
  items,
  onPick,
  label,
  disabled,
}: {
  items: string[];
  onPick: (q: string) => void;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <div className="suggestions">
      {label && <h3 className="section-label">{label}</h3>}
      <div className="chips">
        {items.map((q) => (
          <button key={q} type="button" className="chip" onClick={() => onPick(q)} disabled={disabled}>
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

function MetaNote({ meta }: { meta: AskResult["meta"] }) {
  if (meta.provider !== "mock") return null;
  return (
    <p className="meta-note">
      No hay un modelo de IA configurado, así que la respuesta es la cita del artículo que más coincide.
    </p>
  );
}

