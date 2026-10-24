import { Link } from "react-router-dom";
import SectionBackHome from "../layout/SectionBackHome";
import { announcementMatchesViewer } from "../../data/scrimAlerts";

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
  const flyers = [...announcements]
    .filter((item) => announcementMatchesViewer(item, alerts))
    .sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0))
    .slice(0, 8);
  const followingHosts = officialHosts.filter((host) => (alerts?.followedHosts || []).includes(host.uid));

  return (
    <div className="pb-16 pt-6">
      <SectionBackHome />
      <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Community desk</p>
      <h1 className="m-0 font-['Bebas_Neue',sans-serif] text-5xl text-white md:text-6xl">Your grind circle</h1>
      <p className="mt-2 max-w-xl text-sm text-slate-400">
        Friends, followed hosts, and flyers — stay on GrindInfo without leaving for Discord.
      </p>

      {!user ? (
        <button type="button" onClick={onSignIn} className="mt-6 rounded-md border border-white/20 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-slate-300">
          Sign in to open the desk
        </button>
      ) : (
        <>
          <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { to: "/find-players", label: "Find players", copy: "Match teammates" },
              { to: "/me/history", label: "Scrim history", copy: `${historyCount} joined` },
              { to: "/tournaments", label: "Scrims desk", copy: "Following filter" },
              { action: onOpenChats, label: "DMs", copy: `${friends.length} friends` },
            ].map((card) => (
              card.to ? (
                <Link key={card.label} to={card.to} className="rounded-lg border border-white/10 px-3 py-3 no-underline hover:border-neon/40">
                  <p className="m-0 font-display text-2xl text-white">{card.label}</p>
                  <p className="m-0 mt-1 font-mono text-[10px] uppercase tracking-widest text-slate-500">{card.copy}</p>
                </Link>
              ) : (
                <button key={card.label} type="button" onClick={card.action} className="rounded-lg border border-white/10 px-3 py-3 text-left hover:border-neon/40">
                  <p className="m-0 font-display text-2xl text-white">{card.label}</p>
                  <p className="m-0 mt-1 font-mono text-[10px] uppercase tracking-widest text-slate-500">{card.copy}</p>
                </button>
              )
            ))}
          </div>

          <section className="mt-10">
            <h2 className="m-0 font-display text-2xl text-white">Following · official hosts</h2>
            {followingHosts.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">Follow verified hosts from scrim history or the Scrims org panel.</p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {followingHosts.map((host) => (
                  <Link
                    key={host.uid}
                    to={`/hosts/${host.uid}`}
                    className="rounded-md border border-neon/30 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-neon no-underline"
                  >
                    {host.orgName || host.displayName || host.uid}
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="mt-10">
            <h2 className="m-0 font-display text-2xl text-white">Flyer feed</h2>
            {flyers.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">No matching flyers yet. Tune alert prefs from the bell.</p>
            ) : (
              <div className="mt-3 grid gap-2">
                {flyers.map((item) => (
                  <button
                    key={item.tournamentId || item.id}
                    type="button"
                    onClick={() => onOpenTournament?.(item.tournamentId)}
                    className="flex w-full items-center gap-3 rounded-lg border border-white/10 px-3 py-2.5 text-left hover:border-neon/40"
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
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="mt-10">
            <h2 className="m-0 font-display text-2xl text-white">Friends online desk</h2>
            {friends.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">Add friends from Find players — DMs stay in GrindInfo.</p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {friends.slice(0, 24).map((friend) => (
                  <span key={friend.uid} className="rounded-md border border-white/10 px-2 py-1 text-xs text-slate-300">
                    {friend.name || friend.displayName || "Player"}
                  </span>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
