import { describe, expect, it } from "vitest";
import { expandQuery, search } from "@/lib/retrieval/search";
import { normalize, stem, tokenize } from "@/lib/retrieval/text";

describe("text", () => {
  it("strips accents and punctuation", () => {
    expect(normalize("¿Cuántos días de VACACIONES?")).toBe("cuantos dias de vacaciones");
  });
  it("stems word variants to the same token", () => {
    expect(stem("despidieron")).toBe(stem("despido"));
    expect(stem("vacaciones")).toBe(stem("vacación".normalize("NFD").replace(/\p{Diacritic}/gu, "")));
    expect(stem("trabajadores")).toBe(stem("trabajador"));
  });
  it("removes stopwords", () => {
    expect(tokenize("me tienen que pagar el aguinaldo")).toEqual(["pagar", "aguina"]);
  });
});

describe("everyday language expansion", () => {
  it("maps everyday words to legal terms", () => {
    expect(expandQuery("me echaron del laburo").areas).toContain("trabajo");
    expect(expandQuery("el lavarropas vino fallado").extra.join(" ")).toMatch(/garantia/);
    expect(expandQuery("me pararon en un control").areas).toContain("transito");
  });
});

describe("search across the three laws", () => {
  const top = (q: string, k = 3) => search(q, { k }).hits.map((h) => h.article.id);
  it("finds the article without knowing which law applies", () => {
    expect(top("¿Cuántos días de vacaciones me corresponden?")).toContain("lct-150");
    expect(top("Compré algo por internet y me arrepentí")).toContain("ldc-34");
    expect(top("¿Cuál es la velocidad máxima en una autopista?")).toContain("lnt-51");
  });
  it("does not index repealed articles", () => {
    const ids = search("cajas de asistencia a la canasta familiar vales alimentarios", { k: 10 }).hits.map((h) => h.article.id);
    expect(ids).not.toContain("lct-105bis");
  });
  it("gives low coverage to unrelated questions", () => {
    const hits = search("¿Quién ganó el último mundial de fútbol?").hits;
    expect(hits.every((h) => h.coverage < 0.5)).toBe(true);
  });
});
