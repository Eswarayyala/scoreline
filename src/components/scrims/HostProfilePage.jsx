import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import TournamentWindowCard from "../vault/TournamentWindowCard";
import SectionBackHome from "../layout/SectionBackHome";
import PageEnter from "../motion/PageEnter";
import { scrimAccessLabel } from "../../data/scrimAccess";
import { scrimWindowSlide } from "../../data/scrimPhase";
import { rollupHostAnalytics, formatHostAnalyticsLine } from "../../data/hostAnalytics";
import { fadeUp, hoverLift, staggerDelay, tapPress } from "../../motion/presets";

function isPastScrim(item) {
  return item?.archived === true || item?.status === "completed" || item?.status === "closed";
}

export default function HostProfilePage({
  hostUid,
  host,
  official = false,
  tournaments = [],
  currentUserId = null,
  following = false,
  onToggleFollow,
  onOpenTournament,
  onSignIn,
}) {
  const reduce = useReducedMotion();
  const name = host?.orgName || host?.displayName || host?.adminDisplayName || "Host";
  const hosted = tournaments.filter((item) => item.adminUserId === hostUid);
  const live = hosted.filter((item) => !isPastScrim(item));
  const past = hosted.filter((item) => isPastScrim(item)).slice(0, 24);
  const analytics = rollupHostAnalytics(tournaments, hostUid);
  const followerHint = official ? "Official host" : "Community host";

  return (
    <PageEnter className="pb-16 pt-6">
      <SectionBackHome />
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">{followerHint}</p>
          <h1 className="m-0 font-['Bebas_Neue',sans-serif] text-5xl tracking-wide text-white md:text-6xl">{name}</h1>
          <p className="mt-2 max-w-xl text-sm text-slate-400">
            {formatHostAnalyticsLine(analytics)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {currentUserId && currentUserId !== hostUid && official ? (
            <motion.button
              type="button"
              onClick={() => onToggleFollow?.(hostUid, !following)}
              className={`rounded-md border px-3 py-2 font-mono text-[10px] uppercase tracking-widest ${
                following ? "border-neon/50 text-neon" : "border-white/20 text-slate-300"
              }`}
              whileTap={tapPress}
            >
              {following ? "Following" : "Follow"}
            </motion.button>
          ) : null}
          {!currentUserId && official ? (
            <button type="button" onClick={onSignIn} className="rounded-md border border-white/20 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-slate-300">
              Sign in to follow
            </button>
          ) : null}
          <Link to="/tournaments" className="rounded-md border border-white/20 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-slate-400 no-underline">
            All scrims
          </Link>
        </div>
      </div>

      <section className="mb-8 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Live", analytics.live],
          ["Completed", analytics.completed],
          ["Published flyers", analytics.published],
          ["Results rate", `${analytics.resultsRate}%`],
        ].map(([label, value], index) => (
          <motion.div
            key={label}
            className="rounded-lg border border-white/10 px-3 py-3"
            {...fadeUp(reduce, staggerDelay(index, 0.05, reduce))}
          >
            <p className="m-0 font-mono text-[10px] uppercase tracking-widest text-slate-500">{label}</p>
            <p className="m-0 mt-1 font-display text-3xl text-white">{value}</p>
          </motion.div>
        ))}
      </section>

      <section className="mb-10">
        <h2 className="m-0 font-display text-2xl text-white">Live / upcoming</h2>
        {live.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No open scrims from this host right now.</p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {live.map((t, index) => (
              <motion.div
                key={t.id}
                className="h-[280px] overflow-hidden"
                {...fadeUp(reduce, staggerDelay(index, 0.05, reduce))}
                whileHover={hoverLift(reduce)}
                whileTap={tapPress}
              >
                <TournamentWindowCard
                  compact
                  slide={{
                    ...scrimWindowSlide(t),
                    kicker: scrimAccessLabel(t),
                  }}
                  to={`/tournaments/${t.id}`}
                  onOpen={() => onOpenTournament?.(t.id)}
                />
              </motion.div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="m-0 font-display text-2xl text-white">Past scrims</h2>
        {past.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No archived events yet.</p>
        ) : (
          <div className="mt-4 grid gap-2">
            {past.map((t, index) => (
              <motion.button
                key={t.id}
                type="button"
                onClick={() => onOpenTournament?.(t.id)}
                className="flex w-full items-center justify-between gap-3 rounded-lg border border-white/10 px-3 py-2.5 text-left hover:border-neon/40"
                {...fadeUp(reduce, staggerDelay(index, 0.03, reduce))}
                whileHover={hoverLift(reduce)}
                whileTap={tapPress}
              >
                <span>
                  <span className="block font-display text-xl text-white">{t.name}</span>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
                    {t.game} · {scrimAccessLabel(t)} · {t.status || "closed"}
                    {t.results?.winner ? ` · Winner ${t.results.winner}` : ""}
                    {Array.isArray(t.standings) && t.standings.length ? ` · ${t.standings.length} standings` : ""}
                  </span>
                </span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Open</span>
              </motion.button>
            ))}
          </div>
        )}
      </section>
    </PageEnter>
  );
}
