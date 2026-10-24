import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckSquare, Square, X } from "lucide-react";
import LoadMoreBar, { usePagedVisible } from "../shared/LoadMoreBar";
import { editionsNewestFirst, researchHighlightLabels } from "../../data/esportsResearch";
import {
  formatForGame,
  normalizeStageEntries,
  stageHasRoster,
  stagesNewestFirst,
  stageStatusLabel,
} from "../../data/vaultDeskSchema";
import { flyerForEvent } from "../../data/platformShowcase";
import { dossierPath } from "../../data/competitorIndex";
import ShareEventCard from "./ShareEventCard";
import TournamentWindowCard from "./TournamentWindowCard";

const COMPARE_MAX = 4;
const COMPARE_MIN = 2;

function eventKey(edition, index) {
  return `${edition.year}-${edition.event}-${edition.eventScope || ""}-${index}`;
}

function eventPoster(edition, fallback, game) {
  return flyerForEvent({
    game: edition.game || game,
    poster: edition.poster,
    flyers: edition.images,
    posterUrl: edition.poster,
  }) || fallback;
}

function NameLink({ children }) {
  const name = String(children || "").trim();
  if (!name) return null;
  return (
    <Link to={dossierPath(name)} className="text-neon no-underline hover:underline">
      {name}
    </Link>
  );
}

