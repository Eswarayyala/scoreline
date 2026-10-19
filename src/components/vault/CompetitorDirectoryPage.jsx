import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Building2, UserRound } from "lucide-react";
import { dossierPath, listFranchises, listPlayers } from "../../data/competitorIndex";

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
    rows.forEach((row) => row.games.forEach((name) => name && seen.add(name)));
    return [...seen].sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const visible = rows.filter((row) => {
    if (game !== "all" && !row.games.some((name) => name === game)) return false;
    const q = query.trim().toLowerCase();
    if (q && !row.name.toLowerCase().includes(q)) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-5xl px-5 pb-20 pt-6">
      <Link to="/vault" className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-neon">
        <ArrowLeft size={14} /> The Vault
      </Link>
      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-volt">
            {isFranchise ? "Multi-title orgs" : "Single-game competitors"}
          </p>
          <h1 className="font-display text-5xl text-white md:text-6xl">{isFranchise ? "Franchises" : "Players"}</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            {isFranchise
              ? "Organizations that show up across vault editions — often multiple games and repeated titles. Built from team payouts, known orgs, and team-format champions."
              : "Individuals from player formats, MVP / IGL / fan-favourite fields, and player payouts. Prefer one game and fewer appearances."}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/vault/franchises"
            className={`inline-flex items-center gap-2 border px-3 py-2 font-mono text-[11px] uppercase tracking-widest no-underline ${
              isFranchise ? "border-amber-400/50 text-amber-300" : "border-white/15 text-slate-400"
            }`}
          >
            <Building2 size={14} /> Franchises
          </Link>
          <Link
            to="/vault/players"
            className={`inline-flex items-center gap-2 border px-3 py-2 font-mono text-[11px] uppercase tracking-widest no-underline ${
              !isFranchise ? "border-amber-400/50 text-amber-300" : "border-white/15 text-slate-400"
            }`}
          >
            <UserRound size={14} /> Players
          </Link>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <label className="font-mono text-[11px] uppercase tracking-widest text-slate-500">
          Game
          <select
            className="ml-2 border border-white/15 bg-slate-950 px-2 py-1 text-white"
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
        <label className="font-mono text-[11px] uppercase tracking-widest text-slate-500">
          Search
          <input
            className="ml-2 border border-white/15 bg-slate-950 px-2 py-1 text-white"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={isFranchise ? "Org name" : "Player tag"}
          />
        </label>
        <p className="self-end font-mono text-[10px] uppercase tracking-widest text-slate-600">
          {visible.length} shown
        </p>
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
