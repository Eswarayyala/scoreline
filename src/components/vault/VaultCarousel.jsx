import { useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { VAULT_SLIDES } from "../../data/platformShowcase";
import { HOME_WINDOW_LIMIT } from "../../data/floatingWindows";
import TournamentWindowCard from "./TournamentWindowCard";

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
          gap: 16,
          overflowX: "auto",
          paddingBottom: 10,
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {items.map((slide, index) => (
          <motion.div
            key={slide.slug || slide.id}
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: reduce ? 0.2 : 0.4, delay: reduce ? 0 : index * 0.05 }}
            whileHover={reduce ? undefined : { y: -6 }}
            whileTap={{ scale: 0.985 }}
            style={{ flex: "0 0 min(380px, 86vw)", scrollSnapAlign: "start" }}
          >
            <TournamentWindowCard slide={slide} compact />
          </motion.div>
        ))}
      </div>
    </section>
  );
}
