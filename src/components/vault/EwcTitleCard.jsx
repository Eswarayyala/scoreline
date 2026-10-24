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
 * EWC-only title card — gold championship chrome with the winning
 * player / team / moment driving that game's poster.
 */
export default function EwcTitleCard({
  edition = {},
  to = "#",
  onOpen,
  className = "",
}) {
  const winner = ewcWinnerOf(edition);
  const mvp = ewcMvpOf(edition);
  const moment = windowFactBlurb(ewcMomentOf(edition), { maxChars: 160, maxSentences: 2 });
  const poster = posterForEwcEdition(edition);
  const game = edition.game || "Title";
  const playerWin = ewcWinnerLooksLikePlayer(winner) || ewcWinnerLooksLikePlayer(mvp);
  const subject = winner || mvp || game;
  const subjectKind = winner
    ? (playerWin ? "Champion" : "Champions")
    : mvp
      ? "MVP"
      : "Title";
  const showMvpChip = mvp && winner && mvp !== winner;

  const open = (event) => {
    if (!onOpen) return;
    event.preventDefault();
    onOpen(event);
  };

  return (
    <article
      className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border ${className}`}
      style={{
        borderColor: "rgba(212, 175, 55, 0.45)",
        boxShadow:
          "0 0 0 1px rgba(212, 175, 55, 0.12), 0 18px 40px rgba(0, 0, 0, 0.5), 0 0 28px rgba(212, 175, 55, 0.12)",
        height: "100%",
      }}
    >
      <div className="absolute inset-0">
        {poster ? (
          <img
            src={poster}
            alt=""
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
            style={{ objectPosition: playerWin ? "center top" : "60% center" }}
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
              "linear-gradient(180deg, rgba(8,6,2,0.25) 0%, rgba(8,6,2,0.55) 38%, rgba(8,6,2,0.92) 78%, #080602 100%)",
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

      <div className="relative z-[2] flex min-h-0 flex-1 flex-col p-3 pointer-events-none">
        {showMvpChip ? (
          <div className="flex justify-end">
            <span className="inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest text-[#f0d78c]/90">
              <Sparkles size={10} />
              MVP {mvp}
            </span>
          </div>
        ) : null}

        <p className={`font-mono text-[10px] uppercase tracking-[0.14em] text-[#f0d78c]/80 ${showMvpChip ? "mt-2" : ""}`}>
          {game}
        </p>

        <div className="mt-auto pt-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#c4a35a]">
            {subjectKind}
          </p>
          <h3
            className="mt-0.5 font-['Bebas_Neue',sans-serif] text-[1.65rem] uppercase leading-[0.95] tracking-wide text-white"
            style={{ textShadow: "0 2px 18px rgba(0,0,0,0.7)" }}
          >
            {subject}
          </h3>
          {moment ? (
            <p className="mt-2 text-[12px] leading-[1.4] text-stone-200/95" style={{ textShadow: "0 1px 8px rgba(0,0,0,0.6)" }}>
              {moment}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}
