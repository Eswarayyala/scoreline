import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { VAULT_SLIDES } from "../../data/platformShowcase";
import { canonicalFilterGame, gameMatchesFilter } from "../../data/gameCatalog";
import { sortVaultCatalog } from "../../data/floatingWindows";
import StickyFilterBar from "../shared/StickyFilterBar";
import TournamentWindowCard, { WINDOW_CARD_HEIGHT } from "./TournamentWindowCard";
import SectionBackHome from "../layout/SectionBackHome";
import PageEnter from "../motion/PageEnter";
import FocusRail from "../motion/FocusRail";

/** Vault catalog shows game (or EWC year) windows — never home event spotlights. */
function asVaultCatalogCard(slide = {}) {
  if (!slide || slide.surface === "ewc-window") return slide;
  const game = slide.game || slide.title || "";
  return {
    ...slide,
    spotlight: false,
    spotlightEdition: undefined,
    spotlightEventKey: undefined,
    eventName: "",
    title: game || slide.title,
    href: slide.slug ? `/vault/${slide.slug}` : slide.href || "/vault",
  };
}

function SlideCard({ slide, bookmarked, onToggleBookmark }) {
  const card = asVaultCatalogCard(slide);
  return (
    <TournamentWindowCard
      slide={card}
      compact
      bookmark={
        onToggleBookmark ? (
          <button
            type="button"
            aria-label={bookmarked ? "Remove bookmark" : "Bookmark"}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleBookmark(slide.slug);
            }}
            className="rounded-full border border-white/15 bg-black/70 p-1.5 text-neon"
          >
            {bookmarked ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
          </button>
        ) : null
      }
    />
  );
}

const VAULT_FILTER_KEY = "gi-vault-filters";

function readVaultFilters() {
  try {
    const raw = JSON.parse(sessionStorage.getItem(VAULT_FILTER_KEY) || "{}");
    return {
      game: typeof raw.game === "string" ? raw.game : "all",
      scope: typeof raw.scope === "string" ? raw.scope : "all",
      onlyBookmarks: Boolean(raw.onlyBookmarks),
    };
  } catch {
    return { game: "all", scope: "all", onlyBookmarks: false };
  }
}

/** Full Vault catalog — vertical focus rail (home carousel stays horizontal). */
export default function VaultLibraryPage({
  slides = VAULT_SLIDES,
  children,
  bookmarkSlugs = [],
  onToggleBookmark,
}) {
  const items = slides.length ? slides : VAULT_SLIDES;
  const savedFilters = readVaultFilters();
  const [game, setGame] = useState(savedFilters.game);
  const [scope, setScope] = useState(savedFilters.scope);
  const [onlyBookmarks, setOnlyBookmarks] = useState(savedFilters.onlyBookmarks);
  const bookmarkSet = useMemo(() => new Set(bookmarkSlugs), [bookmarkSlugs]);
  const catalogItems = useMemo(
    () => items.filter((slide) => {
      if (slide.blog || slide.surface === "blog") return false;
      if (slide.surface === "vault" && !slide.research && slide.title && slide.game && slide.title !== slide.game) {
        return false;
      }
      return true;
    }),
    [items],
  );
  const games = useMemo(() => {
    const seen = new Set();
    return catalogItems
      .map((slide) => canonicalFilterGame(slide.game))
      .filter((name) => {
        const gameName = String(name || "").trim();
        const key = gameName.toLowerCase();
        if (!gameName || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => a.localeCompare(b));
  }, [catalogItems]);
  const visible = useMemo(() => {
    const filtered = catalogItems.filter((slide) => {
      if (onlyBookmarks && !bookmarkSet.has(slide.slug)) return false;
      const gameOk = game === "all" || gameMatchesFilter(slide.game, game);
      if (scope === "all") return gameOk;
      if (slide.eventScope === scope) return gameOk;
      if ((slide.editions || []).some((edition) => edition.eventScope === scope)) return gameOk;
      if (scope === "ewc" && (slide.floating === true || slide.surface === "ewc-window" || slide.featured)) return gameOk;
      return false;
    });
    const featured = filtered.filter((slide) => slide.featured);
    const rest = sortVaultCatalog(filtered.filter((slide) => !slide.featured));
    return [...featured, ...rest];
  }, [catalogItems, onlyBookmarks, bookmarkSet, game, scope]);

  useEffect(() => {
    try {
      sessionStorage.setItem(VAULT_FILTER_KEY, JSON.stringify({ game, scope, onlyBookmarks }));
    } catch {
      /* ignore */
    }
  }, [game, scope, onlyBookmarks]);

  return (
    <PageEnter className="pb-28 pt-6">
      <SectionBackHome />
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="m-0 font-['Bebas_Neue',sans-serif] text-4xl tracking-wide text-white md:text-5xl">The Vault</h1>
          <p className="mt-1 max-w-xl text-xs text-slate-500">
            Vertical focus stack — the centered window expands. Filters still apply.
          </p>
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
      <StickyFilterBar className="mb-4 -mx-0 border-white/5 bg-slate-950/90" trailing={(
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
        <FocusRail
          key={`${game}:${scope}:${onlyBookmarks ? "bm" : "all"}:${visible.length}`}
          items={visible}
          axis="y"
          ariaLabel="Vault catalog"
          height={WINDOW_CARD_HEIGHT}
          slotHeight={WINDOW_CARD_HEIGHT}
          slotWidth="min(100%, 340px)"
          focusScale={1.1}
          peerScale={0.86}
          viewportMax="min(78vh, 720px)"
          getKey={(slide) => slide.slug || slide.id}
          renderItem={(slide, { focused }) => (
            <div
              style={{
                height: "100%",
                width: "100%",
                // Peers only focus on tap; open the link once the card is centered.
                pointerEvents: focused ? "auto" : "none",
              }}
            >
              <SlideCard
                slide={slide}
                bookmarked={bookmarkSet.has(slide.slug)}
                onToggleBookmark={onToggleBookmark}
              />
            </div>
          )}
        />
      ) : (
        <p className="mb-10 text-sm text-slate-400">No vault windows match these filters.</p>
      )}
      {children ? <div className="mt-10 border-t border-white/10 pt-6">{children}</div> : null}
    </PageEnter>
  );
}
