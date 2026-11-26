/**
 * Procesamiento de texto en español para búsqueda léxica.
 * Stemming por truncamiento: después de sacar plurales, se conservan los primeros 6 caracteres.
 * Es simple, predecible y funciona bien en español ("despidieron" y "despido" → "despid").
 */

const STOPWORDS = new Set(
  (
    "a al algo algun alguna algunas alguno algunos ante antes aqui asi aun cada como con contra cual cuales cualquier " +
    "de del desde donde dos el ella ellas ellos en entre era eran es esa esas ese eso esos esta estaba estado estan " +
    "estar este esto estos fue fueron ha haber habia han hasta hay la las le les lo los mas me mi mis mucho muy " +
    "nada ni no nos o otra otras otro otros para pero poco por porque puede pueden puedo que quien se segun ser si " +
    "sido sin sino sobre son su sus tambien tan tanto te tener tengo ti tiene tienen todo todos tu tus un una unas " +
    "uno unos usted vos y ya yo cuanto cuanta cuantos cuantas cuando hacer hago hace hice dicho dice decir " +
    "quiero queria necesito saber pasa paso caso corresponde corresponden correspondia mia mio mias mios " +
    "ley leyes articulo articulos inciso presente dicha dicho mismo misma"
  ).split(/\s+/),
);

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9ñ\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function stem(word: string): string {
  let w = word;
  if (w.length > 5 && /[rnldzj]es$/.test(w)) w = w.slice(0, -2);
  else if (w.length > 4 && w.endsWith("s")) w = w.slice(0, -1);
  return w.length > 6 ? w.slice(0, 6) : w;
}

export function tokenize(s: string): string[] {
  return normalize(s)
    .split(" ")
    .filter((t) => t.length > 1 && !STOPWORDS.has(t) && !/^\d+$/.test(t))
    .map(stem);
}
