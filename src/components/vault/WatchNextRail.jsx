import { Link } from "react-router-dom";
import { ExternalLink, Play } from "lucide-react";
import { analysisTypeLabel } from "../../data/blogAnalysis";

function scoreRelated(slide, current) {
  let score = 0;
  const gameA = String(slide.game || "").toLowerCase();
  const gameB = String(current.game || "").toLowerCase();
  if (gameA && gameA === gameB) score += 4;
  if (slide.eventScope && slide.eventScope === current.eventScope) score += 2;
  if (slide.youtubeUrl) score += 2;
  if (slide.blog || slide.surface === "blog") score += 1;
  if (slide.slug === current.slug) score -= 20;
  return score;
}

export function relatedWatchItems(slides = [], current) {
  if (!current) return [];
  return [...slides]
    .map((slide) => ({ slide, score: scoreRelated(slide, current) }))
    .filter((row) => row.score > 0 && row.slide.slug !== current.slug)
    .sort((a, b) => b.score - a.score || String(b.slide.title).localeCompare(String(a.slide.title)))
    .slice(0, 6)
    .map((row) => row.slide);
}

export default function WatchNextRail({ slides = [], current }) {
  const items = relatedWatchItems(slides, current);
  if (!items.length) return null;

  return (
    <section className="mt-10">
      <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Watch next</p>
      <h2 className="mt-1 font-display text-3xl text-white">Related recaps & VODs</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {items.map((slide) => (
          <article key={slide.slug} className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50">
            <div className="flex gap-3 p-3">
              {slide.poster && (
                <img src={slide.poster} alt="" className="h-20 w-28 shrink-0 rounded-xl object-cover ring-1 ring-white/10" />
              )}
              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-widest text-neon">
                  {[slide.game, slide.analysisType && analysisTypeLabel(slide.analysisType)].filter(Boolean).join(" · ")}
                </p>
                <Link to={`/vault/${slide.slug}`} className="mt-1 block truncate text-sm text-white no-underline hover:text-neon">
                  {slide.title}
                </Link>
                <div className="mt-2 flex flex-wrap gap-3 text-xs">
                  {slide.youtubeUrl && (
                    <a href={slide.youtubeUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-amber-300">
                      <Play size={12} /> YouTube
                    </a>
                  )}
                  {slide.docsUrl && (
                    <a href={slide.docsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-neon">
                      <ExternalLink size={12} /> Docs
                    </a>
                  )}
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
