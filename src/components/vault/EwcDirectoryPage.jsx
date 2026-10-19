import { Link } from "react-router-dom";
import { flattenEwcEditions, groupEwcChampionships } from "../../data/esportsResearch";
import { gamesMatch, inferEventScope } from "../../data/eventScope";
import ChampionshipGameTabs from "./ChampionshipGameTabs";

export default function EwcDirectoryPage({ slides = [], liveEntries = [] }) {
  const fromVault = flattenEwcEditions(slides);
  const fromBlogs = liveEntries
    .filter((entry) => entry.eventScope === "ewc" || inferEventScope(`${entry.tournament} ${entry.game}`) === "ewc")
    .map((entry) => {
      const vault = slides.find((slide) => gamesMatch(slide.game, entry.game));
      return {
        year: String(entry.eventDate || "").match(/(\d{4})/)?.[1] || entry.eventDate,
        game: entry.game,
        event: entry.tournament,
        prizePool: "",
        champion: entry.winner,
        payouts: [{ team: entry.winner }],
        slug: vault?.slug || "",
        eventScope: "ewc",
      };
    });
  const seen = new Set();
  const editions = [...fromVault, ...fromBlogs].filter((edition) => {
    const key = `${edition.game}|${edition.year}|${edition.event}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const championships = groupEwcChampionships(editions);
  return (
    <div className="pb-16 pt-6">
      <Link to="/vault" className="font-mono text-xs uppercase tracking-widest text-neon">
        ← The Vault
      </Link>
      <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.18em] text-amber-400">Shared championship index</p>
      <h1 className="mt-1 font-['Bebas_Neue',sans-serif] text-5xl tracking-wide text-white">Esports World Cup</h1>
      <p className="mb-8 mt-2 max-w-2xl text-sm text-stone-400">
        Every EWC / Gamers8 year opens as game tabs. Per-game vaults marked EWC related join the same championship.
      </p>
      <div className="grid gap-8">
        {championships.map((championship) => (
          <section key={championship.key} className="border border-white/10 bg-black/20 p-5">
            <p className="m-0 font-mono text-[10px] uppercase tracking-widest text-cyan-300">
              {championship.year} · {championship.games.length} games
            </p>
            <h2 className="mt-1 font-['Bebas_Neue',sans-serif] text-4xl text-white">{championship.title}</h2>
            <ChampionshipGameTabs games={championship.games} heading="" />
          </section>
        ))}
      </div>
    </div>
  );
}