export function EventBody({ edition, game, compact = false }) {
  const format = formatForGame(game, edition.structureId);
  const finalsRows = (edition.finalsTable || []).filter((row) => Object.values(row).some((value) => String(value || "").trim()));
  const stages = stagesNewestFirst(
    (edition.stages || []).filter((row) => stageHasRoster(row)),
    format,
  );
  const yearLabel = [...new Set([edition.season, edition.year].filter((value) => String(value || "").trim()).map(String))];
  const payouts = (edition.payouts || []).filter((row) => row.rank || row.team || row.player || row.prize);
  const showPrizes = payouts.some((row) => String(row.prize || "").trim());
  const showPayouts = payouts.some((row) => !/^1st|^2nd/i.test(String(row.rank || "")) || showPrizes);
  const photos = (edition.images || []).filter(Boolean);

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-white/10 ${compact ? "" : ""}`}>
      <img src={eventPoster(edition, "", game)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />
      <div className="absolute inset-0 bg-slate-950/80" />
      <div className={`relative ${compact ? "p-4" : "p-5 md:p-6"}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-volt">{yearLabel.join(" · ")}</p>
            <h2 className={`font-display text-white ${compact ? "text-2xl" : "text-3xl md:text-4xl"}`}>{edition.event}</h2>
            <p className="mt-1 text-sm text-slate-400">
              {[edition.prizePool && `Prize pool ${edition.prizePool}`, edition.totalTeams && `${edition.totalTeams} teams groups to finals`]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          {!compact && <ShareEventCard edition={edition} game={game} fallbackPoster="" />}
        </div>
        {(edition.champion || edition.runnerUp || edition.mvp || edition.bestIgl) && (
          <dl className={`mt-4 grid gap-2 text-sm text-slate-300 ${compact ? "" : "sm:grid-cols-2"}`}>
            {edition.champion && (
              <div>
                Champion · <NameLink>{edition.champion}</NameLink>
              </div>
            )}
            {edition.runnerUp && (
              <div>
                Runner-up · <NameLink>{edition.runnerUp}</NameLink>
              </div>
            )}
            {edition.third && (
              <div>
                Third · <NameLink>{edition.third}</NameLink>
              </div>
            )}
            {edition.mvp && (
              <div>
                MVP · <NameLink>{edition.mvp}</NameLink>
              </div>
            )}
            {edition.bestIgl && (
              <div>
                Best IGL · <NameLink>{edition.bestIgl}</NameLink>
              </div>
            )}
            {edition.fanFavourite && (
              <div>
                Fan favourite · <NameLink>{edition.fanFavourite}</NameLink>
              </div>
            )}
          </dl>
        )}
        {edition.formatNotes && !compact && <p className="mt-3 text-sm text-slate-400">{edition.formatNotes}</p>}
        {!!(edition.youtubeUrls || []).length && !compact && (
          <div className="mt-4 flex flex-wrap gap-2">
            {(edition.youtubeUrls || []).map((url, index) => (
              <a
                key={`${url}-${index}`}
                href={url}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-neon/40 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-neon no-underline hover:bg-neon/10"
              >
                YouTube {index + 1}
              </a>
            ))}
          </div>
        )}
        {!!photos.length && !compact && (
          <div className="mt-4 grid grid-cols-3 gap-2">
            {photos.map((src) => (
              <img key={src.slice(0, 40)} src={src} alt="" className="h-24 w-full rounded-xl object-cover ring-1 ring-white/10" />
            ))}
          </div>
        )}
        {!!stages.length && !compact && (
          <div className="mt-4 space-y-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
              Stage roster · {format.label} · Grand finals first
            </p>
            {stages.map((row) => {
              const entries = normalizeStageEntries(row);
              return (
                <div key={`${edition.year}-${row.name}`} className="border-t border-white/5 pt-3">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-volt">{row.name || "Stage"}</p>
                  <ul className="mt-2 space-y-1.5 text-sm text-slate-300">
                    {entries.map((entry) => (
                      <li key={`${row.name}-${entry.name}-${entry.status}`} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <NameLink>{entry.name}</NameLink>
                        <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
                          {stageStatusLabel(entry.status)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
        {!!finalsRows.length && !compact && (
          <div className="mt-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Finals</p>
            <table className="mt-2 w-full text-left text-sm text-slate-300">
              <thead>
                <tr className="text-slate-500">
                  {format.finalsColumns.map((column) => (
                    <th key={column.key} className="py-1 pr-3 font-mono text-[10px] uppercase tracking-widest">
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {finalsRows.map((row, index) => (
                  <tr key={`${edition.year}-finals-${index}`} className="border-t border-white/5">
                    {format.finalsColumns.map((column) => (
                      <td key={column.key} className="py-2 pr-3">
                        {row[column.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {showPayouts && !compact && (
          <table className="mt-4 w-full text-left text-sm text-slate-300">
            <thead>
              <tr className="text-slate-500">
                <th className="py-1 pr-3 font-mono text-[10px] uppercase tracking-widest">Place</th>
                <th className="py-1 pr-3 font-mono text-[10px] uppercase tracking-widest">
                  {payouts.some((row) => row.team) && payouts.some((row) => row.player)
                    ? "Team / player"
                    : payouts.some((row) => row.player)
                      ? "Player"
                      : "Team"}
                </th>
                {showPrizes && <th className="py-1 font-mono text-[10px] uppercase tracking-widest">Prize</th>}
              </tr>
            </thead>
            <tbody>
              {payouts.map((row, index) => (
                <tr key={`${edition.year}-${row.rank}-${index}`} className="border-t border-white/5">
                  <td className="py-2 pr-3">{row.rank}</td>
                  <td className="py-2 pr-3">
                    <NameLink>{row.team || row.player}</NameLink>
                  </td>
                  {showPrizes && <td className="py-2">{row.prize}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {edition.highlights && !compact && (
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            {researchHighlightLabels().map(([key, label]) =>
              edition.highlights[key] ? (
                <div key={key} className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <dt className="font-mono text-[10px] uppercase tracking-widest text-neon">{label}</dt>
                  <dd className="mt-1 text-sm leading-6 text-slate-200">{edition.highlights[key]}</dd>
                </div>
              ) : null,
            )}
          </dl>
        )}
      </div>
    </div>
  );
}

function CompareTable({ editions, game, onRemove }) {
  const rows = [
    ["Year", (e) => e.year || e.season],
    ["Prize pool", (e) => e.prizePool],
    ["Champion", (e) => e.champion],
    ["Runner-up", (e) => e.runnerUp],
    ["MVP", (e) => e.mvp],
    ["Best IGL", (e) => e.bestIgl],
    ["Teams", (e) => e.totalTeams],
  ];
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10">
      <table className="w-full min-w-[640px] text-left text-sm text-slate-300">
        <thead>
          <tr className="border-b border-white/10 text-slate-500">
            <th className="p-3 font-mono text-[10px] uppercase tracking-widest">Field</th>
            {editions.map((edition, index) => (
              <th key={eventKey(edition, index)} className="p-3 align-top">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-white">
                    {edition.year || edition.season}
                    <span className="mt-1 block normal-case tracking-normal text-slate-400">{edition.event}</span>
                  </span>
                  {onRemove && (
                    <button
                      type="button"
                      aria-label={`Remove ${edition.event} from compare`}
                      onClick={() => onRemove(edition.__compareKey)}
                      className="shrink-0 text-slate-500 hover:text-white"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, getter]) => (
            <tr key={label} className="border-t border-white/5">
              <td className="p-3 font-mono text-[10px] uppercase tracking-widest text-slate-500">{label}</td>
              {editions.map((edition, index) => {
                const value = getter(edition);
                const isName = ["Champion", "Runner-up", "MVP", "Best IGL"].includes(label);
                return (
                  <td key={`${label}-${eventKey(edition, index)}`} className="p-3">
                    {isName && value ? <NameLink>{value}</NameLink> : value || "—"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className={`grid gap-3 border-t border-white/10 p-3 ${editions.length > 2 ? "lg:grid-cols-3" : "md:grid-cols-2"}`}>
        {editions.map((edition, index) => (
          <EventBody key={eventKey(edition, index)} edition={edition} game={game} compact />
        ))}
      </div>
    </div>
  );
}

function CompareTray({ items, max, onRemove, onCompare, onClear, canCompare }) {
  if (!items.length) return null;
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[80] flex justify-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      role="region"
      aria-label="Compare selected events"
    >
      <div className="pointer-events-auto w-full max-w-xl rounded-2xl border border-neon/50 bg-slate-950 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.65)]">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="font-mono text-[10px] uppercase tracking-widest text-neon">
            Compare list · {items.length}/{max}
          </p>
          <button
            type="button"
            onClick={onClear}
            className="font-mono text-[10px] uppercase tracking-widest text-slate-500 hover:text-slate-300"
          >
            Clear
          </button>
        </div>
        <ul className="mb-4 flex flex-wrap gap-2">
          {items.map((item) => (
            <li
              key={item.key}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 py-1 pl-3 pr-1 text-sm text-slate-200"
            >
              <span className="max-w-[160px] truncate">
                {item.edition.year || item.edition.season} · {item.edition.event}
              </span>
              <button
                type="button"
                aria-label={`Remove ${item.edition.event}`}
                onClick={() => onRemove(item.key)}
                className="rounded-full p-1 text-slate-500 hover:bg-white/10 hover:text-white"
              >
                <X size={12} />
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          disabled={!canCompare}
          onClick={onCompare}
          className="w-full rounded-xl bg-neon px-4 py-3 font-mono text-[11px] uppercase tracking-widest text-[var(--accent-contrast)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {canCompare ? `Compare ${items.length} events` : `Select ${COMPARE_MIN}–${max} events to compare`}
        </button>
      </div>
    </div>
  );
}

export default function EventTabs({ editions = [], game, heading = "", fallbackPoster, onSelectPoster }) {
  const ordered = useMemo(() => editionsNewestFirst(editions), [editions]);
  const [searchParams, setSearchParams] = useSearchParams();
  const eventParam = searchParams.get("event") || "";
  const compareParam = searchParams.get("compare") || "";
  const [picked, setPicked] = useState([]);
  const [addingMore, setAddingMore] = useState(false);
  const initialVisible = 9;

  const activeIndex = useMemo(() => {
    if (!ordered.length || !eventParam) return -1;
    const exact = ordered.findIndex((edition, index) => eventKey(edition, index) === eventParam);
    if (exact >= 0) return exact;
    const loose = ordered.findIndex((edition) => {
      const base = `${edition.year}-${edition.event}-${edition.eventScope || ""}`;
      return eventParam === base || eventParam.startsWith(`${base}-`);
    });
    return loose >= 0 ? loose : -1;
  }, [eventParam, ordered]);

  const compareKeys = useMemo(
    () =>
      compareParam
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, COMPARE_MAX),
    [compareParam],
  );

  const compareEditions = useMemo(
    () =>
      compareKeys
        .map((key) => {
          const index = ordered.findIndex((edition, i) => eventKey(edition, i) === key);
          if (index < 0) return null;
          return { ...ordered[index], __compareKey: key };
        })
        .filter(Boolean),
    [compareKeys, ordered],
  );

  const focused = activeIndex >= 0 && compareEditions.length === 0;
  const comparing = compareEditions.length >= COMPARE_MIN;
  const current = focused ? ordered[activeIndex] : null;

  useEffect(() => {
    if (compareKeys.length) setPicked(compareKeys);
  }, [compareParam]);

  useEffect(() => {
    if (!current || !onSelectPoster) return;
    onSelectPoster(eventPoster(current, fallbackPoster, game));
  }, [current, fallbackPoster, game, onSelectPoster]);

  const page = usePagedVisible(ordered.length, initialVisible, 9);
  const visibleIndexes = useMemo(
    () => Array.from({ length: page.visible }, (_, index) => index),
    [page.visible],
  );

  const pickedItems = useMemo(
    () =>
      picked
        .map((key) => {
          const index = ordered.findIndex((edition, i) => eventKey(edition, i) === key);
          if (index < 0) return null;
          return { key, edition: ordered[index], index };
        })
        .filter(Boolean),
    [picked, ordered],
  );

  const writeCompare = (keys) => {
    const next = new URLSearchParams(searchParams);
    next.delete("event");
    if (keys.length >= COMPARE_MIN) next.set("compare", keys.slice(0, COMPARE_MAX).join(","));
    else next.delete("compare");
    setSearchParams(next, { replace: false });
  };

  const openEvent = (index) => {
    const edition = ordered[index];
    if (!edition) return;
    const next = new URLSearchParams(searchParams);
    next.delete("compare");
    next.set("event", eventKey(edition, index));
    setSearchParams(next, { replace: false });
  };

  const addToCompare = (index) => {
    const key = eventKey(ordered[index], index);
    setPicked((currentPicks) => {
      if (currentPicks.includes(key)) return currentPicks;
      if (currentPicks.length >= COMPARE_MAX) return currentPicks;
      return [...currentPicks, key];
    });
  };

  const removeFromCompare = (key) => {
    setPicked((currentPicks) => currentPicks.filter((item) => item !== key));
    if (comparing || compareKeys.length) {
      const nextKeys = (comparing ? compareKeys : picked).filter((item) => item !== key);
      writeCompare(nextKeys);
      if (nextKeys.length < COMPARE_MIN) setAddingMore(false);
    }
  };

  const startCompare = () => {
    if (picked.length < COMPARE_MIN) return;
    setAddingMore(false);
    writeCompare(picked);
  };

  const clearPicks = () => {
    setPicked([]);
    if (compareParam) {
      const next = new URLSearchParams(searchParams);
      next.delete("compare");
      setSearchParams(next, { replace: false });
    }
  };

  if (!ordered.length) return null;

  if (comparing && !addingMore) {
    return (
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
            Comparing {compareEditions.length} of {COMPARE_MAX} max
          </p>
          <div className="flex flex-wrap gap-2">
            {compareEditions.length < COMPARE_MAX && (
              <button
                type="button"
                onClick={() => {
                  setPicked(compareKeys);
                  setAddingMore(true);
                }}
                className="font-mono text-[11px] uppercase tracking-widest text-neon"
              >
                Add event
              </button>
            )}
            <button
              type="button"
              onClick={clearPicks}
              className="font-mono text-[11px] uppercase tracking-widest text-slate-500 hover:text-slate-300"
            >
              Clear compare
            </button>
          </div>
        </div>
        <ul className="flex flex-wrap gap-2">
          {compareEditions.map((edition) => (
            <li
              key={edition.__compareKey}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 py-1 pl-3 pr-1 text-sm text-slate-200"
            >
              <span className="max-w-[180px] truncate">
                {edition.year || edition.season} · {edition.event}
              </span>
              <button
                type="button"
                aria-label={`Remove ${edition.event}`}
                onClick={() => removeFromCompare(edition.__compareKey)}
                className="rounded-full p-1 text-slate-500 hover:bg-white/10 hover:text-white"
              >
                <X size={12} />
              </button>
            </li>
          ))}
        </ul>
        <CompareTable editions={compareEditions} game={game} onRemove={removeFromCompare} />
      </section>
    );
  }

  if (focused && current && !addingMore) {
    return (
      <section className="mt-8 space-y-4">
        <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
          Event {activeIndex + 1} of {ordered.length}
        </p>
        <EventBody edition={current} game={game} />
      </section>
    );
  }

  return (
    <section className={`${comparing || addingMore ? "space-y-4" : "mt-8"} ${pickedItems.length ? "pb-40" : ""}`}>
      {(heading || game) && !addingMore && (
        <h2 className="font-display text-2xl text-white md:text-3xl">{heading || `All ${game} events`}</h2>
      )}
      {addingMore && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-neon">
            Add to compare · {picked.length}/{COMPARE_MAX}
          </p>
          <button
            type="button"
            onClick={() => {
              setAddingMore(false);
              if (picked.length >= COMPARE_MIN) writeCompare(picked);
            }}
            className="font-mono text-[11px] uppercase tracking-widest text-neon"
          >
            Done adding
          </button>
        </div>
      )}
      <div className="mb-3 mt-2 flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
          {ordered.length} editions · showing {Math.min(page.visible, ordered.length)}
          {picked.length > 0 ? ` · ${picked.length} selected` : ""}
        </p>
        <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
          Tap Add on 2–{COMPARE_MAX} events, then Compare at the bottom
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visibleIndexes.map((index) => {
          const edition = ordered[index];
          const key = eventKey(edition, index);
          const selected = picked.includes(key);
          const atMax = picked.length >= COMPARE_MAX && !selected;
          const champion =
            edition.champion || edition.payouts?.[0]?.team || edition.payouts?.[0]?.player || "";
          const slide = {
            ...edition,
            title: edition.event || game || "Event",
            game: edition.game || game,
            eventStatus: champion || (edition.payouts || []).length ? "completed" : "upcoming",
            season: edition.year || edition.season,
            kicker: [edition.year || edition.season, edition.eventScope].filter(Boolean).join(" · "),
            teamCount: edition.totalTeams,
            poster: eventPoster(edition, fallbackPoster, game),
            editions: [edition],
          };
          return (
            <div key={key} className={selected ? "ring-1 ring-neon/60 rounded-2xl" : undefined}>
              <TournamentWindowCard
                slide={slide}
                compact
                to="#"
                onOpen={() => openEvent(index)}
                bookmark={(
                  <button
                    type="button"
                    disabled={atMax}
                    aria-label={selected ? "Remove from compare list" : "Add to compare list"}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (selected) removeFromCompare(key);
                      else addToCompare(index);
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-black/70 px-2 py-1 font-mono text-[10px] uppercase tracking-widest disabled:cursor-not-allowed disabled:opacity-40 ${
                      selected ? "text-neon" : "text-slate-300"
                    }`}
                  >
                    {selected ? <CheckSquare size={11} /> : <Square size={11} />}
                    {selected ? "Remove" : atMax ? "Full" : "Add"}
                  </button>
                )}
              />
            </div>
          );
        })}
      </div>
      <LoadMoreBar
        className="mt-3"
        total={ordered.length}
        shown={page.visible}
        pageSize={9}
        initial={initialVisible}
        onMore={page.more}
        onLess={page.less}
      />
      <CompareTray
        items={pickedItems}
        max={COMPARE_MAX}
        onRemove={removeFromCompare}
        onClear={clearPicks}
        onCompare={startCompare}
        canCompare={pickedItems.length >= COMPARE_MIN && pickedItems.length <= COMPARE_MAX}
      />
    </section>
  );
}
