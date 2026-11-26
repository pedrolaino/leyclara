import { describe, expect, it, vi } from "vitest";
import { MockChat } from "@/lib/ai/mock";
import type { ChatProvider, JsonRequest } from "@/lib/ai/types";
import { answerQuestion, sanitizeFollowUps, truncateAtSentence } from "@/lib/assistant/answer";

const deps = (chat: ChatProvider) => ({ chat, maxAnswerChars: 900, maxOutputTokens: 500 });

// Fake model: returns what we tell it and records the calls.
function fakeChat(response: (req: JsonRequest) => unknown) {
  const calls: JsonRequest[] = [];
  const chat: ChatProvider = {
    name: "fake",
    model: "fake-1",
    generateJson: vi.fn(async (req: JsonRequest) => {
      calls.push(req);
      return response(req);
    }),
  };
  return { chat, calls };
}

describe("out of scope questions", () => {
  it("off topic: never calls the model", async () => {
    const { chat, calls } = fakeChat(() => ({}));
    const r = await answerQuestion("¿Quién ganó el mundial?", deps(chat));
    expect(r.kind).toBe("off_topic");
    expect(calls).toHaveLength(0);
  });

  it("uncovered legal topic: says where it is regulated, no model call", async () => {
    const { chat, calls } = fakeChat(() => ({}));
    const r = await answerQuestion("¿Cuánto me pueden aumentar el alquiler?", deps(chat));
    expect(r.kind).toBe("not_covered");
    if (r.kind === "not_covered") expect(r.whereRegulated).toMatch(/Código Civil y Comercial/);
    expect(calls).toHaveLength(0);
  });

  it("rejects topics the law excludes even if they sound covered (casas particulares)", async () => {
    const { chat, calls } = fakeChat(() => ({}));
    const r = await answerQuestion("Soy empleada doméstica, ¿cuántos días de vacaciones tengo?", deps(chat));
    expect(r.kind).toBe("not_covered");
    if (r.kind === "not_covered") expect(r.whereRegulated).toMatch(/26\.844/);
    expect(calls).toHaveLength(0);
  });

  it("returns not_found when the model says the articles are not enough", async () => {
    const { chat } = fakeChat(() => ({ status: "not_found", answer: "", citations: [], follow_ups: [] }));
    const r = await answerQuestion("¿Cuánto cobra por hora un empleado de comercio según la paritaria?", deps(chat));
    expect(r.kind).toBe("not_found");
  });
});

describe("answers", () => {
  it("only sends retrieved articles and returns the official text", async () => {
    const { chat, calls } = fakeChat(() => ({
      status: "answered",
      answer: "Tenés entre 14 y 35 días corridos según tu antigüedad.",
      citations: ["lct-150"],
      follow_ups: ["¿Cuándo me tienen que dar las vacaciones?"],
    }));
    const r = await answerQuestion("¿Cuántos días de vacaciones me corresponden?", deps(chat));
    expect(calls[0].user).toContain('<articulo id="lct-150">');
    expect(r.kind).toBe("answer");
    if (r.kind !== "answer") return;
    expect(r.citations[0].id).toBe("lct-150");
    expect(r.citations[0].text).toMatch(/catorce \(14\) días corridos/);
    expect(r.sources[0].retrievedAt).toMatch(/^\d{4}-/);
    expect(r.area).toBe("trabajo");
    expect(r.referral).toMatch(/abogado laboralista/);
    expect(r.followUps[0]).toBe("¿Cuándo me tienen que dar las vacaciones?");
  });

  it("drops answers whose citations were not retrieved", async () => {
    const { chat } = fakeChat(() => ({
      status: "answered",
      answer: "Te corresponden 45 días.",
      citations: ["lct-999", "ley-inventada-1"],
      follow_ups: [],
    }));
    const r = await answerQuestion("¿Cuántos días de vacaciones me corresponden?", deps(chat));
    expect(r.kind).toBe("not_found");
    expect(r.meta.reason).toBe("no-valid-citations");
  });

  it("respects off_topic from the model", async () => {
    const { chat } = fakeChat(() => ({ status: "off_topic", answer: "", citations: [], follow_ups: [] }));
    const r = await answerQuestion("Escribime un poema sobre las vacaciones en la playa", deps(chat));
    expect(r.kind).toBe("off_topic");
  });

  it("mock provider quotes the best article", async () => {
    const r = await answerQuestion("¿Cuál es la velocidad máxima en una autopista?", deps(new MockChat()));
    expect(r.kind).toBe("answer");
    if (r.kind === "answer") expect(r.answer).toMatch(/^Según el artículo/);
  });
});

describe("post-processing", () => {
  it("cuts long answers at a sentence end", () => {
    const t = "Primera oración completa. Segunda oración completa. Tercera que no entra.";
    expect(truncateAtSentence(t, 55)).toBe("Primera oración completa. Segunda oración completa.");
  });
  it("fills follow-ups with examples and skips the question itself", () => {
    const f = sanitizeFollowUps(["cuándo me pagan las vacaciones"], "trabajo", "¿Cuántos días de vacaciones me corresponden?");
    expect(f[0]).toBe("¿cuándo me pagan las vacaciones?");
    expect(f).toHaveLength(3);
    expect(f).not.toContain("¿Cuántos días de vacaciones me corresponden?");
  });
});
