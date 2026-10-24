import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Building2, Trophy, UserRound } from "lucide-react";
import { findCompetitor } from "../../data/competitorIndex";
import AchievementBadges from "../shared/AchievementBadges";
import LoadMoreBar, { usePagedVisible } from "../shared/LoadMoreBar";

const TAB_PAGE = 9;

export default function CompetitorDossierPage({ slides = [], name = "" }) {
  const decoded = decodeURIComponent(String(name || "").trim());
  const dossier = findCompetitor(slides, decoded);

  const gameTabs = useMemo(() => {
    if (!dossier) return [];
    const map = new Map();
    dossier.appearances.forEach((row) => {
      const game = row.game || "Other";
      if (!map.has(game)) map.set(game, []);
      map.get(game).push(row);
    });
    return [...map.entries()].map(([game, rows]) => ({ game, rows }));
  }, [dossier]);

  const [activeGame, setActiveGame] = useState("");
  const page = usePagedVisible(gameTabs.length, TAB_PAGE, TAB_PAGE);

  useEffect(() => {
    setActiveGame(gameTabs[0]?.game || "");
  }, [gameTabs, decoded]);

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
  const safeGame = gameTabs.some((tab) => tab.game === activeGame) ? activeGame : gameTabs[0]?.game || "";
  const activeRows = gameTabs.find((tab) => tab.game === safeGame)?.rows || [];
  const visibleTabs = gameTabs.slice(0, page.visible);
  const activeBeyond = gameTabs.findIndex((tab) => tab.game === safeGame) >= page.visible;
  const tabsToShow = activeBeyond
    ? [...visibleTabs.slice(0, Math.max(0, TAB_PAGE - 1)), gameTabs.find((tab) => tab.game === safeGame)].filter(Boolean)
    : visibleTabs;

  return (
    <article className="mx-auto max-w-4xl px-5 pb-20 pt-6">
      <div className="relative mb-2 flex flex-wrap items-center gap-4 border-b border-white/10 py-2">
        <Link to="/vault" className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-neon">
          <ArrowLeft size={14} /> The Vault
        </Link>
        <Link
          to={isFranchise ? "/vault/franchises" : "/vault/players"}
          className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-neon"
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
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>
      <div className="mt-2">
        <AchievementBadges
          player={{
            style: isFranchise ? "" : dossier.appearances.some((row) => /igl/i.test(row.role)) ? "IGL / Shotcaller" : "",
            titles: champs,
            badges: champs > 0 ? ["MVP"] : [],
            lookingFor: dossier.gameCount > 1 ? ["Competitive"] : [],
          }}
          extra={isFranchise ? ["Franchise"] : ["Player"]}
        />
      </div>

      <section className="mt-8">
        <h2 className="font-display text-3xl text-white">By title</h2>
        <div className="mt-3 flex flex-wrap items-center gap-1 border-b border-white/10">
          {tabsToShow.map((tab) => {
            const on = tab.game === safeGame;
            return (
              <button
                key={tab.game}
                type="button"
                onClick={() => setActiveGame(tab.game)}
                className={`px-2.5 py-2 font-mono text-[10px] uppercase tracking-wider ${
                  on ? "border-b border-neon text-white" : "border-b border-transparent text-slate-500 hover:text-slate-300"
                }`}
              >
                {tab.game}
              </button>
            );
          })}
        </div>
        <LoadMoreBar
          className="mt-2"
          total={gameTabs.length}
          shown={page.visible}
          pageSize={TAB_PAGE}
          initial={TAB_PAGE}
          onMore={page.more}
          onLess={page.less}
        />
        <ul className="mt-4 space-y-3">
          {activeRows.map((row, index) => (
            <li key={`${row.year}-${row.event}-${row.role}-${index}`} className="border-t border-white/5 pt-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-neon">
                {[row.year, row.eventScope, row.sourceField].filter(Boolean).join(" · ")}
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
                <Trophy size={14} className="text-neon" />
                {row.role}
                {row.prize ? ` · ${row.prize}` : ""}
                {row.prizePool ? ` · ${row.prizePool}` : ""}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
