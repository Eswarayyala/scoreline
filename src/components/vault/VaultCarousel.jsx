import { useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { VAULT_SLIDES } from "../../data/platformShowcase";
import { HOME_WINDOW_LIMIT } from "../../data/floatingWindows";
import { fadeUp, hoverLift, staggerDelay, tapPress } from "../../motion/presets";
import TournamentWindowCard, { WINDOW_CARD_HEIGHT } from "./TournamentWindowCard";

/** Fit at least 2 windows across the home rail. */
const WINDOW_WIDTH = "min(280px, calc(50vw - 1.75rem))";

export default function VaultCarousel({ slides = VAULT_SLIDES }) {
  const reduce = useReducedMotion();
  const items = useMemo(() => slides.slice(0, HOME_WINDOW_LIMIT), [slides]);

  if (!items.length) {
    return (
      <section style={{ marginBottom: 8 }}>
        <Link to="/vault" style={{ color: "inherit", textDecoration: "none" }}>
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 40, margin: 0, letterSpacing: "0.02em" }}>The Vault</h1>
        </Link>
      </section>
    );
  }

  return (
    <section style={{ marginBottom: 8, position: "relative", zIndex: 1 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
        <Link to="/vault" style={{ color: "inherit", textDecoration: "none" }}>
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 40, margin: 0, letterSpacing: "0.02em" }}>The Vault</h1>
        </Link>
        <Link to="/vault" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--accent)", textDecoration: "none" }}>
          Open full catalog
        </Link>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          gap: 12,
          overflowX: "auto",
          paddingBottom: 10,
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {items.map((slide, index) => (
          <motion.div
            key={slide.slug || slide.id || `${slide.game}-${slide.spotlightEventKey || index}`}
            {...fadeUp(reduce, staggerDelay(index, 0.05, reduce))}
            whileHover={hoverLift(reduce)}
            whileTap={tapPress}
            style={{
              flex: `0 0 ${WINDOW_WIDTH}`,
              width: WINDOW_WIDTH,
              height: WINDOW_CARD_HEIGHT,
              overflow: "hidden",
              scrollSnapAlign: "start",
            }}
          >
            <TournamentWindowCard slide={slide} compact />
          </motion.div>
        ))}
      </div>
    </section>
  );
}
