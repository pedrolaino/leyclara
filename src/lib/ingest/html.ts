// InfoLEG serves old HTML in windows-1252, with hard line wraps in the source.

const NAMED_ENTITIES: Record<string, string> = {
  nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'",
  aacute: "á", eacute: "é", iacute: "í", oacute: "ó", uacute: "ú",
  Aacute: "Á", Eacute: "É", Iacute: "Í", Oacute: "Ó", Uacute: "Ú",
  ntilde: "ñ", Ntilde: "Ñ", uuml: "ü", Uuml: "Ü", iexcl: "¡", iquest: "¿",
  ordm: "º", ordf: "ª", deg: "°", laquo: "«", raquo: "»", ndash: "–", mdash: "—",
  lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”", hellip: "…", middot: "·",
  agrave: "à", egrave: "è", ograve: "ò", sect: "§", shy: "",
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return NAMED_ENTITIES[e] ?? m;
  });
}

export function decodeHtmlBytes(bytes: Uint8Array): string {
  const head = new TextDecoder("latin1").decode(bytes.slice(0, 4096));
  const charset = /charset=["']?([\w-]+)/i.exec(head)?.[1]?.toLowerCase() ?? "windows-1252";
  const label = charset === "iso-8859-1" || charset === "latin1" ? "windows-1252" : charset;
  return new TextDecoder(label).decode(bytes);
}

export function htmlToLines(html: string): string[] {
  let t = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|head)\b[\s\S]*?<\/\1>/gi, " ");
  // Source line breaks mean nothing, only block tags do.
  t = t.replace(/\s+/g, " ");
  t = t
    .replace(/<br\b[^>]*>/gi, "\n")
    .replace(/<\/?(p|div|h[1-6]|li|tr|table|center|blockquote)\b[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "");
  t = decodeEntities(t);
  return t
    .split("\n")
    .map((l) => l.replace(/[ \s]+/g, " ").trim())
    .filter((l) => l.length > 0);
}
