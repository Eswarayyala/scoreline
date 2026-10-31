import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { mergeFactCatalog } from "../../data/esportsFacts";

const SHOW_MS = 14_000;
const FIRST_DELAY_MS = 18_000;
const GAP_MIN_MS = 55_000;
const GAP_MAX_MS = 110_000;

const CORNERS = [
  { key: "br", initial: { x: 80, y: 60, opacity: 0 }, style: { right: 16, bottom: 20 } },
  { key: "bl", initial: { x: -80, y: 60, opacity: 0 }, style: { left: 16, bottom: 20 } },
  { key: "tr", initial: { x: 80, y: -60, opacity: 0 }, style: { right: 16, top: 88 } },
  { key: "tl", initial: { x: -80, y: -60, opacity: 0 }, style: { left: 16, top: 88 } },
];

/**
 * Random esports fact flyers — built-in catalog + owner “fact” popups.
 * Works for guests and signed-in users; does not block the page.
 */
export default function EsportsFactFlyer({
  popups = [],
  enabled = true,
  paused = false,
}) {
  const reduce = useReducedMotion();
  const catalog = useMemo(() => mergeFactCatalog(popups), [popups]);
  const [fact, setFact] = useState(null);
  const [corner, setCorner] = useState(CORNERS[0]);
  const [endsAt, setEndsAt] = useState(0);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!enabled || catalog.length === 0) return undefined;
    let cancelled = false;
    let showTimer;
    let hideTimer;
    let loopTimer;
    let lastId = null;

    const schedule = (ms) => {
      loopTimer = window.setTimeout(run, ms);
    };

    const run = () => {
      if (cancelled) return;
      if (paused || document.visibilityState !== "visible") {
        schedule(20_000);
        return;
      }
      const fromCatalog = catalog.filter((item) => item.id !== lastId);
      const pool = fromCatalog.length ? fromCatalog : catalog;
      const pick = pool[Math.floor(Math.random() * pool.length)];
      if (!pick) {
        schedule(60_000);
        return;
      }
      lastId = pick.id;
      setCorner(CORNERS[Math.floor(Math.random() * CORNERS.length)]);
      setFact(pick);
      setEndsAt(Date.now() + SHOW_MS);
      hideTimer = window.setTimeout(() => {
        setFact(null);
        const gap = GAP_MIN_MS + Math.random() * (GAP_MAX_MS - GAP_MIN_MS);
        schedule(gap);
      }, SHOW_MS);
    };

    showTimer = window.setTimeout(run, FIRST_DELAY_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
      window.clearTimeout(loopTimer);
    };
  }, [enabled, catalog, paused]);

  useEffect(() => {
    if (!fact) return undefined;
    const tick = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(tick);
  }, [fact]);

  const remaining = Math.max(0, endsAt - now);

  return (
    <AnimatePresence>
      {fact ? (
        <motion.aside
          key={`${fact.id}-${corner.key}`}
          role="status"
          aria-live="polite"
          initial={reduce ? false : corner.initial}
          animate={{ x: 0, y: 0, opacity: 1 }}
          exit={reduce ? undefined : { ...corner.initial, opacity: 0 }}
          transition={{ type: "spring", stiffness: 280, damping: 24 }}
          style={{
            position: "fixed",
            zIndex: 85,
            width: "min(100% - 32px, 340px)",
            padding: 14,
            background: "color-mix(in srgb, var(--panel-bg) 94%, transparent)",
            border: "1px solid color-mix(in srgb, var(--accent) 40%, var(--border))",
            boxShadow:
              "0 16px 40px rgba(0,0,0,0.5), 0 0 24px color-mix(in srgb, var(--accent) 16%, transparent)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            ...corner.style,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
            <p
              className="m-0 font-mono text-[10px] uppercase tracking-[0.16em]"
              style={{ color: "var(--accent)" }}
            >
              Esports fact · {Math.ceil(remaining / 1000)}s
            </p>
            <button
              type="button"
              aria-label="Dismiss fact"
              onClick={() => setFact(null)}
              style={{
                border: 0,
                background: "transparent",
                color: "var(--text-muted)",
                cursor: "pointer",
                fontSize: 16,
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
          <h3
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 24,
              margin: "8px 0 6px",
              letterSpacing: "0.02em",
              color: "var(--page-text)",
            }}
          >
            {fact.title}
          </h3>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: "var(--text-muted)" }}>
            {fact.message}
          </p>
          <div
            aria-hidden="true"
            style={{
              height: 3,
              marginTop: 12,
              background: "rgba(255,255,255,0.08)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${(remaining / SHOW_MS) * 100}%`,
                background: "var(--accent)",
                transition: "width 0.25s linear",
              }}
            />
          </div>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}
