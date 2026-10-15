import { Link } from "react-router-dom";
import { VAULT_SLIDES, flyerForEvent } from "../../data/platformShowcase";

export default function VaultLibraryPage({ slides = VAULT_SLIDES, children }) {
  const items = slides.length ? slides : VAULT_SLIDES;
  return (
    <div className="pb-10 pt-6">
      <p className="m-0 font-mono text-[11px] uppercase tracking-[0.18em] text-amber-400">Circuit archive</p>
      <h1 className="mt-1 font-['Bebas_Neue',sans-serif] text-5xl tracking-wide text-white">The Vault</h1>
      <p className="mb-6 mt-2 max-w-2xl text-sm text-stone-400">Every floating event window, plus the historical record of completed majors and underdog results.</p>
      <h2 className="mb-3 font-['Bebas_Neue',sans-serif] text-3xl text-white">Floating events</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((slide) => (
          <Link key={slide.slug} to={`/vault/${slide.slug}`} className="overflow-hidden border border-white/10 bg-black/20 no-underline text-inherit hover:border-amber-400/50">
            <div className="aspect-video overflow-hidden">
              <img src={flyerForEvent(slide)} alt="" className="h-full w-full object-cover" />
            </div>
            <div className="p-3">
              <p className="m-0 font-mono text-[10px] uppercase tracking-widest text-cyan-300">{slide.kicker} · {slide.game}</p>
              <h3 className="mt-1 font-['Bebas_Neue',sans-serif] text-2xl text-white">{slide.title}</h3>
            </div>
          </Link>
        ))}
      </div>
      <div className="mt-10 border-t border-white/10 pt-6">
        {children}
      </div>
    </div>
  );
}
