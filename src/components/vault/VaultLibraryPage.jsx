import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { VAULT_SLIDES, flyerForEvent } from "../../data/platformShowcase";
import { publicScopeKicker } from "../../data/eventScope";

function SlideCard({ slide }) {
  return (
    <Link to={`/vault/${slide.slug}`} className="overflow-hidden border border-white/10 bg-black/20 no-underline text-inherit hover:border-amber-400/50">
      <div className="aspect-video overflow-hidden">
        <img src={flyerForEvent(slide)} alt="" className="h-full w-full object-cover" />
      </div>
      <div className="p-3">
        <p className="m-0 font-mono text-[10px] uppercase tracking-widest text-cyan-300">{[publicScopeKicker(slide), slide.game].filter(Boolean).join(" · ")}</p>
        <h3 className="mt-1 font-['Bebas_Neue',sans-serif] text-2xl text-white">{slide.title}</h3>
        {slide.peakPrizePool && (
          <p className="mt-1 text-xs text-stone-400">Peak prize pool {slide.peakPrizePool}</p>
        )}
      </div>
    </Link>
  );
}

export default function VaultLibraryPage({ slides = VAULT_SLIDES, children }) {
  const items = slides.length ? slides : VAULT_SLIDES;
  const [game, setGame] = useState("all");
  const [scope, setScope] = useState("all");
  const games = useMemo(() => {
    const seen = new Set();
    return items.map((slide) => slide.game).filter((name) => {
      const game = String(name || "").trim();
      const key = game.toLowerCase();
      if (!game || seen.has(key)) return false;
      seen.add(key);
      return true;
    }).sort((a, b) => a.localeCompare(b));
  }, [items]);
  const visible = items.filter((slide) => {
    const gameOk = game === "all" || slide.game === game;
    if (scope === "all") return gameOk;
    if (slide.eventScope === scope) return gameOk;
    if ((slide.editions || []).some((edition) => edition.eventScope === scope)) return gameOk;
    if (scope === "ewc" && (slide.floating === true || slide.surface === "ewc-window")) return gameOk;
    return false;
  });
  const floating = visible.filter((slide) => slide.floating === true);
  const research = visible.filter((slide) => (slide.research || slide.surface === "research") && !slide.floating && slide.surface !== "ewc-window");
  const blogs = visible.filter((slide) => slide.blog || slide.surface === "blog");
  return (
    <div className="pb-10 pt-6">
      <p className="m-0 font-mono text-[11px] uppercase tracking-[0.18em] text-amber-400">Circuit archive</p>
      <h1 className="mt-1 font-['Bebas_Neue',sans-serif] text-5xl tracking-wide text-white">The Vault</h1>
      <p className="mb-6 mt-2 max-w-2xl text-sm text-stone-400">EWC championship years float here as windows. Game vaults and published recaps stay on the same catalog.</p>
      <div className="mb-8 flex flex-wrap items-center gap-3">
        <Link to="/vault/ewc" className="inline-flex border border-amber-400/40 bg-amber-400/10 px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-amber-300 no-underline">All EWC editions</Link>
        <label className="font-mono text-[11px] uppercase tracking-widest text-stone-400">
          Game vault
          <select className="ml-2 border border-white/15 bg-black/40 px-2 py-1 text-white" value={game} onChange={(e) => setGame(e.target.value)}>
            <option value="all">All games</option>
            {games.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
        <label className="font-mono text-[11px] uppercase tracking-widest text-stone-400">
          Event type
          <select className="ml-2 border border-white/15 bg-black/40 px-2 py-1 text-white" value={scope} onChange={(e) => setScope(e.target.value)}>
            <option value="all">All</option>
            <option value="ewc">EWC related</option>
            <option value="region">Region related</option>
            <option value="random">Random event</option>
          </select>
        </label>
      </div>
      {floating.length > 0 && (
        <>
          <h2 className="mb-3 font-['Bebas_Neue',sans-serif] text-3xl text-white">Floating windows</h2>
          <div className="mb-10 grid grid-cols-1 gap-4 md:grid-cols-2">
            {floating.map((slide) => <SlideCard key={slide.slug || slide.id} slide={slide} />)}
          </div>
        </>
      )}
      {research.length > 0 && (
        <>
          <h2 className="mb-3 font-['Bebas_Neue',sans-serif] text-3xl text-white">Game vaults</h2>
          <div className="mb-10 grid grid-cols-1 gap-4 md:grid-cols-2">
            {research.map((slide) => <SlideCard key={slide.slug || slide.id} slide={slide} />)}
          </div>
        </>
      )}
      <h2 className="mb-3 font-['Bebas_Neue',sans-serif] text-3xl text-white">Published blogs</h2>
      {blogs.length === 0 ? (
        <p className="text-sm text-stone-400">No published recaps in The Vault yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {blogs.map((slide) => <SlideCard key={slide.slug || slide.id} slide={slide} />)}
        </div>
      )}
      {children ? <div className="mt-10 border-t border-white/10 pt-6">{children}</div> : null}
    </div>
  );
}
