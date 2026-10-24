import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Building2, UserRound } from "lucide-react";
import { dossierPath, listFranchises, listPlayers } from "../../data/competitorIndex";
import { canonicalFilterGame, gameMatchesFilter } from "../../data/gameCatalog";

export default function CompetitorDirectoryPage({ slides = [], kind = "franchise" }) {
  const isFranchise = kind === "franchise";
  const [game, setGame] = useState("all");
  const [query, setQuery] = useState("");

  const rows = useMemo(
    () => (isFranchise ? listFranchises(slides) : listPlayers(slides)),
    [isFranchise, slides],
  );

  const games = useMemo(() => {
    const seen = new Set();
    rows.forEach((row) => row.games.forEach((name) => {
      const label = canonicalFilterGame(name);
      if (label) seen.add(label);
    }));
    return [...seen].sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const visible = rows.filter((row) => {
    if (game !== "all" && !row.games.some((name) => gameMatchesFilter(name, game))) return false;
    const q = query.trim().toLowerCase();
    if (q && !row.name.toLowerCase().includes(q)) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-5xl px-5 pb-20 pt-6">
      <div className="relative mb-2 border-b border-white/10 py-2">
        <Link to="/vault" className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-neon">
          <ArrowLeft size={14} /> The Vault
        </Link>
      </div>
      <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl text-white md:text-5xl">{isFranchise ? "Franchises" : "Players"}</h1>
          <p className="mt-1 max-w-lg text-xs text-slate-500">
            {isFranchise ? "Multi-game orgs from vault team records." : "Players from payouts, MVP, and IGL fields."}
          </p>
        </div>
        <div className="flex gap-3 font-mono text-[10px] uppercase tracking-widest">
          <Link to="/vault/franchises" className={`inline-flex items-center gap-1 no-underline ${isFranchise ? "text-neon" : "text-slate-600 hover:text-slate-300"}`}>
            <Building2 size={12} /> Franchises
          </Link>
          <Link to="/vault/players" className={`inline-flex items-center gap-1 no-underline ${!isFranchise ? "text-neon" : "text-slate-600 hover:text-slate-300"}`}>
            <UserRound size={12} /> Players
          </Link>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-white/5 pb-3">
        <label className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-slate-500">
          Game
          <select
            className="border-0 border-b border-white/20 bg-transparent py-0.5 text-[11px] normal-case tracking-normal text-white outline-none"
            value={game}
            onChange={(event) => setGame(event.target.value)}
          >
            <option value="all">All</option>
            {games.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-slate-500">
          Search
          <input
            className="border-0 border-b border-white/20 bg-transparent py-0.5 text-[11px] normal-case tracking-normal text-white outline-none"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={isFranchise ? "Org" : "Player"}
          />
        </label>
        <p className="font-mono text-[10px] uppercase tracking-widest text-slate-600">{visible.length}</p>
      </div>

      <div className="mt-6 grid gap-3">
        {visible.length === 0 ? (
          <p className="text-sm text-slate-500">No matches in the current vault data.</p>
        ) : (
          visible.map((row) => (
            <Link
              key={row.key}
              to={dossierPath(row.name)}
              className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-inherit no-underline hover:border-neon/40"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-neon">
                    {isFranchise ? "Franchise" : "Player"} · {row.gameCount} game{row.gameCount === 1 ? "" : "s"} ·{" "}
                    {row.appearanceCount} appearance{row.appearanceCount === 1 ? "" : "s"}
                    {row.titles ? ` · ${row.titles} title${row.titles === 1 ? "" : "s"}` : ""}
                  </p>
                  <h2 className="mt-1 font-display text-3xl text-white">{row.name}</h2>
                  <p className="mt-1 text-sm text-slate-400">{row.games.join(" · ")}</p>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <div>Latest · {row.appearances[0]?.year || "—"}</div>
                  <div className="mt-1 max-w-[220px] truncate">{row.appearances[0]?.event || ""}</div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
