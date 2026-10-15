import { useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ExternalLink, Trophy } from "lucide-react";
import { VAULT_SLIDES } from "../../data/platformShowcase";

export default function VaultDetailPage({ liveEntries = [], slug }) {
  const slide = VAULT_SLIDES.find((item) => item.slug === slug);
  const related = useMemo(
    () => liveEntries.filter((entry) => String(entry.game || "").toLowerCase() === String(slide?.game || "").toLowerCase()).slice(0, 6),
    [liveEntries, slide],
  );

  if (!slide) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16 text-center">
        <h1 className="font-display text-5xl text-white">Slide not in The Vault</h1>
        <p className="mt-3 text-slate-400">That highlight window does not exist yet.</p>
        <Link to="/" className="mt-6 inline-flex items-center gap-2 text-neon"> <ArrowLeft size={16} /> The Vault</Link>
      </div>
    );
  }

  return (
    <article className="mx-auto max-w-5xl px-5 pb-20 pt-6">
      <Link to="/" className="mb-5 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-neon">
        <ArrowLeft size={14} /> The Vault
      </Link>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
        <div className="relative h-[280px] md:h-[380px]">
          <img src={slide.poster} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-neon">{slide.kicker} · {slide.game}</p>
            <h1 className="font-display text-5xl text-white md:text-7xl">{slide.title}</h1>
            <p className="mt-1 text-slate-300">{slide.season}</p>
          </div>
        </div>
        <div className="grid gap-8 p-6 md:grid-cols-[1.4fr_0.8fr] md:p-8">
          <div>
            <p className="text-base leading-7 text-slate-200">{slide.summary}</p>
            <p className="mt-4 text-sm text-slate-400">This window is the public face of The Vault. Live results you publish from staff tools appear beside it when the game matches.</p>
          </div>
          <aside className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-volt">
              <Trophy size={14} /> Live Vault records
            </p>
            {related.length === 0 ? (
              <p className="text-sm text-slate-400">No published results for {slide.game} yet. Paste them from the staff desk when you are ready.</p>
            ) : related.map((entry) => (
              <div key={entry.id} className="border-t border-white/10 py-3 first:border-t-0 first:pt-0">
                <div className="font-display text-xl text-white">{entry.tournament}</div>
                <div className="text-sm text-slate-400">{entry.eventDate} · Winner {entry.winner}</div>
                {entry.source && <a href={entry.source} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-neon"><ExternalLink size={12} /> Source</a>}
              </div>
            ))}
          </aside>
        </div>
      </motion.div>
    </article>
  );
}
