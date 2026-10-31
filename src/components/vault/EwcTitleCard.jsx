import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import {
  ewcMomentOf,
  ewcMvpOf,
  ewcWinnerLooksLikePlayer,
  ewcWinnerOf,
  posterForEwcEdition,
} from "../../data/ewcPoster";
import { windowFactBlurb } from "./TournamentWindowCard";

/**
 * EWC title card — gold championship chrome.
 * Header stack matches TournamentWindowCard (status → title → subline → body)
 * so EventTabs / championship grids stay visually aligned.
 */
export default function EwcTitleCard({
  edition = {},
  to = "#",
  onOpen,
  className = "",
  bookmark = null,
}) {
  const winner = ewcWinnerOf(edition);
  const mvp = ewcMvpOf(edition);
  const moment = windowFactBlurb(ewcMomentOf(edition), { maxChars: 160, maxSentences: 2 });
  const poster = posterForEwcEdition(edition);
  const game = edition.game || "Title";
  const year = edition.year || edition.season || "";
  const eventLabel = String(edition.event || "").trim();
  const playerWin = ewcWinnerLooksLikePlayer(winner) || ewcWinnerLooksLikePlayer(mvp);
  const subject = winner || mvp || game;
  const subjectKind = winner
    ? (playerWin ? "Champion" : "Champions")
    : mvp
      ? "MVP"
      : "Title";
  const showMvpChip = mvp && winner && mvp !== winner;
  // Hero stays the champion/MVP (distinct across EWC title grids); slot matches
  // TournamentWindowCard — top title, then mono subline, then body copy.
  const header = subject;
  const subline = [
    subjectKind,
    game && game !== header ? game : "",
    year,
    eventLabel && eventLabel !== header ? eventLabel : "",
  ]
    .filter(Boolean)
    .join(" · ");

  const open = (event) => {
    if (!onOpen) return;
    event.preventDefault();
    onOpen(event);
  };

  return (
    <article
      className={`group relative isolate z-0 flex h-full max-h-full flex-col overflow-hidden rounded-2xl border ${className}`}
      style={{
        borderColor: "rgba(212, 175, 55, 0.45)",
        boxShadow:
          "0 0 0 1px rgba(212, 175, 55, 0.12), 0 18px 40px rgba(0, 0, 0, 0.5), 0 0 28px rgba(212, 175, 55, 0.12)",
        height: "100%",
      }}
    >
      <div className="absolute inset-0 overflow-hidden">
        {poster ? (
          <img
            src={poster}
            alt=""
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
            style={{ objectPosition: playerWin ? "center top" : "50% 22%" }}
          />
        ) : (
          <div
            className="h-full w-full"
            style={{ background: "linear-gradient(160deg, #1a1208 0%, #0a0c12 55%, #061018 100%)" }}
          />
        )}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(8,6,2,0.35) 0%, rgba(8,6,2,0.55) 42%, rgba(8,6,2,0.92) 100%), linear-gradient(105deg, rgba(8,6,2,0.88) 0%, rgba(8,6,2,0.45) 55%, rgba(8,6,2,0.2) 100%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{
            background:
              "radial-gradient(ellipse at 70% 20%, rgba(212,175,55,0.22), transparent 55%)",
          }}
        />
      </div>

      <Link
        to={to}
        aria-label={`${game} · ${subject}`}
        className="absolute inset-0 z-[1]"
        onClick={onOpen ? open : undefined}
      />

      <div className="relative z-[2] flex min-h-0 flex-1 flex-col pointer-events-none p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <span
              className="inline-flex items-center rounded-md px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em]"
              style={{
                background: "rgba(212, 175, 55, 0.18)",
                border: "1px solid rgba(212, 175, 55, 0.45)",
                color: "#f0d78c",
              }}
            >
              EWC
            </span>
          </div>
          {bookmark ? <div className="pointer-events-auto">{bookmark}</div> : null}
        </div>

        <h3
          className="mt-2 line-clamp-2 max-w-[94%] font-['Bebas_Neue',sans-serif] text-[1.45rem] uppercase leading-none tracking-wide text-white"
          style={{ textShadow: "0 2px 18px rgba(0,0,0,0.65)" }}
        >
          {header}
        </h3>
        {subline ? (
          <p className="mt-1 line-clamp-2 font-mono text-[10px] uppercase tracking-[0.08em] text-stone-200/90">
            {subline}
          </p>
        ) : null}

        <div className="mt-1 min-h-0 flex-1 overflow-hidden">
          {showMvpChip ? (
            <p className="mt-2 inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest text-[#f0d78c]/90">
              <Sparkles size={10} />
              MVP {mvp}
            </p>
          ) : null}

          {moment ? (
            <p
              className="mt-1.5 text-[12px] leading-[1.4] text-stone-100/95"
              style={{ textShadow: "0 1px 10px rgba(0,0,0,0.55)" }}
            >
              {moment}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}
