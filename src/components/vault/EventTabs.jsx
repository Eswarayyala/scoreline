import { useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { editionsNewestFirst, researchHighlightLabels } from "../../data/esportsResearch";
import { formatForGame } from "../../data/vaultDeskSchema";
import { flyerForEvent } from "../../data/platformShowcase";

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

function EventBody({ edition, game }) {
  const format = formatForGame(game, edition.structureId);
  const finalsRows = (edition.finalsTable || []).filter((row) => Object.values(row).some((value) => String(value || "").trim()));
  const stages = (edition.stages || []).filter((row) => row.kickedOff || row.teams);
  const yearLabel = [...new Set([edition.season, edition.year].filter((value) => String(value || "").trim()).map(String))];
  const payouts = (edition.payouts || []).filter((row) => row.rank || row.team || row.player || row.prize);
  const showPrizes = payouts.some((row) => String(row.prize || "").trim());
  const showPayouts = payouts.some((row) => !/^1st|^2nd/i.test(String(row.rank || "")) || showPrizes);
  const photos = (edition.images || []).filter(Boolean);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10">
      <img src={eventPoster(edition, "", game)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />
      <div className="absolute inset-0 bg-slate-950/80" />
      <div className="relative p-5 md:p-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-volt">{yearLabel.join(" · ")}</p>
        <h2 className="font-display text-3xl text-white md:text-4xl">{edition.event}</h2>
        <p className="mt-1 text-sm text-slate-400">{[edition.prizePool && `Prize pool ${edition.prizePool}`, edition.totalTeams && `${edition.totalTeams} teams groups to finals`].filter(Boolean).join(" · ")}</p>
        {(edition.champion || edition.runnerUp || edition.mvp || edition.bestIgl) && (
          <dl className="mt-4 grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
            {edition.champion && <div>Champion · {edition.champion}</div>}
            {edition.runnerUp && <div>Runner-up · {edition.runnerUp}</div>}
            {edition.third && <div>Third · {edition.third}</div>}
            {edition.mvp && <div>MVP · {edition.mvp}</div>}
            {edition.bestIgl && <div>Best IGL · {edition.bestIgl}</div>}
            {edition.fanFavourite && <div>Fan favourite · {edition.fanFavourite}</div>}
          </dl>
        )}
        {edition.formatNotes && <p className="mt-3 text-sm text-slate-400">{edition.formatNotes}</p>}
        {!!photos.length && (
          <div className="mt-4 grid grid-cols-3 gap-2">
            {photos.map((src) => (
              <img key={src.slice(0, 40)} src={src} alt="" className="h-24 w-full rounded-xl object-cover ring-1 ring-white/10" />
            ))}
          </div>
        )}
        {!!stages.length && (
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
        {!!finalsRows.length && (
          <div className="mt-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Finals</p>
            <table className="mt-2 w-full text-left text-sm text-slate-300">
              <thead>
                <tr className="text-slate-500">
                  {format.finalsColumns.map((column) => (
                    <th key={column.key} className="py-1 pr-3 font-mono text-[10px] uppercase tracking-widest">{column.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {finalsRows.map((row, index) => (
                  <tr key={`${edition.year}-finals-${index}`} className="border-t border-white/5">
                    {format.finalsColumns.map((column) => (
                      <td key={column.key} className="py-2 pr-3">{row[column.key]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {showPayouts && (
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
                  <td className="py-2 pr-3">{row.team || row.player}</td>
                  {showPrizes && <td className="py-2">{row.prize}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {edition.highlights && (
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

export default function EventTabs({ editions = [], game, fallbackPoster, onSelectPoster }) {
  const ordered = useMemo(() => editionsNewestFirst(editions), [editions]);
  const [searchParams, setSearchParams] = useSearchParams();
  const eventParam = searchParams.get("event") || "";
  const activeIndex = useMemo(() => {
    if (!ordered.length) return -1;
    const fromParam = ordered.findIndex((edition, index) => eventKey(edition, index) === eventParam);
    return fromParam >= 0 ? fromParam : -1;
  }, [eventParam, ordered]);
  const focused = activeIndex >= 0;
  const current = focused ? ordered[activeIndex] : null;

  useEffect(() => {
    if (!current || !onSelectPoster) return;
    onSelectPoster(eventPoster(current, fallbackPoster, game));
  }, [current, fallbackPoster, game, onSelectPoster]);

  const openEvent = (index) => {
    const edition = ordered[index];
    if (!edition) return;
    const next = new URLSearchParams(searchParams);
    next.set("event", eventKey(edition, index));
    setSearchParams(next, { replace: false });
  };

  const closeEvent = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("event");
    setSearchParams(next, { replace: false });
  };

  const openInNewTab = (index) => {
    const edition = ordered[index];
    if (!edition) return;
    const url = new URL(window.location.href);
    url.searchParams.set("event", eventKey(edition, index));
    window.open(url.toString(), "_blank", "noopener,noreferrer");
  };

  if (!ordered.length) return null;

  if (focused && current) {
    return (
      <section className="mt-8 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={closeEvent}
            className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-neon"
          >
            <ArrowLeft size={14} /> All events
          </button>
          <button
            type="button"
            onClick={() => openInNewTab(activeIndex)}
            className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-amber-300"
          >
            <ExternalLink size={14} /> Open in new tab
          </button>
        </div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
          Event {activeIndex + 1} of {ordered.length}
        </p>
        <EventBody edition={current} game={game} />
      </section>
    );
  }

  return (
    <section className="mt-8">
      <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-slate-500">
        Events · pick one to open full details (other events hide)
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {ordered.map((edition, index) => {
          const poster = eventPoster(edition, fallbackPoster, game);
          return (
            <div key={eventKey(edition, index)} className="relative overflow-hidden rounded-xl border border-white/10 bg-slate-950/40">
              <button
                type="button"
                onClick={() => openEvent(index)}
                className="relative block w-full px-3 py-3 text-left"
              >
                {poster && <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />}
                <span className="relative block font-mono text-[10px] uppercase tracking-widest text-neon">{edition.year || edition.season}</span>
                <span className="relative block truncate text-sm text-white">{edition.event || "Event"}</span>
              </button>
              <button
                type="button"
                aria-label={`Open ${edition.event || "event"} in new tab`}
                onClick={() => openInNewTab(index)}
                className="absolute right-2 top-2 z-10 rounded-full border border-white/15 bg-slate-950/80 p-1.5 text-amber-300"
              >
                <ExternalLink size={12} />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
