import { ChevronLeft, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LAWS } from "@/config/laws";
import { LawBrowser } from "@/components/LawBrowser";
import { vigenciaText } from "@/lib/format";
import { loadLaws } from "@/lib/retrieval/corpus";

type Params = { params: Promise<{ ley: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { ley } = await params;
  const law = LAWS.find((l) => l.id === ley);
  return { title: law ? `${law.name} (${law.number})` : "Ley" };
}

export default async function LawPage({ params }: Params) {
  const { ley } = await params;
  const law = loadLaws().find((l) => l.id === ley);
  if (!law) notFound();
  return (
    <section className="explore">
      <p className="crumbs">
        <Link href="/explorar">
          <ChevronLeft aria-hidden size={14} /> Todas las leyes
        </Link>
      </p>
      <h1>
        {law.name} <span className="muted">(Ley {law.number})</span>
      </h1>
      <p className="lead small">
        {vigenciaText(law)}.{" "}
        <a href={law.pageUrl} target="_blank" rel="noopener noreferrer">
          Ver en InfoLEG <ExternalLink aria-hidden size={14} />
        </a>
      </p>
      <LawBrowser articles={law.articles.filter((a) => !a.formal)} />
    </section>
  );
}
