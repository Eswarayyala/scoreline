import { useMemo } from "react";
import { Link } from "react-router-dom";
import { VAULT_SLIDES } from "../../data/platformShowcase";
import { HOME_WINDOW_LIMIT } from "../../data/floatingWindows";
import TournamentWindowCard, { WINDOW_CARD_HEIGHT } from "./TournamentWindowCard";
import FocusRail from "../motion/FocusRail";

export default function VaultCarousel({ slides = VAULT_SLIDES }) {
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
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 4 }}>
        <Link to="/vault" style={{ color: "inherit", textDecoration: "none" }}>
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 40, margin: 0, letterSpacing: "0.02em" }}>The Vault</h1>
        </Link>
        <Link to="/vault" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--accent)", textDecoration: "none" }}>
          Open full catalog
        </Link>
      </div>

      <FocusRail
        items={items}
        ariaLabel="Vault windows"
        height={WINDOW_CARD_HEIGHT}
        slotWidth="min(290px, 72vw)"
        focusScale={1.1}
        peerScale={0.84}
        getKey={(slide, index) => slide.slug || slide.id || `${slide.game}-${slide.spotlightEventKey || index}`}
        renderItem={(slide) => (
          <div style={{ height: "100%", width: "100%" }}>
            <TournamentWindowCard slide={slide} compact />
          </div>
        )}
      />
    </section>
  );
}
