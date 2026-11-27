export const SITE_NAME = "Ley Clara";

export const SITE_TAGLINE =
  "Escribí lo que te pasó con tus palabras y te mostramos qué dice la ley, con el artículo y su texto oficial.";

export const SITE_LEAD = "Consultá sobre trabajo, compras y tránsito en Argentina.";

// The form's placeholder types these one after the other, after "Ej.: ".
export const TYPING_EXAMPLES = [
  "compré por internet y me arrepentí.",
  "me echaron después de cuatro años sin causa.",
  "me retuvieron el auto en un control.",
  "la heladera nueva vino fallada.",
  "no me pagaron el aguinaldo.",
];

export const SITE_DISCLAIMER = "Información general. No reemplaza el consejo de un abogado.";

// The sample answer on the home page. The quote comes from the parsed law, so it can't drift from the official text.
export const HOME_EXAMPLE = {
  question: "¿Cuántos días de vacaciones tengo si trabajo hace tres años?",
  answer: { before: "Al menos ", strong: "14 días corridos", after: ". El artículo 151 fija los requisitos." },
  articleId: "lct-150",
  highlight: "catorce (14) días corridos",
};

// Env vars can override these, see src/lib/env.ts
export const DEFAULT_LIMITS = {
  maxQuestionChars: 300,
  minQuestionChars: 8,
  maxAnswerChars: 900,
  maxOutputTokens: 700,
  perIpDaily: 20,
  globalDaily: 300,
};
