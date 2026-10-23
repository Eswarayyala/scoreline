import { useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { VAULT_SLIDES } from "../../data/platformShowcase";
import { publicScopeKicker } from "../../data/eventScope";
import { HOME_WINDOW_LIMIT } from "../../data/floatingWindows";

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
          gap: 14,
          overflowX: "auto",
          paddingBottom: 8,
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {items.map((slide, index) => (
          <motion.div
            key={slide.slug || slide.id}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: reduce ? 0.2 : 0.35, delay: reduce ? 0 : index * 0.04 }}
            whileHover={reduce ? undefined : { y: -6 }}
            whileTap={{ scale: 0.98 }}
            style={{ flex: "0 0 min(260px, 78vw)", scrollSnapAlign: "start" }}
          >
            <Link to={`/vault/${slide.slug}`} style={{ display: "block", color: "inherit", textDecoration: "none" }}>
              <div style={{ overflow: "hidden", borderRadius: 16, border: "1px solid var(--border)", background: "var(--panel-bg)", boxShadow: "var(--panel-shadow)" }}>
                <div className="relative aspect-video overflow-hidden">
                  <img src={slide.poster} alt="" className="h-full w-full object-cover" />
                  <span style={{ position: "absolute", left: 10, top: 10, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--accent-secondary)", background: "rgba(12,16,24,0.88)", border: "1px solid var(--border)", borderRadius: 999, padding: "3px 8px" }}>
                    {publicScopeKicker(slide) || slide.game}
                  </span>
                </div>
                <div style={{ padding: "10px 12px 12px" }}>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "var(--text-dim)", letterSpacing: "0.08em", textTransform: "uppercase" }}>{slide.game}</div>
                  <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, margin: "4px 0 0", lineHeight: 1.1 }}>{slide.title}</h3>
                  {!!(slide.flyers || []).length && (
                    <div style={{ display: "flex", gap: 6, marginTop: 8, overflow: "hidden" }}>
                      {(slide.flyers || []).slice(0, 3).map((src) => (
                        <img key={src.slice(0, 48)} src={src} alt="" style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 8, border: "1px solid var(--border)" }} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
