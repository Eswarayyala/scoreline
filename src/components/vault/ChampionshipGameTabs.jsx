import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { findGameVault } from "../../data/eventScope";
import { EventBody } from "./EventTabs";

function editionKey(edition, index) {
  return `${edition.game || ""}-${edition.year || ""}-${edition.event || ""}-${index}`;
}

function gameParam(edition) {
  return String(edition?.game || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function vaultSlugFor(edition, slides = []) {
  if (edition?.slug) return edition.slug;
  const vault = findGameVault(slides, edition?.game);
  return vault?.slug || "";
}

function championOf(edition) {
  return edition?.champion || edition?.payouts?.[0]?.team || edition?.payouts?.[0]?.player || "";
}

/**
 * Championship year → one grid of minimal game cards → full details for one title.
 */
export default function ChampionshipGameTabs({
  games = [],
  slides = [],
  heading = "Titles in this championship",
  initialVisible = 12,
  onSelectPoster,
  urlSync = true,
}) {
  const editions = useMemo(
    () => (Array.isArray(games) ? games : []).filter((row) => row?.game || row?.event),
    [games],
  );
  const [searchParams, setSearchParams] = useSearchParams();
  const [localIndex, setLocalIndex] = useState(0);
  const [localDetails, setLocalDetails] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const gameFromUrl = String(searchParams.get("game") || "").toLowerCase();
  const detailsFromUrl = searchParams.get("details") === "1";

  const activeIndex = useMemo(() => {
    if (!editions.length) return 0;
    if (!urlSync) return Math.min(localIndex, editions.length - 1);
    if (!gameFromUrl) return -1;
    const match = editions.findIndex(
      (edition) => gameParam(edition) === gameFromUrl || String(edition.game || "").toLowerCase() === gameFromUrl,
    );
    return match >= 0 ? match : -1;
  }, [editions, gameFromUrl, localIndex, urlSync]);

  const detailsOpen = urlSync ? detailsFromUrl && activeIndex >= 0 : localDetails && activeIndex >= 0;

  useEffect(() => {
    setExpanded(false);
    setLocalIndex(0);
    setLocalDetails(false);
  }, [editions]);

  const safeIndex = activeIndex >= 0 ? Math.min(activeIndex, editions.length - 1) : 0;
  const current = detailsOpen ? editions[safeIndex] : null;
  const needsCollapse = editions.length > initialVisible;
  const visibleIndexes = useMemo(() => {
    if (!editions.length) return [];
    if (expanded || !needsCollapse) return editions.map((_, index) => index);
    return Array.from({ length: initialVisible }, (_, index) => index);
  }, [editions, expanded, needsCollapse, initialVisible]);

  useEffect(() => {
    if (!current || !onSelectPoster) return;
    onSelectPoster(
      current.poster || current.posterUrl || (Array.isArray(current.images) && current.images[0]) || "",
    );
  }, [current, onSelectPoster]);

  const openDetails = (index) => {
    const edition = editions[index];
    if (!edition) return;
    if (!urlSync) {
      setLocalIndex(index);
      setLocalDetails(true);
      return;
    }
    const next = new URLSearchParams(searchParams);
    next.set("game", gameParam(edition));
    next.set("details", "1");
    setSearchParams(next, { replace: false });
  };

  const closeDetails = () => {
    if (!urlSync) {
      setLocalDetails(false);
      return;
    }
    const next = new URLSearchParams(searchParams);
    next.delete("details");
    next.delete("game");
    setSearchParams(next, { replace: false });
  };

  if (!editions.length) return null;

  if (detailsOpen && current) {
    const gameName = current.game || "game";
    const vaultSlug = vaultSlugFor(current, slides);
    const allEventsHref = vaultSlug ? `/vault/${vaultSlug}` : "";
    return (
      <section className="mt-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {!urlSync ? (
            <button
              type="button"
              onClick={closeDetails}
              className="font-mono text-[11px] uppercase tracking-widest text-neon"
            >
              ← Titles in this championship
            </button>
          ) : (
            <span />
          )}
          {allEventsHref && (
            <Link
              to={allEventsHref}
              className="font-mono text-[10px] uppercase tracking-widest text-amber-300 no-underline hover:text-white"
            >
              All {gameName} events →
            </Link>
          )}
        </div>
        <EventBody edition={current} game={current.game} />
        {allEventsHref && (
          <p className="text-sm text-slate-500">
            Browse every season and circuit for {gameName} in the{" "}
            <Link to={allEventsHref} className="text-neon no-underline hover:underline">
              game vault
            </Link>
            .
          </p>
        )}
      </section>
    );
  }

  return (
    <section className="mt-6">
      {heading ? <h2 className="font-display text-2xl text-white md:text-3xl">{heading}</h2> : null}
      <p className="mt-1 text-sm text-slate-500">
        Each title shows a short championship snapshot — open one for full details or every event for that game.
      </p>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {visibleIndexes.map((index) => {
          const edition = editions[index];
          const champion = championOf(edition);
          const vaultSlug = vaultSlugFor(edition, slides);
          const allEventsHref = vaultSlug ? `/vault/${vaultSlug}` : "";
          return (
            <article
              key={editionKey(edition, index)}
              className="flex flex-col border border-white/10 bg-white/[0.03] transition hover:border-amber-400/50 hover:bg-white/[0.05]"
            >
              <button
                type="button"
                onClick={() => openDetails(index)}
                className="flex flex-1 flex-col p-4 text-left"
              >
                <p className="font-mono text-[10px] uppercase tracking-widest text-neon">
                  {[edition.year, edition.eventScope || "ewc", "this championship"].filter(Boolean).join(" · ")} · Preview
                </p>
                <h3 className="mt-1 font-display text-2xl leading-tight text-white md:text-3xl">{edition.game}</h3>
                <p className="mt-2 line-clamp-2 text-sm text-slate-400">
                  {[edition.event, champion && `Champion ${champion}`, edition.prizePool].filter(Boolean).join(" · ")}
                </p>
              </button>
              {allEventsHref && (
                <div className="border-t border-white/10 px-4 py-2">
                  <Link
                    to={allEventsHref}
                    className="font-mono text-[10px] uppercase tracking-widest text-amber-300 no-underline hover:text-white"
                  >
                    All {edition.game} events →
                  </Link>
                </div>
              )}
            </article>
          );
        })}
        {needsCollapse && (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="min-h-[8rem] border border-dashed border-neon/40 px-4 py-4 font-mono text-[10px] uppercase tracking-widest text-neon hover:border-neon sm:min-h-0"
          >
            {expanded ? "Less" : `More (+${editions.length - initialVisible})`}
          </button>
        )}
      </div>
    </section>
  );
}
