import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { gameMatchesFilter } from "../../data/gameCatalog";

const SHOW_MS = 22_000;
const FIRST_DELAY_MS = 12_000;
const RESHOW_MIN_MS = 75_000;
const RESHOW_MAX_MS = 140_000;
const STORAGE_KEY = "grindinfo-scrim-motivate-seen";

function pickMotivateScrim(tournaments = [], { avoidGames = [], lastId = null } = {}) {
  const now = Date.now();
  const pool = tournaments.filter((t) => {
    if (!t?.id || t.id === lastId) return false;
    if (t.deleted || t.archived) return false;
    const status = String(t.status || "").toLowerCase();
    if (status === "closed" || status === "completed") return false;
    const start = Number(t.startsAt || t.startAt || 0);
    if (start && start < now - 6 * 60 * 60 * 1000) return false;
    return true;
  });
  if (!pool.length) return null;

  const avoid = avoidGames.filter(Boolean);
  const otherGame = pool.filter(
    (t) => avoid.length && !avoid.some((g) => gameMatchesFilter(t.game, g)),
  );
  const candidates = otherGame.length ? otherGame : pool;
  return candidates[Math.floor(Math.random() * candidates.length)] || null;
}

function formatCountdown(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${s}s`;
}

/**
 * Timed discover card on Scrims — random live/upcoming event to try another game,
 * independent of the user's current filters.
 */
export default function ScrimMotivatePop({
  tournaments = [],
  avoidGames = [],
  onOpen,
  enabled = true,
}) {
  const reduce = useReducedMotion();
  const [offer, setOffer] = useState(null);
  const [endsAt, setEndsAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [lastId, setLastId] = useState(null);

  const remaining = Math.max(0, endsAt - now);

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    let showTimer;
    let hideTimer;
    let loopTimer;

    const scheduleNext = (delay) => {
      loopTimer = window.setTimeout(run, delay);
    };

    const run = () => {
      if (cancelled || document.visibilityState !== "visible") {
        scheduleNext(20_000);
        return;
      }
      try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        const seen = raw ? JSON.parse(raw) : { ids: [] };
        const pick = pickMotivateScrim(tournaments, {
          avoidGames,
          lastId: lastId || seen.ids?.[seen.ids.length - 1],
        });
        if (!pick) {
          scheduleNext(45_000);
          return;
        }
        if (cancelled) return;
        setOffer(pick);
        setLastId(pick.id);
        const until = Date.now() + SHOW_MS;
        setEndsAt(until);
        const nextSeen = {
          ids: [...(seen.ids || []).slice(-12), pick.id],
          at: Date.now(),
        };
        try {
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(nextSeen));
        } catch {
          /* private mode */
        }
        hideTimer = window.setTimeout(() => {
          setOffer(null);
          const wait = RESHOW_MIN_MS + Math.random() * (RESHOW_MAX_MS - RESHOW_MIN_MS);
          scheduleNext(wait);
        }, SHOW_MS);
      } catch {
        scheduleNext(60_000);
      }
    };

    showTimer = window.setTimeout(run, FIRST_DELAY_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
      window.clearTimeout(loopTimer);
    };
  }, [enabled, tournaments, avoidGames, lastId]);

  useEffect(() => {
    if (!offer) return undefined;
    const tick = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(tick);
  }, [offer]);

  const blurb = useMemo(() => {
    if (!offer) return "";
    const game = offer.game || "another title";
    return `Jump into ${game} while seats are open — shake up the grind.`;
  }, [offer]);

  const dismiss = () => setOffer(null);

  return (
    <AnimatePresence>
      {offer ? (
        <motion.aside
          role="dialog"
          aria-label="Discover another scrim"
          initial={reduce ? false : { opacity: 0, y: 28, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduce ? undefined : { opacity: 0, y: 16, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          style={{
            position: "fixed",
            right: 16,
            bottom: 20,
            zIndex: 90,
            width: "min(100% - 32px, 340px)",
            padding: 16,
            background: "color-mix(in srgb, var(--panel-bg) 94%, transparent)",
            border: "1px solid color-mix(in srgb, var(--accent) 45%, var(--border))",
            boxShadow: "0 16px 48px rgba(0,0,0,0.55), 0 0 28px color-mix(in srgb, var(--accent) 18%, transparent)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
            <p
              className="m-0 font-mono text-[10px] uppercase tracking-[0.16em]"
              style={{ color: "var(--accent)" }}
            >
              Try another game · {formatCountdown(remaining)}
            </p>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss"
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
              fontSize: 26,
              margin: "8px 0 4px",
              letterSpacing: "0.02em",
              color: "var(--page-text)",
            }}
          >
            {offer.name || offer.title || "Open scrim"}
          </h3>
          <p className="m-0 font-mono text-[11px] uppercase tracking-wider text-[var(--accent-secondary)]">
            {offer.game || "Scrim"}
            {offer.region ? ` · ${offer.region}` : ""}
          </p>
          <p style={{ margin: "8px 0 14px", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.45 }}>
            {blurb}
          </p>
          <div
            aria-hidden="true"
            style={{
              height: 3,
              marginBottom: 12,
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
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => {
                onOpen?.(offer.id);
                dismiss();
              }}
              style={{
                flex: 1,
                minHeight: 40,
                border: "1px solid var(--accent)",
                background: "var(--accent)",
                color: "var(--accent-contrast)",
                cursor: "pointer",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              Jump in
            </button>
            <button
              type="button"
              onClick={dismiss}
              style={{
                minHeight: 40,
                padding: "0 12px",
                border: "1px solid var(--border)",
                background: "transparent",
                color: "var(--page-text)",
                cursor: "pointer",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              Skip
            </button>
          </div>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}
