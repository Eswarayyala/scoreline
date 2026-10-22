import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PRE_EWC_HISTORY } from "../../data/preEwcHistory";

export default function PreEwcHistoryPage() {
  const games = useMemo(() => [...new Set(PRE_EWC_HISTORY.map((item) => item.game))], []);
  const [game, setGame] = useState("all");
  const circuits = PRE_EWC_HISTORY.filter((item) => game === "all" || item.game === game);
  const total = circuits.reduce((count, item) => count + item.editions.length, 0);

  return (
    <div className="pb-10 pt-6">
      <Link to="/vault" className="font-mono text-xs uppercase tracking-widest text-neon">← The Vault</Link>
      <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.18em] text-neon">Launch-era majors · not merged yet</p>
      <h1 className="mt-1 font-['Bebas_Neue',sans-serif] text-5xl tracking-wide text-white">Pre-EWC history</h1>
      <p className="mb-6 mt-2 max-w-2xl text-sm text-stone-400">
        Converted from Master extraction.txt. {total} events across {circuits.length} circuits. Trim this list, then paste the kept file so it can merge into each game vault from launch year forward.
      </p>
      <label className="mb-8 block font-mono text-[11px] uppercase tracking-widest text-stone-400">
        Game
        <select className="ml-2 border border-white/15 bg-black/40 px-2 py-1 text-white" value={game} onChange={(event) => setGame(event.target.value)}>
          <option value="all">All games</option>
          {games.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
      </label>
      <div className="space-y-8">
        {circuits.map((circuit) => (
          <section key={circuit.id} className="border border-white/10 bg-black/20 p-5">
            <p className="m-0 font-mono text-[10px] uppercase tracking-widest text-cyan-300">{circuit.editions.length} events · region related</p>
            <h2 className="mt-1 font-['Bebas_Neue',sans-serif] text-4xl text-white">{circuit.circuit || circuit.game}</h2>
            {circuit.origin && <p className="mt-2 text-sm text-stone-400">{circuit.origin}</p>}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm text-stone-300">
                <thead>
                  <tr className="text-stone-500">
                    <th className="py-1 pr-3 font-mono text-[10px] uppercase tracking-widest">Year</th>
                    <th className="py-1 pr-3 font-mono text-[10px] uppercase tracking-widest">Event</th>
                    <th className="py-1 pr-3 font-mono text-[10px] uppercase tracking-widest">Champion</th>
                    <th className="py-1 pr-3 font-mono text-[10px] uppercase tracking-widest">Runner-up</th>
                    <th className="py-1 font-mono text-[10px] uppercase tracking-widest">Prize</th>
                  </tr>
                </thead>
                <tbody>
                  {circuit.editions.map((edition) => (
                    <tr key={`${edition.year}-${edition.event}`} className="border-t border-white/5 align-top">
                      <td className="py-2 pr-3">{edition.year}</td>
                      <td className="py-2 pr-3">
                        <div className="text-white">{edition.event}</div>
                        {edition.highlight && <div className="mt-1 text-xs text-stone-500">{edition.highlight}</div>}
                      </td>
                      <td className="py-2 pr-3">{edition.champion}</td>
                      <td className="py-2 pr-3">{edition.runnerUp}</td>
                      <td className="py-2">{edition.prizePool}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
