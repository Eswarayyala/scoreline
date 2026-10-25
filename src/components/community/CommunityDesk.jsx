import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import SectionBackHome from "../layout/SectionBackHome";
import PageEnter from "../motion/PageEnter";
import { announcementMatchesViewer } from "../../data/scrimAlerts";
import { fadeUp, hoverLift, staggerDelay, tapPress } from "../../motion/presets";

/**
 * In-app social hub (Discord-lite): friends, following flyers, history — no Discord API.
 */
export default function CommunityDesk({
  user = null,
  announcements = [],
  alerts,
  friends = [],
  historyCount = 0,
  officialHosts = [],
  onOpenTournament,
  onOpenChats,
  onSignIn,
}) {
  const reduce = useReducedMotion();
  const flyers = [...announcements]
    .filter((item) => announcementMatchesViewer(item, alerts))
    .sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0))
    .slice(0, 8);
  const followingHosts = officialHosts.filter((host) => (alerts?.followedHosts || []).includes(host.uid));
  const quickLinks = [
    { to: "/find-players", label: "Find players", copy: "Match teammates" },
    { to: "/me/history", label: "Scrim history", copy: `${historyCount} joined` },
    { to: "/tournaments", label: "Scrims desk", copy: "Following filter" },
    { action: onOpenChats, label: "DMs", copy: `${friends.length} friends` },
  ];

  return (
    <PageEnter className="pb-16 pt-6">
      <SectionBackHome />
      <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Community desk</p>
      <h1 className="m-0 font-['Bebas_Neue',sans-serif] text-5xl text-white md:text-6xl">Your grind circle</h1>
      <p className="mt-2 max-w-xl text-sm text-slate-400">
        Friends, followed hosts, and flyers — stay on GrindInfo without leaving for Discord.
      </p>

      {!user ? (
        <motion.button
          type="button"
          onClick={onSignIn}
          className="mt-6 rounded-md border border-white/20 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-slate-300"
          {...fadeUp(reduce, 0.08)}
          whileTap={tapPress}
        >
          Sign in to open the desk
        </motion.button>
      ) : (
        <>
          <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {quickLinks.map((card, index) => {
              const body = (
                <>
                  <p className="m-0 font-display text-2xl text-white">{card.label}</p>
                  <p className="m-0 mt-1 font-mono text-[10px] uppercase tracking-widest text-slate-500">{card.copy}</p>
                </>
              );
              const motionProps = {
                ...fadeUp(reduce, staggerDelay(index, 0.05, reduce)),
                whileHover: hoverLift(reduce),
                whileTap: tapPress,
              };
              return card.to ? (
                <motion.div key={card.label} {...motionProps}>
                  <Link to={card.to} className="block rounded-lg border border-white/10 px-3 py-3 no-underline transition-colors hover:border-neon/40">
                    {body}
                  </Link>
                </motion.div>
              ) : (
                <motion.button
                  key={card.label}
                  type="button"
                  onClick={card.action}
                  className="rounded-lg border border-white/10 px-3 py-3 text-left transition-colors hover:border-neon/40"
                  {...motionProps}
                >
                  {body}
                </motion.button>
              );
            })}
          </div>

          <motion.section className="mt-10" {...fadeUp(reduce, 0.12)}>
            <h2 className="m-0 font-display text-2xl text-white">Following · official hosts</h2>
            {followingHosts.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">Follow verified hosts from scrim history or the Scrims org panel.</p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {followingHosts.map((host, index) => (
                  <motion.div key={host.uid} {...fadeUp(reduce, staggerDelay(index, 0.03, reduce))} whileHover={hoverLift(reduce)}>
                    <Link
                      to={`/hosts/${host.uid}`}
                      className="inline-block rounded-md border border-neon/30 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-neon no-underline"
                    >
                      {host.orgName || host.displayName || host.uid}
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.section>

          <motion.section className="mt-10" {...fadeUp(reduce, 0.16)}>
            <h2 className="m-0 font-display text-2xl text-white">Flyer feed</h2>
            {flyers.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">No matching flyers yet. Tune alert prefs from the bell.</p>
            ) : (
              <div className="mt-3 grid gap-2">
                {flyers.map((item, index) => (
                  <motion.button
                    key={item.tournamentId || item.id}
                    type="button"
                    onClick={() => onOpenTournament?.(item.tournamentId)}
                    className="flex w-full items-center gap-3 rounded-lg border border-white/10 px-3 py-2.5 text-left hover:border-neon/40"
                    {...fadeUp(reduce, staggerDelay(index, 0.04, reduce))}
                    whileHover={hoverLift(reduce)}
                    whileTap={tapPress}
                  >
                    {item.posterUrl ? (
                      <img src={item.posterUrl} alt="" className="h-12 w-9 shrink-0 rounded object-cover" />
                    ) : (
                      <div className="h-12 w-9 shrink-0 rounded bg-white/10" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-display text-xl text-white">{item.tournamentName}</span>
                      <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
                        {item.game}{item.hostName ? ` · ${item.hostName}` : ""}
                      </span>
                    </span>
                  </motion.button>
                ))}
              </div>
            )}
          </motion.section>

          <motion.section className="mt-10" {...fadeUp(reduce, 0.2)}>
            <h2 className="m-0 font-display text-2xl text-white">Friends online desk</h2>
            {friends.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">Add friends from Find players — DMs stay in GrindInfo.</p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {friends.slice(0, 24).map((friend, index) => (
                  <motion.span
                    key={friend.uid}
                    className="rounded-md border border-white/10 px-2 py-1 text-xs text-slate-300"
                    {...fadeUp(reduce, staggerDelay(index, 0.02, reduce))}
                  >
                    {friend.name || friend.displayName || "Player"}
                  </motion.span>
                ))}
              </div>
            )}
          </motion.section>
        </>
      )}
    </PageEnter>
  );
}
