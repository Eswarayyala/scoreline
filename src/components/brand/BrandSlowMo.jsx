import { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { GrindInfoMark } from "./GrindInfoLogo";
import {
  DEFAULT_LOGO_ID,
  LOGO_OPTIONS,
  readStoredLogoId,
  writeStoredLogoId,
} from "./logoCollection";

const SLOW = 3.2;

/** Pick from your OneDrive collection + slow-mo motion preview. */
export default function BrandSlowMo() {
  const reduce = useReducedMotion();
  const [tick, setTick] = useState(0);
  const [nav, setNav] = useState("Home");
  const [selected, setSelected] = useState(() => readStoredLogoId());
  const replay = () => setTick((n) => n + 1);

  const ease = [0.22, 1, 0.36, 1];
  const dur = (s) => (reduce ? 0.12 : s * SLOW);

  const apply = (id) => {
    setSelected(id);
    writeStoredLogoId(id);
    window.dispatchEvent(new Event("grindinfo-logo-change"));
    setTick((n) => n + 1);
  };

  return (
    <div className="mx-auto max-w-4xl pb-20 pt-4 text-[var(--page-text,#edf1f4)]">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--accent-secondary,#3b82ff)]">
            Your collection · pick a mark
          </p>
          <h1
            className="mt-1 text-4xl tracking-wide"
            style={{ fontFamily: "'Bebas Neue', sans-serif" }}
          >
            Logo picker
          </h1>
          <p className="mt-2 max-w-lg text-sm text-slate-400">
            Pulled from OneDrive Saved Pictures. Active pick:{" "}
            <span className="text-white">{LOGO_OPTIONS.find((o) => o.id === selected)?.label || DEFAULT_LOGO_ID}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={replay}
          className="rounded-md border border-white/15 bg-white/5 px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-white hover:bg-white/10"
        >
          Replay motion
        </button>
      </div>

      <section className="mb-12">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {LOGO_OPTIONS.map((opt) => {
            const on = selected === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => apply(opt.id)}
                className={`rounded-xl border p-3 text-left transition ${
                  on
                    ? "border-[var(--accent,#ff2d95)] bg-white/8 ring-1 ring-[var(--accent,#ff2d95)]/40"
                    : "border-white/10 bg-[#0b0f14] hover:border-white/25"
                }`}
              >
                <div className="flex h-36 items-center justify-center rounded-lg bg-black/50">
                  <img
                    src={opt.src}
                    alt={opt.label}
                    className="max-h-32 max-w-full object-contain"
                  />
                </div>
                <p className="mt-3 font-mono text-[11px] uppercase tracking-wider text-white">
                  {on ? "✓ " : ""}
                  {opt.label}
                </p>
                <p className="mt-1 text-xs text-slate-500">{opt.note}</p>
              </button>
            );
          })}
        </div>
        <p className="mt-4 text-xs text-slate-500">
          Full concept sheet also at{" "}
          <a className="text-slate-300 underline" href="/brand/collection/logo-a.png" target="_blank" rel="noreferrer">
            /brand/collection/logo-a.png
          </a>
        </p>
      </section>

      <section className="mb-14">
        <p className="mb-4 font-mono text-[10px] uppercase tracking-widest text-slate-500">
          Live header preview · slow-mo enter
        </p>
        <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-[#0b0f14] py-14">
          <AnimatePresence mode="wait">
            <motion.span
              key={`lockup-${tick}-${selected}`}
              className="inline-flex items-center gap-3"
              initial={reduce ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: dur(0.45), ease }}
            >
              <motion.span
                initial={reduce ? false : { rotate: -12, scale: 0.86 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: reduce ? 400 : 90, damping: reduce ? 28 : 14 }}
              >
                <GrindInfoMark height={64} />
              </motion.span>
              <span className="inline-flex flex-col leading-none">
                <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 42, letterSpacing: "0.04em" }}>
                  GRINDINFO
                </span>
                <span className="mt-1 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--accent-secondary,#3b82ff)]">
                  Tournament ops
                </span>
              </span>
            </motion.span>
          </AnimatePresence>
        </div>
      </section>

      <section className="mb-10">
        <p className="mb-4 font-mono text-[10px] uppercase tracking-widest text-slate-500">
          Nav underline · click to move
        </p>
        <div className="rounded-2xl border border-white/10 bg-[#0b0f14] px-4 py-6">
          <div className="flex flex-wrap gap-1 border-b border-white/10">
            {["Home", "Scrims", "Vault"].map((label) => {
              const on = nav === label;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setNav(label)}
                  className={`relative min-h-10 px-3 py-2.5 font-mono text-[11px] uppercase tracking-wider ${
                    on ? "text-white" : "text-slate-500"
                  }`}
                >
                  {label}
                  {on ? (
                    <motion.span
                      layoutId={reduce ? undefined : "slowmo-nav-underline"}
                      className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-[var(--accent,#ff2d95)]"
                      transition={{
                        type: "spring",
                        stiffness: reduce ? 380 : 70,
                        damping: reduce ? 32 : 18,
                      }}
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <Link to="/" className="font-mono text-[11px] uppercase tracking-widest text-slate-400 no-underline hover:text-white">
        ← Back home
      </Link>
    </div>
  );
}
