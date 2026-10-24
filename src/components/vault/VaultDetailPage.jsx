import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Bookmark, BookmarkCheck, ExternalLink, Trophy } from "lucide-react";
import { bannerForGame, flyerForEvent, VAULT_SLIDES } from "../../data/platformShowcase";
import { analysisTypeLabel } from "../../data/blogAnalysis";
import ExpandableBlogBody from "../blog/ExpandableBlogBody";
import { publicScopeKicker } from "../../data/eventScope";
import EventTabs from "./EventTabs";
import ChampionshipGameTabs from "./ChampionshipGameTabs";
import StreamEmbed from "../shared/StreamEmbed";
import { useGameBanner } from "../../hooks/useMediaLibrary";
import SectionBackHome from "../layout/SectionBackHome";

export default function VaultDetailPage({
  liveEntries = [],
  slug,
  slides = VAULT_SLIDES,
  bookmarked = false,
  onToggleBookmark,
}) {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const compareFocused = Boolean(searchParams.get("compare"));
  const eventFocused = Boolean(searchParams.get("event") || compareFocused);
  const titleFocused = searchParams.get("details") === "1" && Boolean(searchParams.get("game"));

  const clearEventFocus = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("event");
    next.delete("compare");
    setSearchParams(next, { replace: false });
  };

  const clearTitleFocus = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("details");
    next.delete("game");
    setSearchParams(next, { replace: false });
  };
  const slide = slides.find((item) => item.slug === slug) || VAULT_SLIDES.find((item) => item.slug === slug);
  const isChampionship = !!slide?.championship?.games?.length || slide?.surface === "ewc-window";
  const related = useMemo(
    () =>
      isChampionship
        ? []
        : liveEntries
            .filter((entry) => String(entry.game || "").toLowerCase() === String(slide?.game || "").toLowerCase())
            .slice(0, 6),
    [liveEntries, slide, isChampionship],
  );
  const gameBackground = useGameBanner(slide?.game, bannerForGame(slide?.game));
  const defaultPoster = useMemo(
    () => slide?.poster || gameBackground || flyerForEvent(slide || {}) || "",
    [slide, gameBackground],
  );
  const [activeFlyer, setActiveFlyer] = useState(defaultPoster);
  useEffect(() => {
    setActiveFlyer(defaultPoster);
  }, [defaultPoster]);

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
      <div className="mb-5 space-y-2 border-b border-white/10 py-3">
        <div className="flex flex-wrap items-center gap-4">
          <Link to="/vault" className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-neon">
            <ArrowLeft size={14} /> The Vault
          </Link>
          {(slide.research || slide.surface === "research" || slide.surface === "ewc-window") && (
            <Link to="/vault/ewc" className="font-mono text-xs uppercase tracking-widest text-neon">
              EWC index
            </Link>
          )}
          {onToggleBookmark && (
            <button
              type="button"
              onClick={() => onToggleBookmark(slide.slug)}
              className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-neon"
            >
              {bookmarked ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
              {bookmarked ? "Bookmarked" : "Bookmark"}
            </button>
          )}
        </div>
        {eventFocused && (
          <button
            type="button"
            onClick={clearEventFocus}
            className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-neon"
          >
            <ArrowLeft size={14} /> {compareFocused ? "Back to events" : "All events"}
          </button>
        )}
        {titleFocused && !compareFocused && (
          <button
            type="button"
            onClick={clearTitleFocus}
            className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-neon"
          >
            <ArrowLeft size={14} /> Titles in this championship
          </button>
        )}
      </div>
      <SectionBackHome />

      {compareFocused && !isChampionship && !!slide.editions?.length ? (
        <EventTabs
          editions={slide.editions}
          game={slide.game}
          heading={`Compare · ${slide.game}`}
          fallbackPoster={slide.poster}
          onSelectPoster={setActiveFlyer}
        />
      ) : (
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
              {[publicScopeKicker(slide), isChampionship ? "Championship" : null].filter(Boolean).join(" · ") || "Vault"}
            </p>
            {!isChampionship && slide.game ? (
              <p className="mt-1 font-display text-4xl leading-none tracking-wide text-neon md:text-5xl">{slide.game}</p>
            ) : null}
            <h1 className="font-display text-5xl text-white md:text-7xl">{slide.title}</h1>
            <p className="mt-1 text-slate-300">{slide.season}</p>
          </div>
        </div>
        <div className={`grid gap-8 p-6 md:p-8 ${slide.blog || isChampionship ? "" : "md:grid-cols-[1.4fr_0.8fr]"}`}>
          <div>
            {slide.blog ? (
              <ExpandableBlogBody
                text={slide.fullContent || slide.summary}
                style={{ color: "inherit", fontSize: "1rem", lineHeight: 1.75 }}
              />
            ) : (
              <p className="whitespace-pre-wrap text-base leading-7 text-slate-200">{slide.summary}</p>
            )}

            {!!slide.relatedBlogs?.length && !slide.blog && (
              <section className="mt-8 space-y-6 border-t border-white/10 pt-6">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-neon">From the blog</p>
                  <h2 className="font-display text-3xl text-white">
                    {slide.relatedBlogs.length === 1 ? "Latest story" : `${slide.relatedBlogs.length} community stories`}
                  </h2>
                </div>
                {slide.relatedBlogs.map((post) => (
                  <article key={post.id} className="space-y-2 border-b border-white/10 pb-6 last:border-b-0 last:pb-0">
                    <h3 className="font-display text-2xl text-white">{post.title}</h3>
                    <ExpandableBlogBody
                      text={post.content}
                      style={{ color: "inherit", fontSize: "0.95rem", lineHeight: 1.7 }}
                    />
                    {(post.authorName || post.analysisType) && (
                      <p className="text-sm text-slate-400">
                        {[post.authorName && `By ${post.authorName}`, post.analysisType && `${analysisTypeLabel(post.analysisType)} analysis`, post.analysisSubject]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-3 text-sm">
                      {post.youtubeUrl && (
                        <a href={post.youtubeUrl} target="_blank" rel="noreferrer" className="text-neon">
                          YouTube
                        </a>
                      )}
                      {post.docsUrl && (
                        <a href={post.docsUrl} target="_blank" rel="noreferrer" className="text-neon">
                          Docs
                        </a>
                      )}
                      {post.source && (
                        <a href={post.source} target="_blank" rel="noreferrer" className="text-neon">
                          Source
                        </a>
                      )}
                      <Link to="/blog" state={{ background: location }} className="text-neon">
                        Open blog
                      </Link>
                    </div>
                  </article>
                ))}
              </section>
            )}

            {!!slide.championship?.games?.length && (
              <ChampionshipGameTabs
                games={slide.championship.games}
                slides={slides}
                heading="Titles in this championship"
                onSelectPoster={(src) => src && setActiveFlyer(src)}
              />
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

            {!isChampionship && (slide.fullName || slide.peakPrizePool || slide.region) && (
              <p className="mt-3 text-sm text-slate-400">
                {[slide.fullName, slide.region, slide.peakPrizePool && `Peak prize pool ${slide.peakPrizePool}`]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}

            {slide.eventStatus === "completed" && !slide.editions?.length && !isChampionship && (
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
          </div>
          {!slide.blog && !isChampionship && (
            <aside className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-volt">
                <Trophy size={14} /> Live Vault records
              </p>
              {related.length === 0 ? (
                <p className="text-sm text-slate-400">No published results for {slide.game} yet.</p>
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
      )}
    </article>
  );
}
