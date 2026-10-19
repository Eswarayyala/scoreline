import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { findGameVault } from "../../data/eventScope";
import { EventBody } from "./EventTabs";

function editionKey(edition, index) {
  return `${edition.game || ""}-${edition.year || ""}-${edition.event || ""}-${index}`;
}

function tabLabel(edition) {
  const name = String(edition.game || "").trim();
  if (!name) return "Title";
  return name.replace(/\s*\([^)]*\)\s*$/, "") || name;
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

/**
 * Championship year → game grid → preview → full details for that title.
 * "All {game} events" links to every game vault the same way (Valorant, CS2, …).
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
    if (!gameFromUrl) return 0;
    const match = editions.findIndex(
      (edition) => gameParam(edition) === gameFromUrl || String(edition.game || "").toLowerCase() === gameFromUrl,
    );
    return match >= 0 ? match : 0;
  }, [editions, gameFromUrl, localIndex, urlSync]);

  const detailsOpen = urlSync ? detailsFromUrl : localDetails;

  useEffect(() => {
    setExpanded(false);
    setLocalIndex(0);
    setLocalDetails(false);
  }, [editions]);

  const safeIndex = editions.length ? Math.min(activeIndex, editions.length - 1) : 0;
  const current = editions[safeIndex] || null;
  const needsCollapse = editions.length > initialVisible;
  const visibleIndexes = useMemo(() => {
    if (!editions.length) return [];
    if (expanded || !needsCollapse) return editions.map((_, index) => index);
    const head = Array.from({ length: initialVisible }, (_, index) => index);
    if (safeIndex >= initialVisible) {
      return [...head.slice(0, initialVisible - 1), safeIndex];
    }
    return head;
  }, [editions, expanded, needsCollapse, initialVisible, safeIndex]);

  useEffect(() => {
    if (!current || !onSelectPoster) return;
    onSelectPoster(
      current.poster || current.posterUrl || (Array.isArray(current.images) && current.images[0]) || "",
    );
  }, [current, onSelectPoster]);

  const setGameParams = (index, { openDetails = false } = {}) => {
    const edition = editions[index];
    if (!edition) return;
    if (!urlSync) {
      setLocalIndex(index);
      setLocalDetails(openDetails);
      return;
    }
    const next = new URLSearchParams(searchParams);
    next.set("game", gameParam(edition));
    if (openDetails) next.set("details", "1");
    else next.delete("details");
    setSearchParams(next, { replace: false });
  };

  const closeDetails = () => {
    if (!urlSync) {
      setLocalDetails(false);
      return;
    }
    const next = new URLSearchParams(searchParams);
    next.delete("details");
    setSearchParams(next, { replace: false });
  };

  if (!editions.length) return null;

  const gameName = current?.game || "game";
  const vaultSlug = vaultSlugFor(current, slides);
  const allEventsHref = vaultSlug ? `/vault/${vaultSlug}` : "";
  const champion =
    current?.champion || current?.payouts?.[0]?.team || current?.payouts?.[0]?.player || "";

  if (detailsOpen && current) {
    return (
      <section className="mt-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={closeDetails}
            className="font-mono text-[11px] uppercase tracking-widest text-neon"
          >
            ← Titles in this championship
          </button>
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
        Select a title for a preview, click it for full championship details, or open all events for that game.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {visibleIndexes.map((index) => {
          const edition = editions[index];
          const on = index === safeIndex;
          return (
            <button
              key={editionKey(edition, index)}
              type="button"
              onClick={() => setGameParams(index, { openDetails: false })}
              className={`min-h-[2.75rem] border px-2 py-2 text-left font-mono text-[10px] uppercase tracking-wider ${
                on
                  ? "border-amber-400 bg-white/5 text-white"
                  : "border-white/10 text-slate-500 hover:border-white/25 hover:text-slate-300"
              }`}
            >
              {tabLabel(edition)}
            </button>
          );
        })}
        {needsCollapse && (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="min-h-[2.75rem] border border-dashed border-neon/40 px-2 py-2 font-mono text-[10px] uppercase tracking-widest text-neon hover:border-neon"
          >
            {expanded ? "Less" : `More (+${editions.length - initialVisible})`}
          </button>
        )}
      </div>

      {current && (
        <div className="mt-6 space-y-3">
          <div className="flex flex-wrap items-center justify-end gap-3">
            {allEventsHref && (
              <Link
                to={allEventsHref}
                className="font-mono text-[10px] uppercase tracking-widest text-amber-300 no-underline hover:text-white"
              >
                All {gameName} events →
              </Link>
            )}
          </div>
          <button
            type="button"
            onClick={() => setGameParams(safeIndex, { openDetails: true })}
            className="w-full border border-white/10 bg-white/[0.03] p-4 text-left transition hover:border-amber-400/50 hover:bg-white/[0.05]"
          >
            <p className="font-mono text-[10px] uppercase tracking-widest text-neon">
              {[current.year, current.eventScope || "ewc", "this championship"].filter(Boolean).join(" · ")} · Preview
            </p>
            <h3 className="mt-1 font-display text-3xl text-white">{current.game}</h3>
            <p className="mt-2 text-sm text-slate-400">
              {[current.event, champion && `Champion ${champion}`, current.prizePool].filter(Boolean).join(" · ")}
            </p>
            <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-amber-300">
              Click for full event details
            </p>
          </button>
        </div>
      )}
    </section>
  );
}
