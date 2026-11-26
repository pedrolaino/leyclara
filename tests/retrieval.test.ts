import { describe, expect, it } from "vitest";
import { expandQuery, search } from "@/lib/retrieval/search";
import { normalize, stem, tokenize } from "@/lib/retrieval/text";

describe("texto", () => {
  it("normaliza tildes y signos", () => {
    expect(normalize("¿Cuántos días de VACACIONES?")).toBe("cuantos dias de vacaciones");
  });
  it("el stemming une variantes de la misma palabra", () => {
    expect(stem("despidieron")).toBe(stem("despido"));
    expect(stem("vacaciones")).toBe(stem("vacación".normalize("NFD").replace(/\p{Diacritic}/gu, "")));
    expect(stem("trabajadores")).toBe(stem("trabajador"));
  });
  it("saca stopwords", () => {
    expect(tokenize("me tienen que pagar el aguinaldo")).toEqual(["pagar", "aguina"]);
  });
});

describe("expansión coloquial", () => {
  it("traduce lenguaje común a términos de la ley", () => {
    expect(expandQuery("me echaron del laburo").areas).toContain("trabajo");
    expect(expandQuery("el lavarropas vino fallado").extra.join(" ")).toMatch(/garantia/);
    expect(expandQuery("me pararon en un control").areas).toContain("transito");
  });
});

describe("búsqueda en las tres leyes", () => {
  const top = (q: string, k = 3) => search(q, { k }).hits.map((h) => h.article.id);
  it("encuentra el artículo sin que el usuario sepa qué ley aplica", () => {
    expect(top("¿Cuántos días de vacaciones me corresponden?")).toContain("lct-150");
    expect(top("Compré algo por internet y me arrepentí")).toContain("ldc-34");
    expect(top("¿Cuál es la velocidad máxima en una autopista?")).toContain("lnt-51");
  });
  it("no indexa artículos derogados", () => {
    const ids = search("cajas de asistencia a la canasta familiar vales alimentarios", { k: 10 }).hits.map((h) => h.article.id);
    expect(ids).not.toContain("lct-105bis");
  });
  it("devuelve cobertura baja para preguntas sin relación", () => {
    const hits = search("¿Quién ganó el último mundial de fútbol?").hits;
    expect(hits.every((h) => h.coverage < 0.5)).toBe(true);
  });
});
