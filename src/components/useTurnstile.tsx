"use client";

// Invisible Turnstile. Does nothing without NEXT_PUBLIC_TURNSTILE_SITE_KEY.
import Script from "next/script";
import { useCallback, useRef } from "react";

interface TurnstileApi {
  render(el: HTMLElement, opts: Record<string, unknown>): string;
  execute(widgetId: string): void;
  reset(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export function useTurnstile(siteKey?: string) {
  const el = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const pending = useRef<((token: string | undefined) => void) | null>(null);

  const fetchToken = useCallback(async (): Promise<string | undefined> => {
    if (!siteKey || !window.turnstile || !el.current) return undefined;
    const ts = window.turnstile;
    if (!widget.current) {
      widget.current = ts.render(el.current, {
        sitekey: siteKey,
        execution: "execute",
        appearance: "interaction-only",
        callback: (token: string) => pending.current?.(token),
        "error-callback": () => pending.current?.(undefined),
      });
    } else {
      ts.reset(widget.current);
    }
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve(undefined), 15_000);
      pending.current = (token) => {
        clearTimeout(timer);
        resolve(token);
      };
      ts.execute(widget.current!);
    });
  }, [siteKey]);

  // Getting a token takes a second or two, so it starts as soon as the visitor gets ready to ask.
  // Tokens last 5 minutes and work once.
  const ready = useRef<{ token: Promise<string | undefined>; at: number } | null>(null);

  const prepare = useCallback(() => {
    if (siteKey && !ready.current) ready.current = { token: fetchToken(), at: Date.now() };
  }, [siteKey, fetchToken]);

  const getToken = useCallback(async () => {
    const prepared = ready.current;
    ready.current = null;
    if (prepared && Date.now() - prepared.at < 240_000) {
      const token = await prepared.token;
      if (token) return token;
    }
    return fetchToken();
  }, [fetchToken]);

  const container = siteKey ? (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" />
      <div ref={el} className="turnstile" />
    </>
  ) : null;

  return { getToken, prepare, container };
}
