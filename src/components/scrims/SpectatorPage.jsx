import { Link } from "react-router-dom";
import SectionBackHome from "../layout/SectionBackHome";
import PageEnter from "../motion/PageEnter";
import DynamicPointsTable from "../shared/DynamicPointsTable";
import { scrimAccessLabel, isPublicScrim } from "../../data/scrimAccess";

function fmtDate(value) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return String(value);
  }
}

export default function SpectatorPage({
  tournament,
  standings = [],
  official = false,
  following = false,
  currentUserId = null,
  onToggleFollow,
  onSignIn,
  onCopyLink,
  posterUrl = "",
}) {
  if (!tournament) {
    return (
      <div className="pt-10">
        <SectionBackHome />
        <h1 className="m-0 font-['Bebas_Neue',sans-serif] text-5xl text-white">Scrim not found</h1>
        <p className="mt-2 text-sm text-slate-400">This flyer link is missing or was removed.</p>
        <Link to="/tournaments" className="mt-4 inline-block font-mono text-xs uppercase tracking-wider text-neon">All scrims</Link>
      </div>
    );
  }

  const results = tournament.results || {};
  const hasResults = Boolean(results.winner);
  const rows = Array.isArray(tournament.standings) && tournament.standings.length
    ? tournament.standings
    : standings;

  return (
    <PageEnter className="pb-16 pt-6">
      <SectionBackHome />
      <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Spectator · read only</p>
      <div className="mt-2 grid gap-6 lg:grid-cols-[minmax(0,320px)_1fr]">
        <div>
          <div className="aspect-video overflow-hidden rounded-xl border border-white/10">
            {posterUrl ? <img src={posterUrl} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full bg-white/5" />}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={onCopyLink} className="rounded-md border border-white/20 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-slate-300">
              Copy watch link
            </button>
            <Link to={`/tournaments/${tournament.id}`} className="rounded-md border border-neon/40 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-neon no-underline">
              Open desk
            </Link>
          </div>
        </div>
        <div>
          <h1 className="m-0 font-['Bebas_Neue',sans-serif] text-5xl tracking-wide text-white md:text-6xl">{tournament.name}</h1>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-slate-500">
            {tournament.game} · {scrimAccessLabel(tournament)} · {tournament.status || "upcoming"}
          </p>
          <p className="mt-2 text-sm text-slate-400">
            {fmtDate(tournament.startDate)}
            {tournament.endDate ? ` – ${fmtDate(tournament.endDate)}` : ""}
            {Number(tournament.prizeAmount) > 0 ? ` · Prize ₹${Number(tournament.prizeAmount).toLocaleString()}` : " · Free"}
          </p>
          <p className="mt-3 text-sm text-slate-300">
            Hosted by{" "}
            <Link to={`/hosts/${tournament.adminUserId}`} className="text-neon no-underline">
              {tournament.adminDisplayName || "Host"}
            </Link>
            {official ? " · Official" : ""}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {currentUserId && currentUserId !== tournament.adminUserId ? (
              <button
                type="button"
                onClick={() => onToggleFollow?.(tournament.adminUserId, !following)}
                className={`rounded-md border px-3 py-2 font-mono text-[10px] uppercase tracking-widest ${
                  following ? "border-neon/50 text-neon" : "border-white/20 text-slate-300"
                }`}
              >
                {following ? "Following host" : "Follow host"}
              </button>
            ) : null}
            {!currentUserId ? (
              <button type="button" onClick={onSignIn} className="rounded-md border border-white/20 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-slate-300">
                Sign in to follow
              </button>
            ) : null}
            {!isPublicScrim(tournament) ? (
              <span className="rounded-md border border-white/10 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-slate-500">
                Private desk — join from Open desk
              </span>
            ) : null}
          </div>

          {tournament.blurb ? <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-400">{tournament.blurb}</p> : null}

          {hasResults ? (
            <section className="mt-8">
              <h2 className="m-0 font-display text-2xl text-white">Final results</h2>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ["Winner", results.winner],
                  ["MVP", results.mvp],
                  ["Runner-up", results.runnerUp],
                  ["2nd Runner-up", results.secondRunnerUp],
                ].filter(([, value]) => value).map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-white/10 px-3 py-3">
                    <p className="m-0 font-mono text-[10px] uppercase tracking-widest text-slate-500">{label}</p>
                    <p className="m-0 mt-1 font-display text-2xl text-white">{value}</p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {rows.length > 0 ? (
            <div className="mt-6">
              <DynamicPointsTable readOnly initialRows={rows} />
            </div>
          ) : null}
        </div>
      </div>
    </PageEnter>
  );
}
