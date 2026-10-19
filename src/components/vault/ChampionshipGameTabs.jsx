import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

function editionKey(edition, index) {
  return `${edition.game || ""}-${edition.year || ""}-${edition.event || ""}-${index}`;
}

function tabLabel(edition) {
  const name = String(edition.game || "").trim();
  if (!name) return "Title";
  // Shorten long parentheticals for the tab strip (full name stays in the panel).
  return name.replace(/\s*\([^)]*\)\s*$/, "") || name;
}

/**
 * Per-game tabs for a championship year (EWC / Gamers8 / floating windows).
 * Minimal: shows a few tabs, then More; details panel for the active title.
 */
export default function ChampionshipGameTabs({
  games = [],
  heading = "Titles in this championship",
  initialVisible = 6,
}) {
  const editions = useMemo(
    () => (Array.isArray(games) ? games : []).filter((row) => row?.game || row?.event),
    [games],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setActiveIndex(0);
    setExpanded(false);
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

  if (!editions.length) return null;

  const champion =
    current?.champion || current?.payouts?.[0]?.team || current?.payouts?.[0]?.player || "";

  return (
    <section className="mt-6">
      {heading ? <h2 className="font-display text-2xl text-white md:text-3xl">{heading}</h2> : null}
      <div className="mt-3 flex flex-wrap items-center gap-1 border-b border-white/10">
        {visibleIndexes.map((index) => {
          const edition = editions[index];
          const on = index === safeIndex;
          return (
            <button
              key={editionKey(edition, index)}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`px-2.5 py-2 font-mono text-[10px] uppercase tracking-wider ${
                on ? "border-b border-amber-400 text-white" : "border-b border-transparent text-slate-500 hover:text-slate-300"
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
            className="px-2 py-2 font-mono text-[10px] uppercase tracking-widest text-neon"
          >
            {expanded ? "Less" : `More (+${editions.length - initialVisible})`}
          </button>
        )}
      </div>
      {current && (
        <div className="mt-4 space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-widest text-neon">
            {[current.year, current.eventScope].filter(Boolean).join(" · ")}
          </p>
          {current.slug ? (
            <Link to={`/vault/${current.slug}`} className="block font-display text-3xl text-white no-underline hover:text-neon">
              {current.game}
            </Link>
          ) : (
            <h3 className="font-display text-3xl text-white">{current.game}</h3>
          )}
          <p className="text-sm text-slate-400">
            {[current.event, champion && `Champion ${champion}`, current.prizePool].filter(Boolean).join(" · ")}
          </p>
          {current.slug && (
            <Link
              to={`/vault/${current.slug}`}
              className="inline-block font-mono text-[10px] uppercase tracking-widest text-amber-300 no-underline hover:text-white"
            >
              Open game vault
            </Link>
          )}
        </div>
      )}
    </section>
  );
}
