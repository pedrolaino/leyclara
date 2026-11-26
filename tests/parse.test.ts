import { describe, expect, it } from "vitest";
import { LAWS } from "@/config/laws";
import { htmlToLines } from "@/lib/ingest/html";
import { parseBoDate, parseLaw, splitNotes, splitTitle } from "@/lib/ingest/parse";
import { loadLaws } from "@/lib/retrieval/corpus";

describe("htmlToLines", () => {
  it("ignores source line breaks and keeps <p> and <br>", () => {
    const html = "<p>El contrato\nde trabajo<br>se rige:</p><p>a) Por esta&nbsp;ley.</p>";
    expect(htmlToLines(html)).toEqual(["El contrato de trabajo", "se rige:", "a) Por esta ley."]);
  });
});

describe("splitNotes", () => {
  it("splits off the InfoLEG amendment note", () => {
    const r = splitNotes("Texto del artículo. (Artículo sustituido por art. 1º de la Ley Nº 27.802 B.O. 6/3/2026)");
    expect(r.text).toBe("Texto del artículo.");
    expect(r.notes).toHaveLength(1);
  });
  it("leaves normal parentheses alone", () => {
    const r = splitNotes("un plazo de diez (10) días corridos");
    expect(r.notes).toHaveLength(0);
  });
  it("handles inciso parentheses inside a note", () => {
    const r = splitNotes("(Inciso c) sustituido por art. 3 de la Ley N° 26.361 B.O. 7/4/2008)");
    expect(r.text).toBe("");
    expect(r.notes[0]).toContain("26.361");
  });
});

describe("parseBoDate", () => {
  it("reads the Boletín Oficial date, typos included", () => {
    expect(parseBoDate("Ley Nº 27.802 B.O. 6/3/2026")).toBe("2026-03-06");
    expect(parseBoDate("Ley N° 21.824 B.O. 30/6//1978")).toBe("1978-06-30");
  });
});

describe("splitTitle", () => {
  it("title on its own line (LCT)", () => {
    expect(splitTitle("Condiciones menos favorables. Nulidad.", true)).toEqual({
      title: "Condiciones menos favorables. Nulidad",
      body: "",
    });
  });
  it("title followed by body (LDC)", () => {
    const r = splitTitle("Información. El proveedor está obligado a suministrar al consumidor en forma cierta, clara y detallada todo lo relacionado.", false);
    expect(r.title).toBe("Información");
    expect(r.body.startsWith("El proveedor")).toBe(true);
  });
  it("uppercase title followed by body ending in a colon (LNT)", () => {
    const r = splitTitle("DEFINICIONES. A los efectos de esta ley se entiende por:", true);
    expect(r.title).toBe("DEFINICIONES");
    expect(r.body).toBe("A los efectos de esta ley se entiende por:");
  });
  it("article without a title", () => {
    const r = splitTitle("Si el daño al consumidor resulta del vicio o riesgo de la cosa o de la prestación del servicio, responderán el productor, el fabricante.", true);
    expect(r.title).toBeUndefined();
  });
});

describe("parseLaw", () => {
  const html = `<html><body>
    <p>LEY DE PRUEBA</p><p>Ley Nº 1.234</p>
    <p>TITULO I</p><p>DISPOSICIONES GENERALES</p>
    <p>ARTICULO 1º — Objeto. La presente ley regula cosas.</p>
    <p>ARTICULO 2º bis: Trato digno. Los proveedores deberán garantizar un trato digno.</p>
    <p>(Artículo incorporado por art. 6° de la Ley N° 26.361 B.O. 7/4/2008)</p>
    <p>CAPITULO II</p><p>OTRAS</p>
    <p>ARTICULO 3. — (Artículo derogado por art. 2 de la Ley N° 9.999 B.O. 1/2/2020)</p>
    <p>ARTICULO 4. — Comuníquese al Poder Ejecutivo.</p>
    <p>Antecedentes Normativos</p><p>ARTICULO 5. — no debería aparecer</p>
  </body></html>`;
  const doc = parseLaw(LAWS[1], html, "2026-11-26");

  it("finds articles, bis suffixes and the structure", () => {
    expect(doc.articles.map((a) => a.id)).toEqual(["ldc-1", "ldc-2bis", "ldc-3", "ldc-4"]);
    expect(doc.articles[1]).toMatchObject({ number: "2 bis", title: "Trato digno", path: ["Título I: Disposiciones generales"] });
    expect(doc.articles[2].path).toEqual(["Título I: Disposiciones generales", "Capítulo II: Otras"]);
  });
  it("flags repealed and formal articles", () => {
    expect(doc.articles[2].repealed).toBe(true);
    expect(doc.articles[3].formal).toBe(true);
  });
  it("writes UNICO chapters as único", () => {
    const one = parseLaw(LAWS[2], "<p>TITULO I</p><p>PRINCIPIOS</p><p>CAPITULO UNICO</p><p>ARTICULO 1º — Objeto. Texto del artículo.</p>", "2026-11-26");
    expect(one.articles[0].path).toEqual(["Título I: Principios", "Capítulo único"]);
  });
  it("finds the latest amendment", () => {
    expect(doc.lastAmendment).toEqual({ date: "2020-02-01", text: "Ley Nº 9.999" });
  });
});

describe("parsed laws in data/laws", () => {
  const laws = loadLaws();
  it("all three laws have articles with unique ids", () => {
    for (const law of laws) {
      const ids = law.articles.map((a) => a.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(law.articles.length).toBeGreaterThan(60);
      expect(law.retrievedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
  it("key articles are there with their text", () => {
    const find = (id: string) => laws.flatMap((l) => l.articles).find((a) => a.id === id);
    expect(find("lct-245")?.title).toMatch(/Indemnización por antigüedad/);
    expect(find("ldc-34")?.text).toMatch(/DIEZ \(10\) días/);
    expect(find("lnt-51")?.title).toBe("Velocidad máxima");
  });
});
