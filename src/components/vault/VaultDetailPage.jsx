import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Bookmark, BookmarkCheck, ExternalLink, Trophy } from "lucide-react";
import { bannerForGame, flyersForGame, VAULT_SLIDES } from "../../data/platformShowcase";
import { analysisTypeLabel } from "../../data/blogAnalysis";
import { publicScopeKicker } from "../../data/eventScope";
import EventTabs from "./EventTabs";
import ChampionshipGameTabs from "./ChampionshipGameTabs";
import WatchNextRail from "./WatchNextRail";
import StreamEmbed from "../shared/StreamEmbed";
import { useGameBanner } from "../../hooks/useMediaLibrary";

export default function VaultDetailPage({
  liveEntries = [],
  slug,
  slides = VAULT_SLIDES,
  bookmarked = false,
  onToggleBookmark,
}) {
  const slide = slides.find((item) => item.slug === slug) || VAULT_SLIDES.find((item) => item.slug === slug);
  const related = useMemo(
    () => liveEntries.filter((entry) => String(entry.game || "").toLowerCase() === String(slide?.game || "").toLowerCase()).slice(0, 6),
    [liveEntries, slide],
  );
  const gameBackground = useGameBanner(slide?.game, bannerForGame(slide?.game));
  const flyers = useMemo(
    () => flyersForGame(slide?.game, [gameBackground, ...(slide?.flyers || [])]).slice(0, 6),
    [gameBackground, slide],
  );
  const [activeFlyer, setActiveFlyer] = useState(slide?.poster || flyers[0] || "");
  useEffect(() => {
    setActiveFlyer(slide?.poster || flyers[0] || "");
  }, [slide, flyers]);

  if (!slide) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16 text-center">
        <h1 className="font-display text-5xl text-white">Slide not in The Vault</h1>
        <p className="mt-3 text-slate-400">That highlight window does not exist yet.</p>
        <Link to="/vault" className="mt-6 inline-flex items-center gap-2 text-neon">
          {" "}
          <ArrowLeft size={16} /> The Vault
        </Link>
      </div>
    );
  }

  return (
    <article className="mx-auto max-w-5xl px-5 pb-20 pt-6">
      <div className="mb-5 flex flex-wrap items-center gap-4">
        <Link to="/vault" className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-neon">
          <ArrowLeft size={14} /> The Vault
        </Link>
        {(slide.research || slide.surface === "research" || slide.surface === "ewc-window") && (
          <Link to="/vault/ewc" className="font-mono text-xs uppercase tracking-widest text-amber-300">
            EWC index
          </Link>
        )}
        {onToggleBookmark && (
          <button
            type="button"
            onClick={() => onToggleBookmark(slide.slug)}
            className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-amber-300"
          >
            {bookmarked ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
            {bookmarked ? "Bookmarked" : "Bookmark"}
          </button>
        )}
      </div>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-[0_30px_80px_rgba(0,0,0,0.45)]"
      >
        <div className="relative aspect-video max-h-[420px]">
          <img src={activeFlyer || slide.poster} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-neon">
              {[publicScopeKicker(slide), slide.game].filter(Boolean).join(" · ")}
            </p>
            <h1 className="font-display text-5xl text-white md:text-7xl">{slide.title}</h1>
            <p className="mt-1 text-slate-300">{slide.season}</p>
          </div>
        </div>
        <div className={`grid gap-8 p-6 md:p-8 ${slide.blog ? "" : "md:grid-cols-[1.4fr_0.8fr]"}`}>
          <div>
            <p className="whitespace-pre-wrap text-base leading-7 text-slate-200">
              {slide.blog ? slide.fullContent || slide.summary : slide.summary}
            </p>
            {!!slide.championship?.games?.length && (
              <ChampionshipGameTabs games={slide.championship.games} heading="Titles in this championship" />
            )}
            {slide.blog && slide.authorName && (
              <p className="mt-3 text-sm text-slate-400">
                By {slide.authorName}
                {slide.analysisType ? ` · ${analysisTypeLabel(slide.analysisType)} analysis` : ""}
                {slide.analysisSubject ? ` · ${slide.analysisSubject}` : ""}
              </p>
            )}
            {slide.blog && (
              <div className="mt-2 flex flex-wrap gap-3 text-sm">
                {slide.youtubeUrl && (
                  <a href={slide.youtubeUrl} target="_blank" rel="noreferrer" className="text-neon">
                    YouTube
                  </a>
                )}
                {slide.docsUrl && (
                  <a href={slide.docsUrl} target="_blank" rel="noreferrer" className="text-neon">
                    Docs
                  </a>
                )}
                {slide.source && (
                  <a href={slide.source} target="_blank" rel="noreferrer" className="text-neon">
                    Source
                  </a>
                )}
              </div>
            )}
            {slide.blog && <StreamEmbed url={slide.youtubeUrl} title="Match clip / stream" />}
            {!slide.blog && flyers.length > 1 && (
              <div className="mt-6 grid grid-cols-3 gap-2">
                {flyers.slice(0, 3).map((src) => (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setActiveFlyer(src)}
                    className={`overflow-hidden rounded-xl border ${activeFlyer === src ? "border-neon" : "border-white/10"}`}
                  >
                    <img src={src} alt="" className="h-20 w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
            {(slide.fullName || slide.peakPrizePool || slide.region) && (
              <p className="mt-3 text-sm text-slate-400">
                {[slide.fullName, slide.region, slide.peakPrizePool && `Peak prize pool ${slide.peakPrizePool}`]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
            {!slide.blog && !!slide.yearlyStats?.length && (
              <section className="mt-8">
                <h2 className="font-display text-3xl text-white">Tournaments by year</h2>
                <table className="mt-3 w-full text-left text-sm text-slate-300">
                  <thead>
                    <tr className="text-slate-500">
                      <th className="py-1 pr-3 font-mono text-[10px] uppercase tracking-widest">Year</th>
                      <th className="py-1 pr-3 font-mono text-[10px] uppercase tracking-widest">Held</th>
                      <th className="py-1 pr-3 font-mono text-[10px] uppercase tracking-widest">Circuit</th>
                      <th className="py-1 font-mono text-[10px] uppercase tracking-widest">Region</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slide.yearlyStats.map((row) => (
                      <tr key={`${row.year}-${row.circuit}`} className="border-t border-white/5">
                        <td className="py-2 pr-3">{row.year}</td>
                        <td className="py-2 pr-3">{row.tournamentCount}</td>
                        <td className="py-2 pr-3">{row.circuit}</td>
                        <td className="py-2">{row.region}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}
            {!slide.blog && !!slide.relatedTournaments?.length && (
              <section className="mt-8">
                <h2 className="font-display text-3xl text-white">Related past tournaments</h2>
                <ul className="mt-3 space-y-2 text-sm text-slate-300">
                  {slide.relatedTournaments.map((row) => (
                    <li key={`${row.year}-${row.name}`} className="border-t border-white/5 pt-2">
                      <strong className="text-white">{row.name}</strong>
                      <span className="text-slate-400"> · {[row.year, row.region, row.result].filter(Boolean).join(" · ")}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {!slide.blog && !!slide.editions?.length && (
              <EventTabs
                editions={slide.editions}
                game={slide.game}
                fallbackPoster={slide.poster}
                onSelectPoster={setActiveFlyer}
              />
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
                {slide.liveEmbedUrl && (
                  <a className="text-neon" href={slide.liveEmbedUrl} target="_blank" rel="noreferrer">
                    Open live telecast
                  </a>
                )}
                <StreamEmbed url={slide.liveEmbedUrl || slide.youtubeUrl} title="Live stream overlay" />
                {!!slide.pointsTable?.length && (
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-slate-500">
                        <th>Group</th>
                        <th>Team</th>
                        <th>Pts</th>
                        <th>W</th>
                      </tr>
                    </thead>
                    <tbody>
                      {slide.pointsTable.map((row, i) => (
                        <tr key={i}>
                          <td>{row.group}</td>
                          <td>{row.team}</td>
                          <td>{row.points}</td>
                          <td>{row.wins}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
            {slide.eventStatus === "upcoming" && (
              <div className="mt-5 space-y-1 text-sm text-slate-300">
                <p>{slide.seasonTitle}</p>
                <p>
                  {slide.startAt} → {slide.endAt}
                </p>
                {slide.registrationUrl && (
                  <a className="text-neon" href={slide.registrationUrl} target="_blank" rel="noreferrer">
                    Register
                  </a>
                )}
              </div>
            )}
            <WatchNextRail slides={slides} current={slide} />
          </div>
          {!slide.blog && (
            <aside className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-volt">
                <Trophy size={14} /> Live Vault records
              </p>
              {related.length === 0 ? (
                <p className="text-sm text-slate-400">
                  No published results for {slide.game} yet.
                </p>
              ) : (
                related.map((entry) => (
                  <div key={entry.id} className="border-t border-white/10 py-3 first:border-t-0 first:pt-0">
                    <div className="font-display text-xl text-white">{entry.tournament}</div>
                    <div className="text-sm text-slate-400">
                      {entry.eventDate} · Winner {entry.winner}
                    </div>
                    {entry.source && (
                      <a
                        href={entry.source}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-xs text-neon"
                      >
                        <ExternalLink size={12} /> Source
                      </a>
                    )}
                  </div>
                ))
              )}
            </aside>
          )}
        </div>
      </motion.div>
    </article>
  );
}
