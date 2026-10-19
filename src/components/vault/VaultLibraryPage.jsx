import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { VAULT_SLIDES, flyerForEvent } from "../../data/platformShowcase";
import { publicScopeKicker } from "../../data/eventScope";
import { canonicalFilterGame, gameMatchesFilter } from "../../data/gameCatalog";
import WeeklyGrindPanel from "./WeeklyGrindPanel";

function SlideCard({ slide, bookmarked, onToggleBookmark }) {
  return (
    <div className="relative overflow-hidden border border-white/10 bg-black/20 hover:border-amber-400/50">
      <Link to={`/vault/${slide.slug}`} className="block no-underline text-inherit">
        <div className="aspect-video overflow-hidden">
          <img src={flyerForEvent(slide)} alt="" className="h-full w-full object-cover" />
        </div>
        <div className="p-3">
          <p className="m-0 font-mono text-[10px] uppercase tracking-widest text-cyan-300">
            {[publicScopeKicker(slide), slide.game].filter(Boolean).join(" · ")}
          </p>
          <h3 className="mt-1 font-['Bebas_Neue',sans-serif] text-2xl text-white">{slide.title}</h3>
          {slide.peakPrizePool && <p className="mt-1 text-xs text-stone-400">Peak prize pool {slide.peakPrizePool}</p>}
        </div>
      </Link>
      {onToggleBookmark && (
        <button
          type="button"
          aria-label={bookmarked ? "Remove bookmark" : "Bookmark"}
          onClick={() => onToggleBookmark(slide.slug)}
          className="absolute right-2 top-2 rounded-full border border-white/15 bg-black/70 p-1.5 text-amber-300"
        >
          {bookmarked ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
        </button>
      )}
    </div>
  );
}

export default function VaultLibraryPage({
  slides = VAULT_SLIDES,
  children,
  bookmarkSlugs = [],
  onToggleBookmark,
  tournaments = [],
  grindPrefs,
  onGrindPrefsChange,
}) {
  const items = slides.length ? slides : VAULT_SLIDES;
  const [game, setGame] = useState("all");
  const [scope, setScope] = useState("all");
  const [onlyBookmarks, setOnlyBookmarks] = useState(false);
  const bookmarkSet = useMemo(() => new Set(bookmarkSlugs), [bookmarkSlugs]);
  const games = useMemo(() => {
    const seen = new Set();
    return items
      .map((slide) => canonicalFilterGame(slide.game))
      .filter((name) => {
        const gameName = String(name || "").trim();
        const key = gameName.toLowerCase();
        if (!gameName || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => a.localeCompare(b));
  }, [items]);
  const visible = items.filter((slide) => {
    if (onlyBookmarks && !bookmarkSet.has(slide.slug)) return false;
    const gameOk = game === "all" || gameMatchesFilter(slide.game, game);
    if (scope === "all") return gameOk;
    if (slide.eventScope === scope) return gameOk;
    if ((slide.editions || []).some((edition) => edition.eventScope === scope)) return gameOk;
    if (scope === "ewc" && (slide.floating === true || slide.surface === "ewc-window")) return gameOk;
    return false;
  });
  const floating = visible.filter((slide) => slide.floating === true);
  const research = visible.filter(
    (slide) => (slide.research || slide.surface === "research") && !slide.floating && slide.surface !== "ewc-window",
  );
  const blogs = visible.filter((slide) => slide.blog || slide.surface === "blog");
  return (
    <div className="pb-10 pt-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="m-0 font-['Bebas_Neue',sans-serif] text-4xl tracking-wide text-white md:text-5xl">The Vault</h1>
          <p className="mt-1 max-w-xl text-xs text-stone-500">Championship windows, game vaults, and recaps.</p>
        </div>
        <button
          type="button"
          onClick={() => setOnlyBookmarks((value) => !value)}
          className={`inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest ${
            onlyBookmarks ? "text-amber-300" : "text-stone-500 hover:text-stone-300"
          }`}
        >
          <Bookmark size={12} />
          {onlyBookmarks ? "Bookmarks on" : "Bookmarks"}
          {bookmarkSlugs.length ? ` · ${bookmarkSlugs.length}` : ""}
        </button>
      </div>
      <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-white/5 pb-3">
        <label className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-stone-500">
          Game
          <select
            className="border-0 border-b border-white/20 bg-transparent py-0.5 text-[11px] normal-case tracking-normal text-white outline-none"
            value={game}
            onChange={(e) => setGame(e.target.value)}
          >
            <option value="all">All</option>
            {games.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-stone-500">
          Type
          <select
            className="border-0 border-b border-white/20 bg-transparent py-0.5 text-[11px] normal-case tracking-normal text-white outline-none"
            value={scope}
            onChange={(e) => setScope(e.target.value)}
          >
            <option value="all">All</option>
            <option value="ewc">EWC</option>
            <option value="region">Region</option>
            <option value="random">Random</option>
          </select>
        </label>
        <Link to="/vault/ewc" className="font-mono text-[10px] uppercase tracking-widest text-stone-500 no-underline hover:text-amber-300">
          EWC index
        </Link>
      </div>
      <WeeklyGrindPanel
        slides={items}
        tournaments={tournaments}
        prefs={grindPrefs}
        onPrefsChange={onGrindPrefsChange}
      />
      {floating.length > 0 && (
        <>
          <h2 className="mb-3 font-['Bebas_Neue',sans-serif] text-3xl text-white">Floating windows</h2>
          <div className="mb-10 grid grid-cols-1 gap-4 md:grid-cols-2">
            {floating.map((slide) => (
              <SlideCard
                key={slide.slug || slide.id}
                slide={slide}
                bookmarked={bookmarkSet.has(slide.slug)}
                onToggleBookmark={onToggleBookmark}
              />
            ))}
          </div>
        </>
      )}
      {research.length > 0 && (
        <>
          <h2 className="mb-3 font-['Bebas_Neue',sans-serif] text-3xl text-white">Game vaults</h2>
          <div className="mb-10 grid grid-cols-1 gap-4 md:grid-cols-2">
            {research.map((slide) => (
              <SlideCard
                key={slide.slug || slide.id}
                slide={slide}
                bookmarked={bookmarkSet.has(slide.slug)}
                onToggleBookmark={onToggleBookmark}
              />
            ))}
          </div>
        </>
      )}
      <h2 className="mb-3 font-['Bebas_Neue',sans-serif] text-3xl text-white">Published blogs</h2>
      {blogs.length === 0 ? (
        <p className="text-sm text-stone-400">No published recaps in The Vault yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {blogs.map((slide) => (
            <SlideCard
              key={slide.slug || slide.id}
              slide={slide}
              bookmarked={bookmarkSet.has(slide.slug)}
              onToggleBookmark={onToggleBookmark}
            />
          ))}
        </div>
      )}
      {children ? <div className="mt-10 border-t border-white/10 pt-6">{children}</div> : null}
    </div>
  );
}
