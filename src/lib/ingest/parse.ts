// Parses InfoLEG's updated law text into titles, chapters and articles.
// Lines that aren't a heading or an article start are appended to the current article.
import type { LawSource } from "@/config/laws";
import type { AmendmentNote, Article, LawDocument } from "@/lib/types";
import { htmlToLines } from "./html";

const ARTICLE_RE =
  /^(?:ART[IÍ]CULO|Art[ií]culo|Art\.)\s*(\d+)\s*(?:°|º|o(?=[\s.]))?\s*(?:(bis|ter|qu[aá]ter|quinquies)(?![a-záéíóú]))?[\s.:)—–-]*(.*)$/i;
const HEADING_RE =
  /^(LIBRO|PARTE|T[IÍ]TULO|CAP[IÍ]TULO|SECCI[OÓ]N)\s+([IVXLC]+|[ÚU]NICO|PRELIMINAR|PRIMER[OA]|SEGUND[OA]|\d+)\b\.?\s*[-—–:.]?\s*(.*)$/;
const HEADING_LEVEL: Record<string, number> = { LIBRO: 0, PARTE: 0, TITULO: 1, CAPITULO: 2, SECCION: 3 };
const HEADING_LABEL: Record<string, string> = {
  LIBRO: "Libro", PARTE: "Parte", TITULO: "Título", CAPITULO: "Capítulo", SECCION: "Sección",
};

const NOTE_START =
  /\((?:Art[ií]culo|Art\.|Incisos?|P[aá]rrafos?|Texto|Expresi[oó]n|Puntos?|Apartados?|Primer|Segundo|Tercer|Cuarto|Quinto|[UÚ]ltimo|Pen[uú]ltimo|Denominaci[oó]n|Nota|Frase|Cap[ií]tulo|T[ií]tulo|Ac[aá]pite|[IÍ]tem|Sub)/g;
const NOTE_BODY = /B\.\s?O\.|Nota Infoleg|Vigencia|sustituid|incorporad|derogad|vetad|observad|restituid|modificad/i;
const FORMAL_RE = /^(Comun[ií]quese|Modif[ií]case el art[ií]culo|Der[oó]ganse|Agr[eé]guese el siguiente)/i;

const stripAccents = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "");

// Splits InfoLEG amendment notes, like "(Artículo sustituido por ... B.O. ...)", from the text.
export function splitNotes(line: string): { text: string; notes: string[] } {
  const notes: string[] = [];
  let text = line;
  for (let guard = 0; guard < 4; guard++) {
    const starts = [...text.matchAll(NOTE_START)].map((m) => m.index!);
    const idx = starts.reverse().find((i) => NOTE_BODY.test(text.slice(i)));
    if (idx === undefined) break;
    notes.unshift(text.slice(idx).trim());
    text = text.slice(0, idx).trim();
  }
  return { text, notes };
}

