import { useEffect, useState } from "react";
import { applyTheme, persistTheme, resolvePreferredTheme } from "../../data/siteTheme";

/**
 * Light editorial · Dark match-desk. Persists via siteTheme helpers.
 */
export default function ThemeSwitcher({ className = "" }) {
  const [theme, setTheme] = useState(() => {
    if (typeof document === "undefined") return "dark";
    return document.documentElement.getAttribute("data-theme") || resolvePreferredTheme();
  });

  useEffect(() => {
    setTheme(applyTheme(resolvePreferredTheme()));
  }, []);

  const set = (next) => {
    setTheme(persistTheme(next));
  };

  return (
    <div
      role="group"
      aria-label="Color theme"
      className={className}
      style={{
        display: "inline-flex",
        border: "1px solid var(--border)",
        background: "var(--panel-bg)",
      }}
    >
      {[
        { id: "light", label: "Light" },
        { id: "dark", label: "Dark" },
      ].map((option) => {
        const on = theme === option.id;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={on}
            onClick={() => set(option.id)}
            style={{
              minHeight: 36,
              padding: "6px 10px",
              border: 0,
              cursor: "pointer",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              background: on ? "var(--accent)" : "transparent",
              color: on ? "var(--accent-contrast)" : "var(--text-muted)",
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
