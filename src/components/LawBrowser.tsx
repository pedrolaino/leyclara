"use client";

import { ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { normalize } from "@/lib/retrieval/text";
import type { Article } from "@/lib/types";

/** Índice por títulos/capítulos + buscador por palabra dentro de una ley. */
export function LawBrowser({ articles }: { articles: Article[] }) {
  const [query, setQuery] = useState("");
  const index = useMemo(
    () => articles.map((a) => normalize(`${a.label} ${a.title ?? ""} ${a.text}`)),
    [articles],
  );

  const words = normalize(query).split(" ").filter((w) => w.length > 2);
  const visible = words.length
    ? articles.filter((_, i) => words.every((w) => index[i].includes(w)))
    : articles;

  // Agrupar por la ubicación (título › capítulo) para el índice.
  const groups: { path: string; items: Article[] }[] = [];
  for (const a of visible) {
    const path = a.path.join(" › ") || "Disposiciones";
    const last = groups.at(-1);
    if (last?.path === path) last.items.push(a);
    else groups.push({ path, items: [a] });
  }

  return (
    <div className="law-browser">
      <input
        type="search"
        className="law-search"
        placeholder="Buscar en esta ley (por ejemplo: vacaciones, garantía, velocidad)"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Buscar en esta ley"
      />
      <p className="muted small">
        {words.length ? `${visible.length} artículos encontrados` : `${articles.length} artículos`}
      </p>
      {groups.map((g, gi) => (
        <section key={`${g.path}-${gi}`} className="law-group">
          <h2>{g.path}</h2>
          {g.items.map((a) => (
            <details key={a.id} id={a.id} className={`article ${a.repealed ? "repealed" : ""}`} open={words.length > 0 && visible.length <= 3}>
              <summary>
                <ChevronRight className="chevron" aria-hidden size={16} />
                <span className="article-label">{a.label}</span>
                {a.title && <span className="article-title">{a.title}</span>}
                {a.repealed && <span className="tag">Derogado</span>}
              </summary>
              <div className="article-body">
                <blockquote>
                  {(a.text || "Sin texto vigente.").split("\n").map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </blockquote>
                {a.notes.length > 0 && (
                  <ul className="article-notes">
                    {a.notes.map((n, i) => (
                      <li key={i}>{n.text}</li>
                    ))}
                  </ul>
                )}
              </div>
            </details>
          ))}
        </section>
      ))}
    </div>
  );
}
