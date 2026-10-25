import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import PageEnter from "../motion/PageEnter";
import SectionBackHome from "../layout/SectionBackHome";
import { allGameThemes, gameDeskPath } from "../../data/gameThemes";
import { fadeUp, hoverLift, staggerDelay, tapPress } from "../../motion/presets";

export default function GamesDirectoryPage() {
  const reduce = useReducedMotion();
  const themes = allGameThemes();

  return (
    <PageEnter className="pb-28 pt-6">
      <SectionBackHome />
      <header className="mb-8 mt-2">
        <p className="m-0 font-mono text-[11px] uppercase tracking-[0.2em] text-neon">Title desks</p>
        <h1 className="mt-1 font-['Bebas_Neue',sans-serif] text-5xl tracking-wide text-white md:text-6xl">
          Games
        </h1>
        <p className="mt-2 max-w-xl text-sm text-slate-400">
          Each title gets its own color, art, and desk — vault windows and scrims filtered to that game.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {themes.map((theme, index) => (
          <motion.div
            key={theme.slug}
            className="isolate"
            {...fadeUp(reduce, staggerDelay(index, 0.03, reduce))}
            whileHover={hoverLift(reduce)}
            whileTap={tapPress}
          >
            <Link
              to={gameDeskPath(theme.game)}
              className="group relative block aspect-[4/5] overflow-hidden border border-white/10 text-inherit no-underline sm:aspect-[3/4]"
              style={{
                borderColor: `${theme.accent}44`,
                boxShadow: `inset 0 0 0 1px ${theme.accent}22`,
              }}
            >
              <img
                src={theme.poster || theme.background}
                alt=""
                className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                style={{ objectPosition: "50% 18%" }}
              />
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(180deg, ${theme.ink}22 0%, ${theme.ink}88 48%, ${theme.ink}f2 100%), radial-gradient(circle at 80% 12%, ${theme.glow}, transparent 42%)`,
                }}
              />
              <div className="relative z-10 flex h-full flex-col justify-end p-4">
                <p className="m-0 font-mono text-[10px] uppercase tracking-widest" style={{ color: theme.accent }}>
                  {theme.mood}
                </p>
                <h2 className="mt-1 font-['Bebas_Neue',sans-serif] text-3xl leading-none tracking-wide text-white">
                  {theme.game}
                </h2>
                <p className="mt-1 line-clamp-2 text-xs text-white/75">{theme.tagline}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </PageEnter>
  );
}
