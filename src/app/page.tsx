import { Assistant } from "@/components/Assistant";
import { SITE_TAGLINE } from "@/config/site";
import { getEnv } from "@/lib/env";
import { getLawSummaries } from "@/lib/laws-summary";

export default function Home() {
  const laws = getLawSummaries();
  const env = getEnv();
  const intro = (
    <section className="hero">
      <h1>Consultá qué dice la ley sobre tu caso</h1>
      <p className="lead">{SITE_TAGLINE}</p>
      <p className="sources-line">
        Las respuestas salen del texto actualizado de la Ley de Contrato de Trabajo, la Ley de Defensa del Consumidor
        y la Ley Nacional de Tránsito publicado en InfoLEG.
      </p>
    </section>
  );
  return (
    <Assistant
      laws={laws}
      intro={intro}
      maxChars={env.limits.maxQuestionChars}
      turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || undefined}
    />
  );
}
