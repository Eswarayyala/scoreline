import { motion, useReducedMotion } from "framer-motion";
import TournamentWindowCard, { WINDOW_CARD_HEIGHT } from "../vault/TournamentWindowCard";
import { fadeUp, hoverLift, staggerDelay, tapPress } from "../../motion/presets";
import { isPublicScrim, scrimFlyerBadges } from "../../data/scrimAccess";

/** Scrims desk cards with the same stagger / lift as vault home windows. */
export default function ScrimWindowsGrid({
  tournaments = [],
  currentUserId = null,
  currentUserName = "",
  onOpen,
}) {
  const reduce = useReducedMotion();

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        gap: 14,
      }}
    >
      {tournaments.map((t, index) => {
        const slide = {
          ...t,
          surface: "scrim",
          title: t.name,
          eventStatus: t.status || "upcoming",
          kicker: `Hosted by ${t.adminDisplayName || (t.adminUserId === currentUserId ? currentUserName : "Scrim host")}`,
          region: [t.region, t.rankBand].filter(Boolean).join(" · ") || t.region,
          mode: isPublicScrim(t) ? "Public" : "Private",
          flyerBadges: scrimFlyerBadges(t),
          teamCount: t.maxSlots || "",
          startAt: t.startDate,
          endAt: t.endDate,
          prizePool: Number(t.prizeAmount) > 0 ? `₹${Number(t.prizeAmount).toLocaleString()}` : "",
        };
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
