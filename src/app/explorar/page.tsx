import type { Metadata } from "next";
import Link from "next/link";
import { AREAS } from "@/config/laws";
import { vigenciaText } from "@/lib/format";
import { getLawSummaries } from "@/lib/laws-summary";

export const metadata: Metadata = { title: "Explorar leyes" };

export default function ExplorePage() {
  const laws = getLawSummaries();
  return (
    <section className="explore">
      <h1>Explorar las leyes</h1>
      <p className="lead">Leé el texto completo, organizado por títulos y capítulos, y buscá por palabra.</p>
      <div className="law-list">
        {laws.map((law) => {
          const area = AREAS.find((a) => a.id === law.area)!;
          return (
            <Link key={law.id} href={`/explorar/${law.id}`} className={`law-card area-${area.id}`}>
              <span>
                <strong>{law.name}</strong> (Ley {law.number})
                <span className="law-meta">
                  {law.articleCount} artículos vigentes. {vigenciaText(law)}.
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
