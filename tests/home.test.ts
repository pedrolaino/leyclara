import { describe, expect, it } from "vitest";
import { HOME_EXAMPLE } from "@/config/site";
import { articleName } from "@/lib/format";
import { getHomeExample } from "@/lib/home-example";

describe("home example", () => {
  it("quotes the official text of the article, with the highlight in place", () => {
    const ex = getHomeExample();
    expect(ex.question).toBe(HOME_EXAMPLE.question);
    expect(ex.article).toBe("Artículo 150");
    expect(ex.law).toBe("Ley 20.744");
    expect(ex.quote.mark).toBe("catorce (14) días corridos");
    expect(`${ex.quote.before}${ex.quote.mark}${ex.quote.after}`).toBe(
      "De catorce (14) días corridos cuando la antigüedad en el empleo no exceda de cinco (5) años",
    );
    expect(ex.url).toMatch(/^https:\/\/servicios\.infoleg\.gob\.ar\//);
  });
});

describe("articleName", () => {
  it("spells out the article label", () => {
    expect(articleName("Art. 150")).toBe("Artículo 150");
    expect(articleName("Art. 2 bis")).toBe("Artículo 2 bis");
  });
});
