import { describe, expect, it } from "vitest";
import { LAWS } from "@/config/laws";
import { htmlToLines } from "@/lib/ingest/html";
import { parseBoDate, parseLaw, splitNotes, splitTitle } from "@/lib/ingest/parse";
import { loadLaws } from "@/lib/retrieval/corpus";

describe("htmlToLines", () => {
  it("ignora los saltos del código fuente y respeta <p>/<br>", () => {
    const html = "<p>El contrato\nde trabajo<br>se rige:</p><p>a) Por esta&nbsp;ley.</p>";
    expect(htmlToLines(html)).toEqual(["El contrato de trabajo", "se rige:", "a) Por esta ley."]);
  });
});

describe("splitNotes", () => {
  it("separa la nota de modificación de InfoLEG", () => {
    const r = splitNotes("Texto del artículo. (Artículo sustituido por art. 1º de la Ley Nº 27.802 B.O. 6/3/2026)");
    expect(r.text).toBe("Texto del artículo.");
    expect(r.notes).toHaveLength(1);
  });
  it("no confunde paréntesis normales con notas", () => {
    const r = splitNotes("un plazo de diez (10) días corridos");
    expect(r.notes).toHaveLength(0);
  });
  it("soporta incisos con paréntesis dentro de la nota", () => {
    const r = splitNotes("(Inciso c) sustituido por art. 3 de la Ley N° 26.361 B.O. 7/4/2008)");
    expect(r.text).toBe("");
    expect(r.notes[0]).toContain("26.361");
  });
});

describe("parseBoDate", () => {
  it("lee la fecha del Boletín Oficial, incluso con errores de tipeo", () => {
    expect(parseBoDate("Ley Nº 27.802 B.O. 6/3/2026")).toBe("2026-03-06");
    expect(parseBoDate("Ley N° 21.824 B.O. 30/6//1978")).toBe("1978-06-30");
  });
});

describe("splitTitle", () => {
  it("epígrafe en línea propia (formato LCT)", () => {
    expect(splitTitle("Condiciones menos favorables. Nulidad.", true)).toEqual({
      title: "Condiciones menos favorables. Nulidad",
      body: "",
    });
  });
  it("epígrafe seguido del cuerpo (formato LDC)", () => {
    const r = splitTitle("Información. El proveedor está obligado a suministrar al consumidor en forma cierta, clara y detallada todo lo relacionado.", false);
    expect(r.title).toBe("Información");
    expect(r.body.startsWith("El proveedor")).toBe(true);
  });
  it("epígrafe en mayúsculas seguido de cuerpo terminado en dos puntos (formato LNT)", () => {
    const r = splitTitle("DEFINICIONES. A los efectos de esta ley se entiende por:", true);
    expect(r.title).toBe("DEFINICIONES");
    expect(r.body).toBe("A los efectos de esta ley se entiende por:");
  });
  it("artículo sin epígrafe", () => {
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

  it("reconoce artículos, sufijos bis y la estructura", () => {
    expect(doc.articles.map((a) => a.id)).toEqual(["ldc-1", "ldc-2bis", "ldc-3", "ldc-4"]);
    expect(doc.articles[1]).toMatchObject({ number: "2 bis", title: "Trato digno", path: ["Título I: Disposiciones generales"] });
    expect(doc.articles[2].path).toEqual(["Título I: Disposiciones generales", "Capítulo II: Otras"]);
  });
  it("marca derogados y artículos de forma", () => {
    expect(doc.articles[2].repealed).toBe(true);
    expect(doc.articles[3].formal).toBe(true);
  });
  it("calcula la última modificación incorporada", () => {
    expect(doc.lastAmendment).toEqual({ date: "2020-02-01", text: "Ley Nº 9.999" });
  });
});

describe("textos parseados (data/laws)", () => {
  const laws = loadLaws();
  it("las tres leyes tienen artículos con ids únicos", () => {
    for (const law of laws) {
      const ids = law.articles.map((a) => a.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(law.articles.length).toBeGreaterThan(60);
      expect(law.retrievedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
  it("artículos clave presentes con su texto", () => {
    const find = (id: string) => laws.flatMap((l) => l.articles).find((a) => a.id === id);
    expect(find("lct-245")?.title).toMatch(/Indemnización por antigüedad/);
    expect(find("ldc-34")?.text).toMatch(/DIEZ \(10\) días/);
    expect(find("lnt-51")?.title).toBe("Velocidad máxima");
  });
});
