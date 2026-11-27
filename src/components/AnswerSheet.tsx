"use client";

import { ChevronDown, CircleAlert, Info, SearchX } from "lucide-react";
import type { ApiError, AskResult, CitedArticle, SourceInfo } from "@/lib/assistant/types";
import { articleName, vigenciaText } from "@/lib/format";
import type { HomeExample } from "@/lib/home-example";

interface Turn {
  question: string;
  result?: AskResult | ApiError;
}

type OnAsk = (question: string, context?: string) => void;

export function ExampleSheet({ example }: { example: HomeExample }) {
  const { answer, quote } = example;
  return (
    <article className="answer-sheet" aria-label="Ejemplo de respuesta">
      <h2>{example.question}</h2>
      <p className="answer-copy">
        {answer.before}
        <strong>{answer.strong}</strong>
        {answer.after}
      </p>
      <details className="source" open>
        <summary>
          <span className="source-title">{example.article}</span>
          <span className="source-law">{example.law}</span>
          <ChevronDown className="chevron" aria-hidden size={17} />
        </summary>
        <blockquote className="quote">
          «{quote.before}
          <mark>{quote.mark}</mark>
          {quote.after}».
        </blockquote>
        <a className="source-link" href={example.url} target="_blank" rel="noopener noreferrer">
          Ver la ley en InfoLEG
        </a>
      </details>
    </article>
  );
}

export function ResultSheet({ turn, onAsk, disabled }: { turn: Turn; onAsk: OnAsk; disabled?: boolean }) {
  const { question, result } = turn;

  if (!result) {
    return (
      <article className="answer-sheet" aria-busy="true">
        <h2>{question}</h2>
        <p className="loading" role="status">
          <span className="dots" aria-hidden>
            <i />
            <i />
            <i />
          </span>
          Buscando en las leyes…
        </p>
      </article>
    );
  }

  switch (result.kind) {
    case "answer":
      return (
        <article className="answer-sheet" aria-label="Respuesta">
          <h2>{question}</h2>
          <p className="answer-copy">{result.answer}</p>
          {result.citations.map((c, i) => (
            <ArticleDetails key={c.id} article={c} open={i === 0} />
          ))}
          {result.followUps.length > 0 && (
            <Suggestions
              label="También podés preguntar"
              items={result.followUps}
              onPick={(q) => onAsk(q, question)}
              disabled={disabled}
            />
          )}
          <div className="sheet-notes">
            <Sources sources={result.sources} />
            <p>{result.referral}</p>
            <MetaNote meta={result.meta} />
          </div>
        </article>
      );

    case "off_topic":
      return (
        <Notice question={question} icon={<Info aria-hidden size={18} />} title="Esa pregunta no es sobre trabajo, compras ni tránsito">
          <p>{result.message}</p>
          <Suggestions items={result.suggestions} onPick={(q) => onAsk(q)} disabled={disabled} />
        </Notice>
      );

    case "not_covered":
      return (
        <Notice question={question} icon={<Info aria-hidden size={18} />} title={`Las consultas sobre ${result.topic} no están cubiertas`}>
          <p>{result.message}</p>
          <dl className="orientation">
            <dt>Dónde se regula</dt>
            <dd>{result.whereRegulated}</dd>
            <dt>A quién consultar</dt>
            <dd>{result.whereToAsk}</dd>
          </dl>
          <Suggestions label="Esto sí lo puedo responder" items={result.suggestions} onPick={(q) => onAsk(q)} disabled={disabled} />
        </Notice>
      );

    case "not_found":
      return (
        <Notice question={question} icon={<SearchX aria-hidden size={18} />} title="No encontré un artículo que responda eso">
          <p>{result.message}</p>
          <Suggestions items={result.suggestions} onPick={(q) => onAsk(q)} disabled={disabled} />
          {result.referral && <p className="sheet-notes">{result.referral}</p>}
        </Notice>
      );

    case "limit":
      return (
        <Notice question={question} icon={<CircleAlert aria-hidden size={18} />} title="Demo agotada por hoy" role="status">
          <p>{result.message}</p>
        </Notice>
      );

    case "error":
      return (
        <Notice question={question} icon={<CircleAlert aria-hidden size={18} />} title="No pudimos responder" role="alert" tone="error">
          <p>{result.message}</p>
        </Notice>
      );
  }
}

function Notice({
  question,
  icon,
  title,
  role,
  tone,
  children,
}: {
  question: string;
  icon: React.ReactNode;
  title: string;
  role?: "status" | "alert";
  tone?: "error";
  children: React.ReactNode;
}) {
  return (
    <article className={`answer-sheet notice ${tone ?? ""}`} role={role}>
      <h2>{question}</h2>
      <p className="notice-title">
        {icon} {title}
      </p>
      {children}
    </article>
  );
}

function ArticleDetails({ article, open }: { article: CitedArticle; open?: boolean }) {
  return (
    <details className="source" open={open}>
      <summary>
        <span className="source-title">{articleName(article.label)}</span>
        <span className="source-law">Ley {article.lawNumber}</span>
        <ChevronDown className="chevron" aria-hidden size={17} />
      </summary>
      {(article.title || article.path.length > 0) && (
        <p className="source-context">
          {article.title && <strong>{article.title}</strong>}
          {article.path.length > 0 && <span>{article.path.join(" › ")}</span>}
        </p>
      )}
      <blockquote className="article-text" cite={article.url}>
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
        Ver la ley en InfoLEG
      </a>
    </details>
  );
}

function Sources({ sources }: { sources: SourceInfo[] }) {
  return (
    <ul className="sources">
      {sources.map((s) => (
        <li key={s.lawId}>
          {s.lawName}: {vigenciaText(s)}.
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
      {label && <h3>{label}</h3>}
      <ul>
        {items.map((q) => (
          <li key={q}>
            <button type="button" className="question-link" onClick={() => onPick(q)} disabled={disabled}>
              {q}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MetaNote({ meta }: { meta: AskResult["meta"] }) {
  if (meta.provider !== "mock") return null;
  return <p>No hay un modelo de IA configurado, así que la respuesta es la cita del artículo que más coincide.</p>;
}
