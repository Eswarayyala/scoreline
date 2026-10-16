import { Link } from "react-router-dom";
import { flattenEwcEditions } from "../../data/esportsResearch";
import { gamesMatch, inferEventScope } from "../../data/eventScope";

export default function EwcDirectoryPage({ slides = [], liveEntries = [] }) {
  const fromVault = flattenEwcEditions(slides);
  const fromBlogs = liveEntries
    .filter((entry) => entry.eventScope === "ewc" || inferEventScope(entry.tournament) === "ewc")
    .map((entry) => {
      const vault = slides.find((slide) => gamesMatch(slide.game, entry.game));
      return {
        year: String(entry.eventDate || "").match(/(\d{4})/)?.[1] || entry.eventDate,
        game: entry.game,
        event: entry.tournament,
        prizePool: "",
        payouts: [{ team: entry.winner }],
        slug: vault?.slug || "",
        source: "blog",
      };
    });
  const seen = new Set();
  const editions = [...fromVault, ...fromBlogs].filter((edition) => {
    const key = `${edition.game}|${edition.year}|${edition.event}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return (
    <div className="pb-16 pt-6">
      <Link to="/vault" className="font-mono text-xs uppercase tracking-widest text-neon">← The Vault</Link>
      <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.18em] text-amber-400">Shared championship index</p>
      <h1 className="mt-1 font-['Bebas_Neue',sans-serif] text-5xl tracking-wide text-white">Esports World Cup</h1>
      <p className="mb-8 mt-2 max-w-2xl text-sm text-stone-400">Per-game recaps merge here when they are marked EWC related. Open a row to land on that game&apos;s vault.</p>
      <div className="grid gap-3">
        {editions.map((edition) => (
          <Link
            key={`${edition.slug}-${edition.year}-${edition.event}`}
            to={edition.slug ? `/vault/${edition.slug}` : "/vault"}
            className="block border border-white/10 bg-black/20 p-4 no-underline text-inherit hover:border-amber-400/50"
          >
            <p className="m-0 font-mono text-[10px] uppercase tracking-widest text-cyan-300">{edition.year} · {edition.game}</p>
            <h2 className="mt-1 font-['Bebas_Neue',sans-serif] text-2xl text-white">{edition.event}</h2>
            <p className="mt-1 text-sm text-stone-400">
              {edition.prizePool}
              {edition.payouts?.[0] ? ` · ${edition.payouts[0].team || edition.payouts[0].player}` : ""}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
