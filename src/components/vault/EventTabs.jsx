import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckSquare, Square } from "lucide-react";
import { editionsNewestFirst, researchHighlightLabels } from "../../data/esportsResearch";
import { formatForGame } from "../../data/vaultDeskSchema";
import { flyerForEvent } from "../../data/platformShowcase";
import { dossierPath } from "../../data/competitorIndex";
import ShareEventCard from "./ShareEventCard";

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
  const stages = (edition.stages || []).filter((row) => row.kickedOff || row.teams);
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
          <div className="mt-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Kicked off by stage</p>
            <table className="mt-2 w-full text-left text-sm text-slate-300">
              <thead>
                <tr className="text-slate-500">
                  <th className="py-1 pr-3 font-mono text-[10px] uppercase tracking-widest">Stage</th>
                  <th className="py-1 pr-3 font-mono text-[10px] uppercase tracking-widest">Teams</th>
                  <th className="py-1 font-mono text-[10px] uppercase tracking-widest">Kicked off</th>
                </tr>
              </thead>
              <tbody>
                {stages.map((row) => (
                  <tr key={`${edition.year}-${row.name}-${row.kickedOff}`} className="border-t border-white/5">
                    <td className="py-2 pr-3">{row.name}</td>
                    <td className="py-2 pr-3">{row.teams}</td>
                    <td className="py-2">{row.kickedOff}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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

function CompareTable({ editions, game }) {
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
              <th key={eventKey(edition, index)} className="p-3 font-mono text-[10px] uppercase tracking-widest text-white">
                {edition.year || edition.season}
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

export default function EventTabs({ editions = [], game, heading = "", fallbackPoster, onSelectPoster }) {
  const ordered = useMemo(() => editionsNewestFirst(editions), [editions]);
  const [searchParams, setSearchParams] = useSearchParams();
  const eventParam = searchParams.get("event") || "";
  const compareParam = searchParams.get("compare") || "";
  const [picked, setPicked] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const initialVisible = 8;

  const activeIndex = useMemo(() => {
    if (!ordered.length || !eventParam) return -1;
    const exact = ordered.findIndex((edition, index) => eventKey(edition, index) === eventParam);
    if (exact >= 0) return exact;
    // Championship → game vault deep links may omit a stable index.
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
        .slice(0, 3),
    [compareParam],
  );

  const compareEditions = useMemo(
    () =>
      compareKeys
        .map((key) => {
          const index = ordered.findIndex((edition, i) => eventKey(edition, i) === key);
          return index >= 0 ? ordered[index] : null;
        })
        .filter(Boolean),
    [compareKeys, ordered],
  );

  const focused = activeIndex >= 0 && compareEditions.length === 0;
  const comparing = compareEditions.length >= 2;
  const current = focused ? ordered[activeIndex] : null;

  useEffect(() => {
    if (!current || !onSelectPoster) return;
    onSelectPoster(eventPoster(current, fallbackPoster, game));
  }, [current, fallbackPoster, game, onSelectPoster]);

  useEffect(() => {
    setExpanded(false);
  }, [ordered]);

  const needsCollapse = ordered.length > initialVisible;
  const visibleIndexes = useMemo(() => {
    if (!ordered.length) return [];
    if (expanded || !needsCollapse) return ordered.map((_, index) => index);
    return Array.from({ length: initialVisible }, (_, index) => index);
  }, [ordered, expanded, needsCollapse]);

  const openEvent = (index) => {
    const edition = ordered[index];
    if (!edition) return;
    const next = new URLSearchParams(searchParams);
    next.delete("compare");
    next.set("event", eventKey(edition, index));
    setSearchParams(next, { replace: false });
  };

  const togglePick = (index) => {
    const key = eventKey(ordered[index], index);
    setPicked((currentPicks) => {
      if (currentPicks.includes(key)) return currentPicks.filter((item) => item !== key);
      if (currentPicks.length >= 3) return currentPicks;
      return [...currentPicks, key];
    });
  };

  const startCompare = () => {
    if (picked.length < 2) return;
    const next = new URLSearchParams(searchParams);
    next.delete("event");
    next.set("compare", picked.join(","));
    setSearchParams(next, { replace: false });
  };

  if (!ordered.length) return null;

  if (comparing) {
    return (
      <section className="mt-8 space-y-4">
        <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
          Comparing {compareEditions.length} editions
        </p>
        <CompareTable editions={compareEditions} game={game} />
      </section>
    );
  }

  if (focused && current) {
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
    <section className="mt-8">
      {(heading || game) && (
        <h2 className="font-display text-2xl text-white md:text-3xl">{heading || `All ${game} events`}</h2>
      )}
      <div className="mb-3 mt-2 flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
          Minimal cards for every edition — open one for full details
        </p>
        {picked.length >= 2 && (
          <button
            type="button"
            onClick={startCompare}
            className="font-mono text-[11px] uppercase tracking-widest text-amber-300"
          >
            Compare {picked.length} editions
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {visibleIndexes.map((index) => {
          const edition = ordered[index];
          const key = eventKey(edition, index);
          const selected = picked.includes(key);
          const champion =
            edition.champion || edition.payouts?.[0]?.team || edition.payouts?.[0]?.player || "";
          return (
            <article
              key={key}
              className="flex flex-col border border-white/10 bg-white/[0.03] transition hover:border-amber-400/50 hover:bg-white/[0.05]"
            >
              <button
                type="button"
                onClick={() => openEvent(index)}
                className="flex flex-1 flex-col p-4 text-left"
              >
                <p className="font-mono text-[10px] uppercase tracking-widest text-neon">
                  {[edition.year || edition.season, edition.eventScope].filter(Boolean).join(" · ")} · Preview
                </p>
                <h3 className="mt-1 font-display text-2xl leading-tight text-white md:text-3xl">
                  {edition.event || game || "Event"}
                </h3>
                <p className="mt-2 line-clamp-2 text-sm text-slate-400">
                  {[
                    champion && `Champion ${champion}`,
                    edition.prizePool,
                    edition.totalTeams && `${edition.totalTeams} teams`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </button>
              <div className="flex items-center justify-between gap-2 border-t border-white/10 px-4 py-2">
                <button
                  type="button"
                  aria-label={selected ? "Remove from compare" : "Add to compare"}
                  onClick={() => togglePick(index)}
                  className={`inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest ${selected ? "text-neon" : "text-slate-600 hover:text-slate-400"}`}
                >
                  {selected ? <CheckSquare size={11} /> : <Square size={11} />}
                  Compare
                </button>
              </div>
            </article>
          );
        })}
        {needsCollapse && (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="min-h-[8rem] border border-dashed border-neon/40 px-4 py-4 font-mono text-[10px] uppercase tracking-widest text-neon hover:border-neon sm:min-h-0"
          >
            {expanded ? "Less" : `More (+${ordered.length - initialVisible})`}
          </button>
        )}
      </div>
    </section>
  );
}
