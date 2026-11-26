"use client";
import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";

export const THEME_KEY = "theme";

// Runs in <head> before the page is painted, so it never flashes the wrong theme.
export const THEME_SCRIPT = `try{var t=localStorage.getItem("${THEME_KEY}")}catch(e){}document.documentElement.dataset.theme=t||(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light")`;

// The theme lives in the data-theme attribute on <html>.
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}
const currentTheme = (): Theme => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");

export function ThemeToggle() {
  // null on the server, it can't see the visitor's choice.
  const theme = useSyncExternalStore(subscribe, currentTheme, () => null);
  const next: Theme = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={next === "light" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      onClick={() => {
        document.documentElement.dataset.theme = next;
        try {
          localStorage.setItem(THEME_KEY, next);
        } catch {}
      }}
      hidden={theme === null}
    >
      {next === "light" ? <Sun size={20} aria-hidden /> : <Moon size={20} aria-hidden />}
    </button>
  );
}
