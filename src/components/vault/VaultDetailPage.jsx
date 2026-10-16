import { useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ExternalLink, Trophy } from "lucide-react";
import { VAULT_SLIDES } from "../../data/platformShowcase";
import { editionsNewestFirst, researchHighlightLabels } from "../../data/esportsResearch";

export default function VaultDetailPage({ liveEntries = [], slug, slides = VAULT_SLIDES }) {
  const slide = slides.find((item) => item.slug === slug) || VAULT_SLIDES.find((item) => item.slug === slug);
  const related = useMemo(
    () => liveEntries.filter((entry) => String(entry.game || "").toLowerCase() === String(slide?.game || "").toLowerCase()).slice(0, 6),
    [liveEntries, slide],
  );

  if (!slide) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16 text-center">
        <h1 className="font-display text-5xl text-white">Slide not in The Vault</h1>
        <p className="mt-3 text-slate-400">That highlight window does not exist yet.</p>
        <Link to="/vault" className="mt-6 inline-flex items-center gap-2 text-neon"> <ArrowLeft size={16} /> The Vault</Link>
      </div>
    );
  }

  return (
    <article className="mx-auto max-w-5xl px-5 pb-20 pt-6">
      <Link to="/vault" className="mb-5 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-neon">
        <ArrowLeft size={14} /> The Vault
      </Link>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
        <div className="relative aspect-video max-h-[420px]">
          <img src={slide.poster} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-neon">{slide.kicker} · {slide.game}</p>
            <h1 className="font-display text-5xl text-white md:text-7xl">{slide.title}</h1>
            <p className="mt-1 text-slate-300">{slide.season}</p>
          </div>
        </div>
        <div className="grid gap-8 p-6 md:grid-cols-[1.4fr_0.8fr] md:p-8">
          <div>
            <p className="text-base leading-7 text-slate-200">{slide.summary}</p>
            {(slide.fullName || slide.genre || slide.peakPrizePool) && (
              <p className="mt-3 text-sm text-slate-400">
                {[slide.fullName, slide.genre, slide.type, slide.peakPrizePool && `Peak prize pool ${slide.peakPrizePool}`].filter(Boolean).join(" · ")}
              </p>
            )}
            {!!slide.editions?.length && (
              <div className="mt-8 space-y-8">
                {editionsNewestFirst(slide.editions).map((edition) => (
                  <section key={`${edition.year}-${edition.event}`} className="border-t border-white/10 pt-6">
                    <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-volt">{edition.year}</p>
                    <h2 className="font-display text-3xl text-white">{edition.event}</h2>
                    <p className="mt-1 text-sm text-slate-400">Prize pool {edition.prizePool}</p>
                    {!!edition.payouts?.length && (
                      <table className="mt-4 w-full text-left text-sm text-slate-300">
                        <thead>
                          <tr className="text-slate-500">
                            <th className="py-1 pr-3 font-mono text-[10px] uppercase tracking-widest">Place</th>
                            <th className="py-1 pr-3 font-mono text-[10px] uppercase tracking-widest">
                              {edition.payouts.some((row) => row.team) && edition.payouts.some((row) => row.player)
                                ? "Team / player"
                                : edition.payouts.some((row) => row.player)
                                  ? "Player"
                                  : "Team"}
                            </th>
                            <th className="py-1 font-mono text-[10px] uppercase tracking-widest">Prize</th>
                          </tr>
                        </thead>
                        <tbody>
                          {edition.payouts.map((row) => (
                            <tr key={`${edition.year}-${row.rank}`} className="border-t border-white/5">
                              <td className="py-2 pr-3">{row.rank}</td>
                              <td className="py-2 pr-3">{row.team || row.player}</td>
                              <td className="py-2">{row.prize}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                    {edition.highlights && (
                      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                        {researchHighlightLabels().map(([key, label]) =>
                          edition.highlights[key] ? (
                            <div key={key} className="rounded-xl border border-white/10 bg-white/5 p-3">
                              <dt className="font-mono text-[10px] uppercase tracking-widest text-neon">{label}</dt>
                              <dd className="mt-1 text-sm leading-6 text-slate-200">{edition.highlights[key]}</dd>
                            </div>
                          ) : null,
                        )}
                      </dl>
                    )}
                  </section>
                ))}
              </div>
            )}
            {slide.eventStatus === "completed" && !slide.editions?.length && (
              <dl className="mt-5 grid gap-2 text-sm text-slate-300">
                {slide.winners && <div>Winners · {slide.winners}</div>}
                {slide.runnerUps && <div>Runner-ups · {slide.runnerUps}</div>}
                {slide.secondRunnerUps && <div>Second runner-ups · {slide.secondRunnerUps}</div>}
                {slide.mvp && <div>MVP · {slide.mvp}</div>}
                {slide.bestIgl && <div>Best IGL · {slide.bestIgl}</div>}
                {slide.fanFavourite && <div>Fan favourite · {slide.fanFavourite}</div>}
                {slide.bestClutches && <div>Best clutches · {slide.bestClutches}</div>}
              </dl>
            )}
            {slide.eventStatus === "live" && (
              <div className="mt-5 space-y-3 text-sm text-slate-300">
                <p>Stage · {slide.activeStage}</p>
                {slide.liveEmbedUrl && <a className="text-neon" href={slide.liveEmbedUrl} target="_blank" rel="noreferrer">Open live telecast</a>}
                {!!slide.pointsTable?.length && (
                  <table className="w-full text-left text-xs">
                    <thead><tr className="text-slate-500"><th>Group</th><th>Team</th><th>Pts</th><th>W</th></tr></thead>
                    <tbody>{slide.pointsTable.map((row, i) => <tr key={i}><td>{row.group}</td><td>{row.team}</td><td>{row.points}</td><td>{row.wins}</td></tr>)}</tbody>
                  </table>
                )}
              </div>
            )}
            {slide.eventStatus === "upcoming" && (
              <div className="mt-5 space-y-1 text-sm text-slate-300">
                <p>{slide.seasonTitle}</p>
                <p>{slide.startAt} → {slide.endAt}</p>
                {slide.registrationUrl && <a className="text-neon" href={slide.registrationUrl} target="_blank" rel="noreferrer">Register</a>}
              </div>
            )}
          </div>
          <aside className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-volt">
              <Trophy size={14} /> Live Vault records
            </p>
            {related.length === 0 ? (
              <p className="text-sm text-slate-400">No published results for {slide.game} yet. Paste them from the staff desk when you are ready.</p>
            ) : related.map((entry) => (
              <div key={entry.id} className="border-t border-white/10 py-3 first:border-t-0 first:pt-0">
                <div className="font-display text-xl text-white">{entry.tournament}</div>
                <div className="text-sm text-slate-400">{entry.eventDate} · Winner {entry.winner}</div>
                {entry.source && <a href={entry.source} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-neon"><ExternalLink size={12} /> Source</a>}
              </div>
            ))}
          </aside>
        </div>
      </motion.div>
    </article>
  );
}
