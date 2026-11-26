/** Nombre del proyecto. Es el único lugar donde aparece en el sitio. */
export const SITE_NAME = "Ley Clara";

export const SITE_TAGLINE =
  "Escribí lo que te pasó con tus palabras y te mostramos qué dice la ley, con el artículo y su texto oficial.";

export const SITE_DISCLAIMER =
  "Esto es información general sobre lo que dice la ley. No reemplaza el consejo de un abogado.";

/** Límites de uso (se pueden pisar con variables de entorno, ver src/lib/env.ts). */
export const DEFAULT_LIMITS = {
  maxQuestionChars: 300,
  minQuestionChars: 8,
  maxAnswerChars: 900,
  maxOutputTokens: 700,
  perIpDaily: 20,
  globalDaily: 300,
};
