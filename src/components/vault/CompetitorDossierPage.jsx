import { Link } from "react-router-dom";
import { ArrowLeft, Building2, Trophy, UserRound } from "lucide-react";
import { findCompetitor } from "../../data/competitorIndex";
import AchievementBadges, { PlacementTrendGraph } from "../shared/AchievementBadges";

export default function CompetitorDossierPage({ slides = [], name = "" }) {
  const decoded = decodeURIComponent(String(name || "").trim());
  const dossier = findCompetitor(slides, decoded);

  if (!dossier) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16 text-center">
        <h1 className="font-display text-5xl text-white">No dossier yet</h1>
        <p className="mt-3 text-slate-400">
          {decoded ? `"${decoded}" is not linked across vault editions yet.` : "Missing competitor name."}
        </p>
        <Link to="/vault" className="mt-6 inline-flex items-center gap-2 text-neon">
          <ArrowLeft size={16} /> The Vault
        </Link>
      </div>
    );
  }

  const isFranchise = dossier.kind === "franchise";
  const champs = dossier.titles || dossier.appearances.filter((row) => /champion/i.test(row.role)).length;

  return (
    <article className="mx-auto max-w-4xl px-5 pb-20 pt-6">
      <div className="flex flex-wrap items-center gap-4">
        <Link to="/vault" className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-neon">
          <ArrowLeft size={14} /> The Vault
        </Link>
        <Link
          to={isFranchise ? "/vault/franchises" : "/vault/players"}
          className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-amber-300"
        >
          {isFranchise ? <Building2 size={14} /> : <UserRound size={14} />}
          {isFranchise ? "All franchises" : "All players"}
        </Link>
      </div>
      <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.22em] text-volt">
        {isFranchise ? "Franchise dossier" : dossier.kind === "player" ? "Player dossier" : "Competitor dossier"}
      </p>
      <h1 className="font-display text-5xl text-white md:text-7xl">{dossier.name}</h1>
      <p className="mt-2 text-slate-400">
        {[
          `${dossier.appearanceCount || dossier.appearances.length} appearances`,
          champs > 0 && `${champs} titles`,
          `${dossier.gameCount || dossier.games.length} game${(dossier.gameCount || dossier.games.length) === 1 ? "" : "s"}`,
          dossier.games.join(" · "),
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>
      <p className="mt-2 text-xs text-slate-500">
        Classified from payout fields, event format, known orgs, and role type (MVP / IGL stay players even on team titles).
      </p>
      <AchievementBadges
        player={{
          style: isFranchise ? "" : dossier.appearances.some((row) => /igl/i.test(row.role)) ? "IGL / Shotcaller" : "",
          titles: champs,
          badges: champs > 0 ? ["MVP"] : [],
          lookingFor: dossier.gameCount > 1 ? ["Competitive"] : [],
        }}
        extra={isFranchise ? ["Franchise"] : ["Player"]}
      />
      {!isFranchise && (
        <PlacementTrendGraph
          className="mt-4"
          placements={dossier.appearances
            .map((row) => {
              const place = String(row.role || "").match(/(\d+)/);
              if (/champion/i.test(row.role)) return 1;
              if (/runner/i.test(row.role)) return 2;
              if (/third/i.test(row.role)) return 3;
              return place ? Number(place[1]) : null;
            })
            .filter(Boolean)
            .slice(0, 8)
            .reverse()}
        />
      )}
      <ul className="mt-8 space-y-3">
        {dossier.appearances.map((row, index) => (
          <li key={`${row.year}-${row.event}-${row.role}-${index}`} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-neon">
                  {[row.year, row.game, row.eventScope, row.sourceField].filter(Boolean).join(" · ")}
                </p>
                <p className="mt-1 text-lg text-white">
                  {row.slug ? (
                    <Link to={`/vault/${row.slug}`} className="text-white no-underline hover:text-neon">
                      {row.event}
                    </Link>
                  ) : (
                    row.event
                  )}
                </p>
                <p className="mt-1 flex items-center gap-2 text-sm text-slate-300">
                  <Trophy size={14} className="text-amber-300" />
                  {row.role}
                  {row.prize ? ` · ${row.prize}` : ""}
                </p>
              </div>
              {row.prizePool && <span className="font-mono text-[11px] text-slate-500">{row.prizePool}</span>}
            </div>
          </li>
        ))}
      </ul>
    </article>
  );
}
