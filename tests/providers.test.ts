import { afterEach, describe, expect, it, vi } from "vitest";
import { GeminiChat } from "@/lib/ai/gemini";
import { ProviderError, QuotaExceededError } from "@/lib/ai/types";

const req = { system: "s", user: "u", schema: { type: "string" as const }, maxOutputTokens: 10 };
const ok = () => Response.json({ candidates: [{ content: { parts: [{ text: '"hola"' }] } }] });
const busy = () => new Response("busy", { status: 503 });

afterEach(() => vi.unstubAllGlobals());

describe("gemini chat", () => {
  it("tries again once when the model is busy", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(busy()).mockResolvedValueOnce(ok());
    vi.stubGlobal("fetch", fetch);
    await expect(new GeminiChat("k", "m").generateJson(req)).resolves.toBe("hola");
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("gives up if it is still busy", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => busy()));
    await expect(new GeminiChat("k", "m").generateJson(req)).rejects.toThrow(ProviderError);
  });

  it("does not retry when the quota is over", async () => {
    const fetch = vi.fn(async () => new Response("quota", { status: 429 }));
    vi.stubGlobal("fetch", fetch);
    await expect(new GeminiChat("k", "m").generateJson(req)).rejects.toThrow(QuotaExceededError);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
