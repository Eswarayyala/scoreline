import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import SectionBackHome from "../layout/SectionBackHome";
import PageEnter from "../motion/PageEnter";
import { sortScrimHistory } from "../../data/scrimHistory";
import { scrimAccessLabel } from "../../data/scrimAccess";
import { fadeUp, hoverLift, staggerDelay, tapPress } from "../../motion/presets";

export default function PlayerScrimHistory({
  rows = [],
  officialHosts = [],
  followedHosts = [],
  onToggleFollow,
  onOpenTournament,
  onSignIn,
  currentUserId = null,
}) {
  const reduce = useReducedMotion();
  const list = sortScrimHistory(rows);
  const officialSet = new Set(officialHosts.map((host) => host.uid));

  return (
    <PageEnter className="pb-16 pt-6">
      <SectionBackHome />
      <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Your circuit</p>
      <h1 className="m-0 font-['Bebas_Neue',sans-serif] text-5xl text-white md:text-6xl">Scrim history</h1>
      <p className="mt-2 max-w-xl text-sm text-slate-400">
        Events you joined stay here. Open a host profile and follow verified desks you want flyers from.
      </p>

      {!currentUserId ? (
        <motion.button
          type="button"
          onClick={onSignIn}
          className="mt-6 rounded-md border border-white/20 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-slate-300"
          {...fadeUp(reduce, 0.08)}
          whileTap={tapPress}
        >
          Sign in to see history
        </motion.button>
      ) : list.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">No joins yet. Enter a public scrim or accept an invite — it will show up here.</p>
      ) : (
        <div className="mt-6 grid gap-2">
          {list.map((row, index) => {
            const official = officialSet.has(row.hostUid);
            const following = (followedHosts || []).includes(row.hostUid);
            return (
              <motion.div
                key={row.tournamentId || row.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 px-3 py-3"
                {...fadeUp(reduce, staggerDelay(index, 0.04, reduce))}
                whileHover={hoverLift(reduce)}
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => onOpenTournament?.(row.tournamentId)}
                >
                  <span className="block font-display text-xl text-white">{row.tournamentName}</span>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
                    {row.game} · {scrimAccessLabel({ joinMode: row.joinMode })} · {row.status}
                    {row.resultWinner ? ` · Winner ${row.resultWinner}` : ""}
                  </span>
                  <span className="mt-1 block text-xs text-slate-400">
                    Hosted by {row.hostName || "Host"}
                    {official ? " · Official" : ""}
                  </span>
                </button>
                <div className="flex flex-wrap gap-2">
                  <Link
                    to={`/hosts/${row.hostUid}`}
                    className="rounded-md border border-white/15 px-2 py-1.5 font-mono text-[10px] uppercase tracking-widest text-slate-300 no-underline"
                  >
                    Host
                  </Link>
                  {official && currentUserId !== row.hostUid ? (
                    <button
                      type="button"
                      className={`rounded-md border px-2 py-1.5 font-mono text-[10px] uppercase tracking-widest ${
                        following ? "border-neon/50 text-neon" : "border-white/15 text-slate-400"
                      }`}
                      onClick={() => onToggleFollow?.(row.hostUid, !following)}
                    >
                      {following ? "Following" : "Follow"}
                    </button>
                  ) : null}
                  <Link
                    to={`/tournaments/${row.tournamentId}/watch`}
                    className="rounded-md border border-white/15 px-2 py-1.5 font-mono text-[10px] uppercase tracking-widest text-slate-400 no-underline"
                  >
                    Watch
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </PageEnter>
  );
}
