import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { VAULT_SLIDES, flyerForEvent } from "../../data/platformShowcase";
import { publicScopeKicker } from "../../data/eventScope";
import { canonicalFilterGame, gameMatchesFilter } from "../../data/gameCatalog";
import { sortVaultCatalog } from "../../data/floatingWindows";
import LoadMoreBar, { usePagedVisible } from "../shared/LoadMoreBar";
import StickyFilterBar from "../shared/StickyFilterBar";

const LIBRARY_PAGE = 9;

function PagedSlideGrid({ items, bookmarkSet, onToggleBookmark }) {
  const page = usePagedVisible(items.length, LIBRARY_PAGE, LIBRARY_PAGE);
  const shown = items.slice(0, page.visible);
  return (
    <>
      <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {shown.map((slide) => (
          <SlideCard
            key={slide.slug || slide.id}
            slide={slide}
            bookmarked={bookmarkSet.has(slide.slug)}
            onToggleBookmark={onToggleBookmark}
          />
        ))}
      </div>
      <LoadMoreBar
        className="mb-10"
        total={items.length}
        shown={page.visible}
        pageSize={LIBRARY_PAGE}
        initial={LIBRARY_PAGE}
        onMore={page.more}
        onLess={page.less}
      />
    </>
  );
}

function previewMeta(slide) {
  const edition = (slide.editions || [])[0];
  const champion =
    edition?.champion
    || edition?.payouts?.[0]?.team
    || edition?.payouts?.[0]?.player
    || slide.winners
    || "";
  const year = edition?.year || edition?.season || slide.season || "";
  const event = edition?.event || slide.season || slide.summary || "";
  return {
    kicker: [year, publicScopeKicker(slide) || slide.eventScope, slide.game].filter(Boolean).join(" · "),
    title: slide.title || slide.game || "Vault",
    detail: [
      event && event !== slide.title ? event : null,
      champion && `Champion ${champion}`,
      slide.peakPrizePool && `Peak ${slide.peakPrizePool}`,
      edition?.prizePool,
    ]
      .filter(Boolean)
      .join(" · "),
  };
}

function SlideCard({ slide, bookmarked, onToggleBookmark }) {
  const meta = previewMeta(slide);
  const art = flyerForEvent(slide);
  return (
    <article className="relative flex flex-col border border-white/10 bg-white/[0.03] transition hover:border-neon/50 hover:bg-white/[0.05]">
      <Link to={`/vault/${slide.slug}`} className="flex flex-1 flex-col p-4 text-inherit no-underline">
        {art && (
          <div className="mb-3 aspect-[16/7] overflow-hidden border border-white/5 bg-black/40">
            <img src={art} alt="" className="h-full w-full object-cover opacity-80" />
          </div>
        )}
        <p className="font-mono text-[10px] uppercase tracking-widest text-neon">
          {meta.kicker}
        </p>
        <h3 className="mt-1 font-['Bebas_Neue',sans-serif] text-2xl leading-tight text-white md:text-3xl">
          {meta.title}
        </h3>
        {meta.detail && (
          <p className="mt-2 line-clamp-2 text-sm text-slate-400">{meta.detail}</p>
        )}
      </Link>
      {onToggleBookmark && (
        <button
          type="button"
          aria-label={bookmarked ? "Remove bookmark" : "Bookmark"}
          onClick={() => onToggleBookmark(slide.slug)}
          className="absolute right-2 top-2 rounded-full border border-white/15 bg-black/70 p-1.5 text-neon"
        >
          {bookmarked ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
        </button>
      )}
    </article>
  );
}

export default function VaultLibraryPage({
  slides = VAULT_SLIDES,
  children,
  bookmarkSlugs = [],
  onToggleBookmark,
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
  const visible = useMemo(() => {
    const filtered = items.filter((slide) => {
      if (onlyBookmarks && !bookmarkSet.has(slide.slug)) return false;
      if (slide.blog || slide.surface === "blog") return false;
      const gameOk = game === "all" || gameMatchesFilter(slide.game, game);
      if (scope === "all") return gameOk;
      if (slide.eventScope === scope) return gameOk;
      if ((slide.editions || []).some((edition) => edition.eventScope === scope)) return gameOk;
      if (scope === "ewc" && (slide.floating === true || slide.surface === "ewc-window" || slide.featured)) return gameOk;
      return false;
    });
    const featured = filtered.filter((slide) => slide.featured);
    const rest = sortVaultCatalog(filtered.filter((slide) => !slide.featured));
    // Keep home featured order first, then the rest of the catalog by year (2026 → past).
    return [...featured, ...rest];
  }, [items, onlyBookmarks, bookmarkSet, game, scope]);
  const blogs = items.filter((slide) => {
    if (!(slide.blog || slide.surface === "blog")) return false;
    if (onlyBookmarks && !bookmarkSet.has(slide.slug)) return false;
    return game === "all" || gameMatchesFilter(slide.game, game);
  });
  return (
    <div className="pb-10 pt-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="m-0 font-['Bebas_Neue',sans-serif] text-4xl tracking-wide text-white md:text-5xl">The Vault</h1>
          <p className="mt-1 max-w-xl text-xs text-slate-500">Championship windows, game vaults, and recaps.</p>
        </div>
        <button
          type="button"
          onClick={() => setOnlyBookmarks((value) => !value)}
          className={`inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest ${
            onlyBookmarks ? "text-neon" : "text-slate-500 hover:text-slate-300"
          }`}
        >
          <Bookmark size={12} />
          {onlyBookmarks ? "Bookmarks on" : "Bookmarks"}
          {bookmarkSlugs.length ? ` · ${bookmarkSlugs.length}` : ""}
        </button>
      </div>
      <StickyFilterBar className="mb-6 -mx-0 border-white/5 bg-slate-950/90" trailing={(
        <Link to="/vault/ewc" className="font-mono text-[10px] uppercase tracking-widest text-slate-500 no-underline hover:text-neon">
          EWC index
        </Link>
      )}>
        <label className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-slate-500">
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
        <label className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-slate-500">
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
      </StickyFilterBar>
      {visible.length > 0 ? (
        <PagedSlideGrid items={visible} bookmarkSet={bookmarkSet} onToggleBookmark={onToggleBookmark} />
      ) : (
        <p className="mb-10 text-sm text-slate-400">No vault windows match these filters.</p>
      )}
      <h2 className="mb-3 font-['Bebas_Neue',sans-serif] text-3xl text-white">Published blogs</h2>
      {blogs.length === 0 ? (
        <p className="text-sm text-slate-400">No published recaps in The Vault yet.</p>
      ) : (
        <PagedSlideGrid items={blogs} bookmarkSet={bookmarkSet} onToggleBookmark={onToggleBookmark} />
      )}
      {children ? <div className="mt-10 border-t border-white/10 pt-6">{children}</div> : null}
    </div>
  );
}
