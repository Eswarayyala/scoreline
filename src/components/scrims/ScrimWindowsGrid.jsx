import { motion, useReducedMotion } from "motion/react";
import TournamentWindowCard, { WINDOW_CARD_HEIGHT } from "../vault/TournamentWindowCard";
import { fadeUp, hoverLift, staggerDelay, tapPress } from "../../motion/presets";
import { scrimWindowSlide } from "../../data/scrimPhase";

/** Scrims desk cards with phase-aware live / check-in / open / results chrome. */
export default function ScrimWindowsGrid({
  tournaments = [],
  currentUserId = null,
  currentUserName = "",
  officialHostIds = [],
  onOpen,
}) {
  const reduce = useReducedMotion();
  const official = new Set((officialHostIds || []).map(String).filter(Boolean));

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        gap: 14,
      }}
    >
      {tournaments.map((t, index) => {
        const slide = scrimWindowSlide(t, {
          currentUserId,
          currentUserName,
          verifiedHost: official.has(String(t.adminUserId || "")),
        });
        return (
          <motion.div
            key={t.id}
            className="isolate overflow-hidden"
            style={{ height: WINDOW_CARD_HEIGHT }}
            {...fadeUp(reduce, staggerDelay(index, 0.04, reduce))}
            whileHover={hoverLift(reduce)}
            whileTap={tapPress}
          >
            <TournamentWindowCard
              slide={slide}
              compact
              to={`/tournaments/${t.id}`}
              onOpen={() => onOpen(t.id)}
            />
          </motion.div>
        );
      })}
    </div>
  );
}
