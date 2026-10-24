import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { findGameVault } from "../../data/eventScope";
import LoadMoreBar, { usePagedVisible } from "../shared/LoadMoreBar";
import { EventBody } from "./EventTabs";
import TournamentWindowCard from "./TournamentWindowCard";

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
  initialVisible = 9,
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
  const page = usePagedVisible(editions.length, initialVisible, 9);

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
    setLocalIndex(0);
    setLocalDetails(false);
  }, [editions]);

  const safeIndex = activeIndex >= 0 ? Math.min(activeIndex, editions.length - 1) : 0;
  const current = detailsOpen ? editions[safeIndex] : null;
  const visibleIndexes = useMemo(
    () => Array.from({ length: page.visible }, (_, index) => index),
    [page.visible],
  );

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
              className="font-mono text-[10px] uppercase tracking-widest text-neon no-underline hover:text-white"
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
        {editions.length} titles · showing {Math.min(page.visible, editions.length)}. Use More, All, or Less when the list is long.
      </p>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visibleIndexes.map((index) => {
          const edition = editions[index];
          const vaultSlug = vaultSlugFor(edition, slides);
          const allEventsHref = vaultSlug ? `/vault/${vaultSlug}` : "";
          const slide = {
            ...edition,
            title: edition.event || edition.game,
            game: edition.game,
            eventStatus: championOf(edition) || (edition.payouts || []).length ? "completed" : "upcoming",
            season: edition.year,
            kicker: [edition.year, edition.eventScope || "ewc"].filter(Boolean).join(" · "),
            poster: edition.poster || edition.posterUrl || edition.images?.[0],
            editions: [edition],
          };
          return (
            <div key={editionKey(edition, index)} className="flex flex-col gap-2">
              <TournamentWindowCard
                slide={slide}
                compact
                to={allEventsHref || "#"}
                onOpen={() => openDetails(index)}
              />
              {allEventsHref ? (
                <Link
                  to={allEventsHref}
                  className="font-mono text-[10px] uppercase tracking-widest text-neon no-underline hover:text-white"
                >
                  All {edition.game} events →
                </Link>
              ) : null}
            </div>
          );
        })}
      </div>
      <LoadMoreBar
        className="mt-3"
        total={editions.length}
        shown={page.visible}
        pageSize={9}
        initial={initialVisible}
        onMore={page.more}
        onLess={page.less}
      />
    </section>
  );
}
