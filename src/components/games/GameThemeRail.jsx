import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { allGameThemes, gameDeskPath } from "../../data/gameThemes";
import { fadeUp, hoverLift, staggerDelay, tapPress } from "../../motion/presets";

const HOME_GAMES = [
  "Valorant",
  "CS2",
  "League of Legends",
  "Dota 2",
  "Apex Legends",
  "BGMI",
  "Overwatch 2",
  "Rocket League",
  "Free Fire",
  "Mobile Legends: Bang Bang",
];

/** Horizontal title strip — each tile carries that game’s theme. */
export default function GameThemeRail() {
  const reduce = useReducedMotion();
  const themes = allGameThemes().filter((theme) => HOME_GAMES.includes(theme.game));
  const ordered = HOME_GAMES.map((name) => themes.find((t) => t.game === name)).filter(Boolean);

  return (
    <section className="relative z-20 mt-8">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <div>
          <p className="m-0 font-mono text-[10px] uppercase tracking-[0.18em] text-neon">Play desks</p>
          <h2 className="m-0 font-['Bebas_Neue',sans-serif] text-3xl tracking-wide text-white">Games</h2>
        </div>
        <Link
          to="/games"
          className="font-mono text-[10px] uppercase tracking-widest text-neon no-underline"
        >
          All titles
        </Link>
      </div>
      <div
        className="flex gap-3 overflow-x-auto pb-2"
        style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" }}
      >
        {ordered.map((theme, index) => (
          <motion.div
            key={theme.slug}
            className="shrink-0"
            style={{ width: "min(168px, 42vw)", scrollSnapAlign: "start" }}
            {...fadeUp(reduce, staggerDelay(index, 0.04, reduce))}
            whileHover={hoverLift(reduce)}
            whileTap={tapPress}
          >
            <Link
              to={gameDeskPath(theme.game)}
              className="relative block aspect-[3/4] overflow-hidden border text-inherit no-underline"
              style={{ borderColor: `${theme.accent}55` }}
            >
              <img src={theme.poster || theme.background} alt="" className="absolute inset-0 h-full w-full object-cover" />
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(180deg, transparent 35%, ${theme.ink}f0 100%), radial-gradient(circle at 50% 0%, ${theme.glow}, transparent 55%)`,
                }}
              />
              <div className="absolute inset-x-0 bottom-0 p-3">
                <p className="m-0 font-mono text-[9px] uppercase tracking-widest" style={{ color: theme.accent }}>
                  {theme.mood}
                </p>
                <h3 className="mt-0.5 font-['Bebas_Neue',sans-serif] text-xl leading-none tracking-wide text-white">
                  {theme.game}
                </h3>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
