import { Assistant } from "@/components/Assistant";
import { SITE_LEAD } from "@/config/site";
import { getEnv } from "@/lib/env";
import { getHomeExample } from "@/lib/home-example";
import { getLawSummaries } from "@/lib/laws-summary";

export default function Home() {
  const env = getEnv();
  return (
    <Assistant
      laws={getLawSummaries()}
      title={
        <>
          ¿Qué dice la ley
          <br className="desktop-break" /> sobre tu caso?
        </>
      }
      lead={SITE_LEAD}
      example={getHomeExample()}
      maxChars={env.limits.maxQuestionChars}
      turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || undefined}
    />
  );
}
