import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { VAULT_SLIDES } from "../../data/platformShowcase";

export default function VaultCarousel({ slides = VAULT_SLIDES, onOpenSlide }) {
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
    <section className="relative z-20 -mt-6 mb-8">
      <div className="mb-4 flex items-end justify-between gap-4 px-1">
        <div>
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-neon">The Vault</p>
          <h2 className="font-display text-4xl tracking-wide text-white md:text-5xl">Floating circuit windows</h2>
        </div>
        <div className="flex gap-2">
          <button type="button" aria-label="Previous Vault slide" onClick={() => scrollTo(active - 1)} className="grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-slate-950/70 text-white hover:border-neon hover:text-neon">
            <ChevronLeft size={18} />
          </button>
          <button type="button" aria-label="Next Vault slide" onClick={() => scrollTo(active + 1)} className="grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-slate-950/70 text-white hover:border-neon hover:text-neon">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div
        ref={trackRef}
        className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-8 pt-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((slide, index) => (
          <motion.button
            key={slide.slug}
            data-slide={index}
            type="button"
            onClick={() => onOpenSlide(slide.slug)}
            onFocus={() => setActive(index)}
            className="relative w-[min(78vw,340px)] shrink-0 snap-center text-left"
            style={{ transformStyle: "preserve-3d" }}
            initial={{ y: 18, opacity: 0 }}
            animate={reduce ? { y: 0, opacity: 1 } : { y: [0, -10, 0], opacity: 1 }}
            transition={reduce ? { duration: 0.3 } : { y: { duration: 4.4 + index * 0.15, repeat: Infinity, ease: "easeInOut" }, opacity: { duration: 0.45, delay: index * 0.05 } }}
            whileHover={reduce ? undefined : { y: -22, rotateX: 5, rotateY: -4, scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="overflow-hidden rounded-2xl border border-white/15 bg-slate-950/80 shadow-[0_24px_60px_rgba(0,0,0,0.45),0_0_40px_rgba(34,243,196,0.12)] backdrop-blur-xl">
              <div className="relative h-48 overflow-hidden">
                <img src={slide.poster} alt="" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full border border-neon/40 bg-slate-950/70 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-neon">
                  <Sparkles size={12} /> {slide.kicker}
                </span>
              </div>
              <div className="space-y-1 p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">{slide.game} · {slide.season}</p>
                <h3 className="font-display text-3xl text-white">{slide.title}</h3>
                <p className="line-clamp-2 text-sm text-slate-300">{slide.summary}</p>
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      <div className="flex justify-center gap-2">
        {items.map((slide, index) => (
          <button
            key={slide.slug}
            type="button"
            aria-label={`Show ${slide.title}`}
            onClick={() => scrollTo(index)}
            className={`h-1.5 rounded-full transition-all ${active === index ? "w-8 bg-neon" : "w-3 bg-white/20"}`}
          />
        ))}
      </div>
      <AnimatePresence>
        {items[active] && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 text-center font-mono text-[11px] uppercase tracking-widest text-slate-500">
            Open {items[active].title} → /vault/{items[active].slug}
          </motion.p>
        )}
      </AnimatePresence>
    </section>
  );
}
