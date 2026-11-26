/** Nombre del proyecto. Es el único lugar donde aparece en el sitio. */
export const SITE_NAME = "Ley Clara";

export const SITE_TAGLINE =
  "Preguntá en tus palabras sobre trabajo, compras y tránsito. Te respondemos con el artículo exacto de la ley.";

export const SITE_DISCLAIMER =
  "Información general basada en el texto oficial de las leyes. No es asesoramiento legal.";

/** Límites de uso (se pueden pisar con variables de entorno, ver src/lib/env.ts). */
export const DEFAULT_LIMITS = {
  maxQuestionChars: 300,
  minQuestionChars: 8,
  maxAnswerChars: 900,
  maxOutputTokens: 700,
  perIpDaily: 20,
  globalDaily: 300,
};
