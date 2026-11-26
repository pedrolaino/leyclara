import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyTurnstile } from "@/lib/guard/turnstile";
import { buildCsp } from "@/proxy";

// Cloudflare's public test secret, it always passes.
const TEST_SECRET = "1x0000000000000000000000000000000AA";

describe("turnstile", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("is skipped without a secret", async () => {
    expect(await verifyTurnstile(undefined, undefined)).toBe(true);
  });

  it("rejects a missing token without calling Cloudflare", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    expect(await verifyTurnstile(TEST_SECRET, "")).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("trusts Cloudflare's answer and fails closed on errors", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ success: true })));
    expect(await verifyTurnstile(TEST_SECRET, "XXXX.DUMMY.TOKEN.XXXX", "1.2.3.4")).toBe(true);
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ success: false })));
    expect(await verifyTurnstile(TEST_SECRET, "bad")).toBe(false);
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    expect(await verifyTurnstile(TEST_SECRET, "token")).toBe(false);
  });
});

describe("content security policy", () => {
  it("allows scripts only by nonce, plus Turnstile", () => {
    const csp = buildCsp("abc", false);
    expect(csp).toContain("script-src 'self' 'nonce-abc' 'strict-dynamic' https://challenges.cloudflare.com");
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(buildCsp("abc", true)).toContain("'unsafe-eval'");
  });
});
