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

  const getToken = useCallback(async (): Promise<string | undefined> => {
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

  const container = siteKey ? (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" />
      <div ref={el} className="turnstile" />
    </>
  ) : null;

  return { getToken, container };
}
