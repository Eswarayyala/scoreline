import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import TournamentWindowCard, { WINDOW_CARD_HEIGHT } from "../vault/TournamentWindowCard";
import { fadeUp, hoverLift, staggerDelay, tapPress } from "../../motion/presets";
import { scrimWindowSlide } from "../../data/scrimPhase";
import {
  pickScrimTodayWindows,
  resolveTodayGameDefault,
  todayGameChoices,
} from "../../data/scrimToday";
import { canonicalFilterGame } from "../../data/gameCatalog";

/**
 * One row on Scrims: Open / Check-in / Live for the player's game.
 * Game chips also drive alert prefs when onToggleAlertGame is provided.
 */
export default function ScrimTodayStrip({
  tournaments = [],
  alertGames = [],
  profileGames = [],
  queryGame = "",
  currentUserId = null,
  currentUserName = "",
  onOpen,
  onToggleAlertGame = null,
  notifyChosen = false,
}) {
  const reduce = useReducedMotion();
  const choices = useMemo(
    () => todayGameChoices({ alertGames, profileGames, queryGame }),
    [alertGames, profileGames, queryGame],
  );
  const defaultGame = useMemo(
    () => resolveTodayGameDefault({ alertGames, profileGames, queryGame, tournaments }),
    [alertGames, profileGames, queryGame, tournaments],
  );
  const [game, setGame] = useState(defaultGame);

  useEffect(() => {
    if (!game && defaultGame) setGame(defaultGame);
    if (game && choices.length && !choices.some((item) => item.toLowerCase() === game.toLowerCase()) && defaultGame) {
      setGame(defaultGame);
    }
  }, [defaultGame, choices, game]);

  const rows = useMemo(
    () => pickScrimTodayWindows(tournaments, { game, limit: 8 }),
    [tournaments, game],
  );
  const alertSet = useMemo(
    () => new Set((alertGames || []).map((item) => canonicalFilterGame(item).toLowerCase())),
    [alertGames],
  );
  const gameOnAlerts = game ? alertSet.has(canonicalFilterGame(game).toLowerCase()) : false;

  if (!tournaments.length && !choices.length) return null;

  return (
    <section className="mb-6 border-b border-white/10 pb-5">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="m-0 font-mono text-[10px] uppercase tracking-widest text-slate-500">Today</p>
          <h2 className="m-0 font-display text-2xl text-white">
            {game ? `${game} · open / check-in / live` : "Open / check-in / live"}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {choices.map((item) => {
            const active = canonicalFilterGame(game).toLowerCase() === item.toLowerCase();
            const alerting = alertSet.has(item.toLowerCase());
            return (
              <button
                key={item}
                type="button"
                onClick={() => setGame(item)}
                className={`rounded-md border px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest ${
                  active
                    ? "border-neon/50 text-neon"
                    : alerting
                      ? "border-white/25 text-slate-200"
                      : "border-white/15 text-slate-500"
                }`}
              >
                {item}
              </button>
            );
          })}
          {currentUserId && game && onToggleAlertGame && notifyChosen ? (
            <button
              type="button"
              onClick={() => onToggleAlertGame(game, !gameOnAlerts)}
              className={`rounded-md border px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest ${
                gameOnAlerts ? "border-neon/40 text-neon" : "border-white/15 text-slate-400"
              }`}
            >
              {gameOnAlerts ? "Following game" : "Follow game"}
            </button>
          ) : null}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="m-0 text-sm text-slate-500">
          {game
            ? `No open, check-in, or live ${game} windows right now.`
            : "No open, check-in, or live windows right now."}
        </p>
      ) : (
        <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
          {rows.map(({ scrim, statusLabel }, index) => {
            const slide = scrimWindowSlide(scrim, { currentUserId, currentUserName });
            return (
              <motion.div
                key={scrim.id}
                className="relative w-[260px] shrink-0 overflow-hidden sm:w-[280px]"
                style={{ height: WINDOW_CARD_HEIGHT }}
                {...fadeUp(reduce, staggerDelay(index, 0.04, reduce))}
                whileHover={hoverLift(reduce)}
                whileTap={tapPress}
              >
                <span className="pointer-events-none absolute left-2 top-2 z-10 rounded border border-white/20 bg-black/55 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-white">
                  {statusLabel}
                </span>
                <TournamentWindowCard
                  slide={slide}
                  compact
                  to={`/tournaments/${scrim.id}`}
                  onOpen={() => onOpen?.(scrim.id)}
                />
              </motion.div>
            );
          })}
        </div>
      )}
    </section>
  );
}
