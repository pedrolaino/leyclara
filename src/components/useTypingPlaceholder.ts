"use client";

import { useEffect, useState } from "react";

const TYPE_MS = 55;
const DELETE_MS = 25;
const HOLD_MS = 2200;
const GAP_MS = 400;

// Types each phrase, waits, deletes it and moves on. Starts with the first one written out,
// so the server render and people who prefer less motion get a normal placeholder.
export function useTypingPlaceholder(phrases: string[], active: boolean): string {
  const [text, setText] = useState(phrases[0]);

  useEffect(() => {
    if (!active || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let index = 0;
    let length = phrases[0].length;
    let deleting = true;
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      const phrase = phrases[index];
      length += deleting ? -1 : 1;
      setText(phrase.slice(0, length));
      if (!deleting && length === phrase.length) {
        deleting = true;
        timer = setTimeout(tick, HOLD_MS);
      } else if (deleting && length === 0) {
        deleting = false;
        index = (index + 1) % phrases.length;
        timer = setTimeout(tick, GAP_MS);
      } else {
        timer = setTimeout(tick, deleting ? DELETE_MS : TYPE_MS);
      }
    };
    // Back to the first phrase in case it stopped halfway through another one
    timer = setTimeout(() => {
      setText(phrases[0]);
      timer = setTimeout(tick, HOLD_MS);
    }, 0);
    return () => clearTimeout(timer);
  }, [active, phrases]);

  return active ? text : phrases[0];
}
