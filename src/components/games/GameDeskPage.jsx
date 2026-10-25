import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import PageEnter from "../motion/PageEnter";
import SectionBackHome from "../layout/SectionBackHome";
import TournamentWindowCard, { WINDOW_CARD_HEIGHT } from "../vault/TournamentWindowCard";
import GameCommunityStrip from "./GameCommunityStrip";
import { fadeUp, hoverLift, staggerDelay, tapPress } from "../../motion/presets";
import { themeForGame, gameFromDeskSlug, gameDeskPath } from "../../data/gameThemes";
import { gameMatchesFilter } from "../../data/gameCatalog";
import { DISCORD_SURFACE } from "../../data/discordCommunity";
import { scrimWindowSlide } from "../../data/scrimPhase";

export default function GameDeskPage({
  slug = "",
  vaultSlides = [],
  tournaments = [],
  blogPosts = [],
  onOpenScrim,
}) {
  const reduce = useReducedMotion();
  const game = gameFromDeskSlug(slug);
  const theme = themeForGame(game || slug);

  if (!game) {
    return (
      <PageEnter className="pb-16 pt-6">
        <SectionBackHome />
        <h1 className="mt-6 font-['Bebas_Neue',sans-serif] text-5xl text-white">Game desk not found</h1>
        <p className="mt-2 text-sm text-slate-400">That title does not have a themed desk yet.</p>
        <Link to="/games" className="mt-6 inline-block font-mono text-xs uppercase tracking-widest text-neon no-underline">
          ← All game desks
        </Link>
      </PageEnter>
    );
  }

  const vaultHits = vaultSlides
    .filter((slide) => gameMatchesFilter(slide.game, game) && !slide.blog)
    .slice(0, 6);
  const scrimHits = tournaments
    .filter((item) => gameMatchesFilter(item.game, game) && !item.archived)
    .slice(0, 6);
  const blogHits = blogPosts
    .filter((post) => post.status === "published" && gameMatchesFilter(post.game, game))
    .slice(0, 4);

  return (
    <PageEnter style={theme.cssVars} className="pb-28">
      <SectionBackHome />
      <section className="relative isolate -mx-5 mb-10 min-h-[64vh] overflow-hidden sm:min-h-[70vh]">
        <img
          src={theme.background}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: "50% 20%" }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: `
              linear-gradient(105deg, ${theme.ink}f2 0%, ${theme.ink}cc 42%, ${theme.ink}66 70%, transparent 100%),
              linear-gradient(180deg, transparent 40%, ${theme.ink}f5 100%),
              radial-gradient(circle at 78% 28%, ${theme.glow}, transparent 42%)
            `,
          }}
        />
        <div className="relative z-10 flex min-h-[64vh] flex-col justify-end px-5 pb-10 pt-8 sm:min-h-[70vh] sm:pb-14">
          <div className="mb-auto flex flex-wrap items-center gap-4 pt-1">
            <Link
              to="/games"
              className="font-mono text-[10px] uppercase tracking-widest no-underline"
              style={{ color: theme.accentSecondary }}
            >
              All games
            </Link>
          </div>

          <motion.div {...fadeUp(reduce, 0.06)} className="max-w-3xl">
            <p
              className="m-0 font-mono text-[11px] uppercase tracking-[0.22em]"
              style={{ color: theme.accent }}
            >
              {theme.mood} · Game desk
            </p>
            <h1
              className="mt-2 font-['Bebas_Neue',sans-serif] text-[clamp(3.4rem,12vw,6.5rem)] leading-[0.9] tracking-wide text-white"
              style={{ textShadow: `0 0 48px ${theme.glow}` }}
            >
              {theme.game}
            </h1>
            <p
              className="mt-4 max-w-xl font-['Bebas_Neue',sans-serif] text-2xl tracking-wide sm:text-3xl"
              style={{ color: theme.accentSecondary }}
            >
              {theme.headline}
            </p>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/80 sm:text-base">
              {theme.tagline}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to={`/tournaments?game=${encodeURIComponent(theme.game)}`}
                className="inline-flex min-h-11 items-center px-5 font-mono text-[11px] uppercase tracking-widest no-underline"
                style={{ background: theme.accent, color: theme.ink }}
              >
                Open scrims
              </Link>
              <Link
                to="/vault"
                className="inline-flex min-h-11 items-center border px-5 font-mono text-[11px] uppercase tracking-widest text-white no-underline"
                style={{ borderColor: `${theme.accent}88` }}
              >
                Browse vault
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="relative z-0 pb-8">
        <motion.section {...fadeUp(reduce, 0.1)} className="mb-12">
          <p className="m-0 font-mono text-[10px] uppercase tracking-widest" style={{ color: theme.accent }}>
            Live windows
          </p>
          <h2 className="mt-1 font-['Bebas_Neue',sans-serif] text-3xl tracking-wide text-white">
            Vault · {theme.game}
          </h2>
          {vaultHits.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">No vault windows for this title yet.</p>
          ) : (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {vaultHits.map((slide, index) => (
                <motion.div
                  key={slide.slug || slide.id || index}
                  className="isolate overflow-hidden"
                  style={{ height: WINDOW_CARD_HEIGHT }}
                  {...fadeUp(reduce, staggerDelay(index, 0.04, reduce))}
                  whileHover={hoverLift(reduce)}
                  whileTap={tapPress}
                >
                  <TournamentWindowCard slide={slide} compact />
                </motion.div>
              ))}
            </div>
          )}
        </motion.section>

        <motion.section {...fadeUp(reduce, 0.14)} className="mb-12">
          <p className="m-0 font-mono text-[10px] uppercase tracking-widest" style={{ color: theme.accent }}>
            Scrim desk
          </p>
          <h2 className="mt-1 font-['Bebas_Neue',sans-serif] text-3xl tracking-wide text-white">
            Open lookouts
          </h2>
          {scrimHits.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">No active scrims for this title right now.</p>
          ) : (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {scrimHits.map((t, index) => {
                const slide = scrimWindowSlide(t);
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
                      onOpen={() => onOpenScrim?.(t.id)}
                    />
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.section>

        {DISCORD_SURFACE ? (
          <div className="mb-12">
            <GameCommunityStrip
              game={theme.game}
              accent={theme.accent}
              accentSecondary={theme.accentSecondary}
              ink={theme.ink}
            />
          </div>
        ) : null}

        {blogHits.length > 0 && (
          <motion.section {...fadeUp(reduce, 0.18)}>
            <p className="m-0 font-mono text-[10px] uppercase tracking-widest" style={{ color: theme.accent }}>
              Stories
            </p>
            <h2 className="mt-1 font-['Bebas_Neue',sans-serif] text-3xl tracking-wide text-white">
              From the blog
            </h2>
            <div className="mt-5 grid gap-3">
              {blogHits.map((post, index) => (
                <motion.article
                  key={post.id}
                  className="border border-white/10 bg-black/25 p-4"
                  style={{ borderColor: `${theme.accent}33` }}
                  {...fadeUp(reduce, staggerDelay(index, 0.04, reduce))}
                >
                  <p className="m-0 font-mono text-[10px] uppercase tracking-widest" style={{ color: theme.accent }}>
                    {post.game}
                  </p>
                  <h3 className="mt-1 font-['Bebas_Neue',sans-serif] text-2xl text-white">{post.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-400">{post.content}</p>
                </motion.article>
              ))}
            </div>
            <Link
              to="/blog"
              className="mt-4 inline-block font-mono text-[10px] uppercase tracking-widest no-underline"
              style={{ color: theme.accent }}
            >
              Open blog →
            </Link>
          </motion.section>
        )}

        <div className="mt-14 border-t border-white/10 pt-6">
          <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">More desks</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {["Valorant", "CS2", "League of Legends", "Dota 2", "Apex Legends", "BGMI"]
              .filter((name) => name !== theme.game)
              .map((name) => {
                const chip = themeForGame(name);
                return (
                  <Link
                    key={name}
                    to={gameDeskPath(name)}
                    className="border px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-white no-underline"
                    style={{ borderColor: `${chip.accent}66`, color: chip.accentSecondary }}
                  >
                    {name}
                  </Link>
                );
              })}
          </div>
        </div>
      </div>
    </PageEnter>
  );
}
