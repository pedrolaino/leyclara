import { Assistant } from "@/components/Assistant";
import { SITE_TAGLINE } from "@/config/site";
import { getEnv } from "@/lib/env";
import { getLawSummaries } from "@/lib/laws-summary";

export default function Home() {
  const laws = getLawSummaries();
  const env = getEnv();
  const intro = (
    <section className="hero">
      <h1>¿Qué dice la ley sobre tu situación?</h1>
      <p className="lead">{SITE_TAGLINE}</p>
      <ul className="badges" aria-label="Características">
        <li>Basado en el texto oficial de InfoLEG</li>
        <li>Cita el artículo exacto</li>
        <li>Si no hay fuente, no inventa</li>
      </ul>
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
