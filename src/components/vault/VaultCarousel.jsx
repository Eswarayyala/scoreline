import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { VAULT_SLIDES } from "../../data/platformShowcase";

const navBtn = {
  width: 36,
  height: 36,
  borderRadius: 999,
  border: "1px solid var(--border)",
  background: "var(--panel-bg)",
  color: "var(--page-text)",
  cursor: "pointer",
  display: "grid",
  placeItems: "center",
};

export default function VaultCarousel({ slides = VAULT_SLIDES }) {
  const reduce = useReducedMotion();
  const trackRef = useRef(null);
  const [active, setActive] = useState(0);
  const items = useMemo(() => slides.slice(0, 10), [slides]);

  const scrollTo = (index) => {
    const next = (index + items.length) % items.length;
    setActive(next);
    const node = trackRef.current?.querySelector(`[data-slide="${next}"]`);
    node?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", inline: "center", block: "nearest" });
  };

  return (
    <section style={{ marginBottom: 8, overflow: "hidden", position: "relative", zIndex: 1 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
        <Link to="/vault" style={{ color: "inherit", textDecoration: "none" }}>
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 40, margin: 0, letterSpacing: "0.02em" }}>The Vault</h1>
        </Link>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button type="button" aria-label="Previous Vault slide" onClick={() => scrollTo(active - 1)} style={navBtn}>
            <ChevronLeft size={18} />
          </button>
          <button type="button" aria-label="Next Vault slide" onClick={() => scrollTo(active + 1)} style={navBtn}>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div
        ref={trackRef}
        style={{ display: "flex", gap: 14, overflowX: "auto", padding: "6px 2px 14px", scrollbarWidth: "none" }}
      >
        {items.map((slide, index) => (
          <motion.div
            key={slide.slug}
            data-slide={index}
            onFocus={() => setActive(index)}
            style={{
              flex: "0 0 260px",
              width: 260,
              textAlign: "left",
              color: "inherit",
            }}
            initial={{ y: 10, opacity: 0 }}
            animate={reduce ? { y: 0, opacity: 1 } : { y: [0, -8, 0], opacity: 1 }}
            transition={reduce ? { duration: 0.25 } : { y: { duration: 4.2 + index * 0.12, repeat: Infinity, ease: "easeInOut" }, opacity: { duration: 0.35 } }}
            whileHover={reduce ? undefined : { y: -14, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Link to={`/vault/${slide.slug}`} style={{ display: "block", color: "inherit", textDecoration: "none" }}>
            <div style={{ overflow: "hidden", borderRadius: 16, border: "1px solid var(--border)", background: "var(--panel-bg)", boxShadow: "var(--panel-shadow)" }}>
              <div className="relative aspect-video overflow-hidden">
                <img src={slide.poster} alt="" className="h-full w-full object-cover" />
                <span style={{ position: "absolute", left: 10, top: 10, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--accent-secondary)", background: "rgba(23,17,15,0.78)", border: "1px solid var(--border)", borderRadius: 999, padding: "3px 8px" }}>
                  {slide.kicker}
                </span>
              </div>
              <div style={{ padding: "10px 12px 12px" }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "var(--text-dim)", letterSpacing: "0.08em", textTransform: "uppercase" }}>{slide.game}</div>
                <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, margin: "4px 0 0", lineHeight: 1.1 }}>{slide.title}</h3>
              </div>
            </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
