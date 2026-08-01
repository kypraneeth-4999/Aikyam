"use client";

import { useEffect, useState } from "react";

export type ThemeChoice = "system" | "light" | "dark";

const KEY = "theme";

/** Inline script for <head> — applies the saved theme before first paint so
 *  there's no flash of the wrong colours. Keep it tiny and dependency-free. */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('${KEY}');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`;

function apply(choice: ThemeChoice) {
  const root = document.documentElement;
  if (choice === "system") {
    root.removeAttribute("data-theme"); // fall back to prefers-color-scheme
    localStorage.removeItem(KEY);
  } else {
    root.setAttribute("data-theme", choice);
    localStorage.setItem(KEY, choice);
  }
}

function read(): ThemeChoice {
  if (typeof document === "undefined") return "system";
  const attr = document.documentElement.getAttribute("data-theme");
  return attr === "light" || attr === "dark" ? attr : "system";
}

function useThemeChoice() {
  const [choice, setChoice] = useState<ThemeChoice>("system");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setChoice(read());
    setReady(true);
  }, []);

  const change = (next: ThemeChoice) => {
    apply(next);
    setChoice(next);
  };

  return { choice, ready, change };
}

/** Compact light/dark switch for the header. */
export function ThemeToggle() {
  const { choice, ready, change } = useThemeChoice();

  // Until mounted we can't know the resolved theme; render a stable placeholder
  // so the server and client markup match.
  const isDark =
    choice === "dark" ||
    (choice === "system" &&
      typeof window !== "undefined" &&
      !window.matchMedia("(prefers-color-scheme: light)").matches);

  return (
    <button
      type="button"
      onClick={() => change(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Light theme" : "Dark theme"}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted transition-colors hover:text-cream"
    >
      <span aria-hidden className="text-sm">
        {!ready ? "◐" : isDark ? "☀" : "☾"}
      </span>
    </button>
  );
}

/** Three-way selector for Settings. */
export function ThemeSetting() {
  const { choice, ready, change } = useThemeChoice();
  const options: { value: ThemeChoice; label: string; hint: string }[] = [
    { value: "system", label: "System", hint: "Match your device" },
    { value: "light", label: "Light", hint: "Warm ivory" },
    { value: "dark", label: "Dark", hint: "Deep indigo" },
  ];

  return (
    <section className="mt-8">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
        Appearance
      </h2>
      <div className="grid grid-cols-3 gap-2">
        {options.map((o) => {
          const active = ready && choice === o.value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => change(o.value)}
              aria-pressed={active}
              className={`rounded-xl border p-3 text-left transition-colors ${
                active
                  ? "border-gold bg-gold/10"
                  : "border-border bg-surface2 hover:border-gold/30"
              }`}
            >
              <span
                className={`block text-sm font-medium ${active ? "text-gold" : "text-cream"}`}
              >
                {o.label}
              </span>
              <span className="mt-0.5 block text-xs text-muted">{o.hint}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
