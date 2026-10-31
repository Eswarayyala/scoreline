import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { mergeFactCatalog } from "../../data/esportsFacts";
import { readFactsMuted, writeFactsMuted } from "../../data/siteTheme";

const SHOW_MS = 14_000;
const FIRST_DELAY_MS = 12_000;
const GAP_MIN_MS = 70_000;
const GAP_MAX_MS = 120_000;

const SPRING = { type: "spring", stiffness: 420, damping: 28, mass: 0.85 };

/**
 * Esports fact flyer — fixed bottom-left.
 * Signed-in users can mute once (persisted per uid in localStorage).
 */
export default function EsportsFactFlyer({
  popups = [],
  enabled = true,
  paused = false,
  userId = null,
}) {
  const reduce = useReducedMotion();
  const catalog = useMemo(() => mergeFactCatalog(popups), [popups]);
  const [fact, setFact] = useState(null);
  const [endsAt, setEndsAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [muted, setMuted] = useState(() => readFactsMuted(userId));

  useEffect(() => {
    setMuted(readFactsMuted(userId));
  }, [userId]);

  useEffect(() => {
    if (!enabled || muted || catalog.length === 0) return undefined;
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
  }, [enabled, catalog, paused, muted]);

  useEffect(() => {
    if (!fact) return undefined;
    const tick = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(tick);
  }, [fact]);

  const muteFacts = () => {
    if (!userId) return;
    writeFactsMuted(userId, true);
    setMuted(true);
    setFact(null);
  };

  const remaining = Math.max(0, endsAt - now);
  const progress = remaining / SHOW_MS;

  if (muted) return null;

  return (
    <AnimatePresence initial={false}>
      {fact ? (
        <motion.aside
          key={fact.id}
          role="status"
          aria-live="polite"
          initial={reduce ? false : { x: -48, y: 24, opacity: 0, scale: 0.96 }}
          animate={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          exit={reduce ? { opacity: 0 } : { x: -36, y: 16, opacity: 0, scale: 0.97 }}
          transition={reduce ? { duration: 0.15 } : SPRING}
          style={{
            position: "fixed",
            left: 16,
            bottom: 20,
            zIndex: 85,
            width: "min(100% - 32px, 340px)",
            padding: 14,
            background: "var(--panel-bg)",
            border: "1px solid var(--border-strong)",
            boxShadow: "var(--panel-shadow)",
            willChange: "transform",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
            <p
              className="m-0 font-mono text-[10px] uppercase tracking-[0.16em]"
              style={{ color: "var(--accent)" }}
            >
              Esports fact · {Math.ceil(remaining / 1000)}s
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {userId ? (
                <button
                  type="button"
                  onClick={muteFacts}
                  style={{
                    border: 0,
                    background: "transparent",
                    color: "var(--text-dim)",
                    cursor: "pointer",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  Mute
                </button>
              ) : null}
              <motion.button
                type="button"
                aria-label="Dismiss fact"
                onClick={() => setFact(null)}
                whileTap={reduce ? undefined : { scale: 0.88 }}
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
              </motion.button>
            </div>
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
              background: "color-mix(in srgb, var(--border) 80%, transparent)",
              overflow: "hidden",
            }}
          >
            <motion.div
              style={{
                height: "100%",
                width: "100%",
                originX: 0,
                background: "var(--accent)",
                willChange: "transform",
              }}
              initial={false}
              animate={{ scaleX: progress }}
              transition={{ duration: 0.25, ease: "linear" }}
            />
          </div>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}