// "B.O. 6/3/2026" -> "2026-03-06". InfoLEG has typos like "30/6//1978".
export function parseBoDate(note: string): string | undefined {
  const dates = [...note.matchAll(/B\.\s?O\.\s*(\d{1,2})\s*\/+\s*(\d{1,2})\s*\/+\s*(\d{2,4})/g)].map((m) => {
    let y = Number(m[3]);
    if (y < 100) y += y > 50 ? 1900 : 2000;
    return `${y}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  });
  return dates.sort().at(-1);
}

export function splitTitle(rest: string, hasMoreLines: boolean): { title?: string; body: string } {
  const r = rest.trim();
  if (!r || r.startsWith("(")) return { body: r };
  const seg = splitTitleBySegments(r);
  const words = r.split(/\s+/).length;
  const looksLikeSentence = /[,;]\s/.test(r) && words > 10;
  // LCT style: the epigraph is the whole line and the body starts on the next one.
  // But in "DEFINICIONES. A los efectos de esta ley se entiende por:" the rest is body.
  if (hasMoreLines && r.length <= 130 && words <= 16 && !looksLikeSentence) {
    const bodyIsBody = seg.title && (seg.body.endsWith(":") || isUpperCase(seg.title) !== isUpperCase(seg.body));
    if (!bodyIsBody) return { title: r.replace(/[.:]$/, ""), body: "" };
  }
  return seg;
}

const isUpperCase = (s: string) => {
  const letters = s.replace(/[^\p{L}]/gu, "");
  return letters.length > 1 && letters === letters.toUpperCase();
};

// LDC/LNT style: "Información. El proveedor está obligado ..."
function splitTitleBySegments(r: string): { title?: string; body: string } {
  const segments = r.split(/(?<=[.:])\s+/);
  const titleParts: string[] = [];
  let firstUpper: boolean | undefined;
  for (const seg of segments.slice(0, -1)) {
    const clean = seg.replace(/[.:]$/, "");
    const upper = isUpperCase(clean);
    const nWords = clean.split(/\s+/).length;
    const short = nWords <= 9 && clean.length <= 70;
    if (!(short || (upper && clean.length <= 160)) || /[,;]/.test(clean)) break;
    // Uppercase epigraph followed by normal case means the body started.
    if (firstUpper === undefined) firstUpper = upper;
    else if (firstUpper && !upper) break;
    // "REQUISITOS:" is an epigraph, "se entiende por:" is body.
    if (seg.endsWith(":") && !(titleParts.length === 0 && (upper || nWords <= 3))) break;
    titleParts.push(clean);
    if (seg.endsWith(":")) break;
  }
  if (!titleParts.length) return { body: r };
  const last = titleParts.at(-1)!;
  const body = r.slice(r.indexOf(last) + last.length).replace(/^[.:]\s*/, "");
  return { title: titleParts.join(". "), body };
}

const articleSlug = (num: string, suffix?: string) =>
  `${num}${suffix ? stripAccents(suffix.toLowerCase()) : ""}`;

export function parseLaw(source: LawSource, html: string, retrievedAt: string): LawDocument {
  let lines = htmlToLines(html);
  const end = lines.lastIndexOf("Antecedentes Normativos");
  if (end > 0) lines = lines.slice(0, end);

  const heading = lines.slice(0, 2).join(" · ");
  const path: (string | undefined)[] = [];
  const articles: Article[] = [];
  let current: { art: Article; paragraphs: string[]; rest: string; restBody: string } | null = null;
  let lastNumber = 0;
  const seen = new Map<string, number>();

  const flush = () => {
    if (!current) return;
    const { art, paragraphs } = current;
    const allNotes = art.notes.map((n) => n.text).join(" ");
    // Repealed articles keep only their epigraph, e.g. "Art. 192. —Ahorro." + a repeal note.
    const rest = current.rest;
    const onlyHeaderLine = paragraphs.length <= 1 && (paragraphs[0] ?? "") === current.restBody;
    if (onlyHeaderLine && rest && /derogad|vetad|observad/i.test(allNotes) && rest.length <= 130 && rest.split(/\s+/).length <= 16) {
      art.title = capitalize(rest.replace(/[.:]$/, ""));
      paragraphs.length = 0;
    }
    art.text = paragraphs.join("\n").trim();
    art.repealed =
      art.text.replace(/[\s.()—–-]/g, "").length < 15 && /derogad|vetad|observad/i.test(allNotes + art.text);
    art.formal = FORMAL_RE.test(art.text) || FORMAL_RE.test(art.title ?? "");
    articles.push(art);
    current = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const h = HEADING_RE.exec(line);
    if (h && line.length <= 160) {
      flush();
      const level = HEADING_LEVEL[stripAccents(h[1])];
      let name = h[3]?.trim();
      const next = lines[i + 1];
      const nextText = next ? splitNotes(next).text : "";
      if (!name && nextText && !ARTICLE_RE.test(next) && !HEADING_RE.test(next) && nextText.length <= 160) {
        name = nextText.replace(/\.$/, "");
        i++;
      }
      const numeral = /^[ÚU]NICO$/.test(h[2]) ? "único" : h[2];
      const label = `${HEADING_LABEL[stripAccents(h[1])]} ${numeral}`;
      path[level] = name ? `${label}: ${capitalize(name)}` : label;
      path.length = level + 1;
      continue;
    }

    const a = ARTICLE_RE.exec(line);
    const num = a ? Number(a[1]) : NaN;
    // Lines like "Artículo 44 de la Ley..." inside a body are references, not new articles.
    if (a && num >= lastNumber && num <= lastNumber + 15) {
      flush();
      lastNumber = num;
      const suffix = a[2]?.toLowerCase();
      let slug = articleSlug(a[1], suffix);
      const dup = seen.get(slug) ?? 0;
      seen.set(slug, dup + 1);
      if (dup) slug += `-${dup + 1}`;
      const number = suffix ? `${a[1]} ${suffix}` : a[1];
      const { text: rest, notes } = splitNotes(a[3] ?? "");
      // Body on the next line, unless that line is an article, a heading or just a note.
      const next = lines[i + 1];
      const bodyFollows = !!next && !ARTICLE_RE.test(next) && !HEADING_RE.test(next) && splitNotes(next).text.length > 0;
      const split = splitTitle(rest, bodyFollows);
      const title = split.title ? capitalize(split.title) : undefined;
      const body = split.body;
      current = {
        art: {
          id: `${source.id}-${slug}`,
          lawId: source.id,
          number,
          label: `Art. ${number}`,
          title,
          path: path.filter((p): p is string => Boolean(p)),
          text: "",
          notes: notes.map(toNote),
          repealed: false,
          formal: false,
        },
        paragraphs: body ? [body] : [],
        rest,
        restBody: body,
      };
      continue;
    }

    if (current) {
      const { text, notes } = splitNotes(line);
      if (text) current.paragraphs.push(text);
      current.art.notes.push(...notes.map(toNote));
    }
  }
  flush();

  // "Nota Infoleg" lines aren't amendments.
  const dated = articles
    .flatMap((a) => a.notes)
    .filter((n) => n.date && /sustituid|incorporad|derogad|modificad|restituid/i.test(n.text));
  dated.sort((x, y) => (x.date! < y.date! ? 1 : -1));
  const last = dated[0];

  return {
    id: source.id,
    area: source.area,
    number: source.number,
    name: source.name,
    shortName: source.shortName,
    textUrl: source.textUrl,
    pageUrl: source.pageUrl,
    heading,
    retrievedAt,
    lastAmendment: last ? { date: last.date!, text: describeNorm(last.text) } : undefined,
    articles,
  };
}

function toNote(text: string): AmendmentNote {
  return { text: text.replace(/^\(|\)\.?$/g, "").trim(), date: parseBoDate(text) };
}

// "...por art. 2º de la Ley Nº 27.802 B.O. 6/3/2026..." -> "Ley Nº 27.802"
function describeNorm(note: string): string {
  const m = /(Ley|Decreto(?: de Necesidad y Urgencia)?|DNU|Resoluci[oó]n)\s*(?:Nacional\s*)?N?[°º]?\s*([\d.]+(?:\/\d+)?)/i.exec(note);
  return m ? `${m[1]} Nº ${m[2]}` : note.slice(0, 80);
}

// Uppercase epigraphs come without accents ("VELOCIDAD MAXIMA"), so we add back the common ones.
const ACCENTS: Record<string, string> = {
  transito: "tránsito", garantia: "garantía", maxima: "máxima", maximo: "máximo", minimas: "mínimas",
  minima: "mínima", limites: "límites", via: "vía", vias: "vías", publica: "pública", publico: "público",
  tecnica: "técnica", vehiculo: "vehículo", vehiculos: "vehículos", caracteristicas: "características",
  obstaculos: "obstáculos", basicos: "básicos", unico: "único", accidentologica: "accidentológica",
  periodo: "período", camion: "camión", region: "región", organos: "órganos", jurisdiccional: "jurisdiccional",
  prohibicion: "prohibición", automoviles: "automóviles", ambito: "ámbito", transitorias: "transitorias",
  menores: "menores", codigo: "código", procesal: "procesal", comision: "comisión", educacion: "educación",
};

function restoreAccents(word: string): string {
  if (ACCENTS[word]) return ACCENTS[word];
  if (/[cs]ion$/.test(word)) return word.replace(/ion$/, "ión");
  if (/[cs]iones$/.test(word)) return word;
  return word;
}

function capitalize(s: string) {
  if (s !== s.toUpperCase()) return s;
  const lower = s.toLowerCase().replace(/\p{L}+/gu, restoreAccents);
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}
