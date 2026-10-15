import { UserPlus } from "lucide-react";
import { SHOWCASE_PLAYERS } from "../../data/platformShowcase";

export default function FindPlayersShowcase({ onConnect, onBrowseAll }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-slate-950/60 p-5 backdrop-blur-md">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-volt">Find players</p>
          <h2 className="font-display text-3xl text-white">Matchmaking grid</h2>
        </div>
        <button type="button" onClick={onBrowseAll} className="font-mono text-[11px] uppercase tracking-widest text-neon">Full search</button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {SHOWCASE_PLAYERS.map((player) => (
          <article key={player.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center gap-3">
              <img src={player.avatar} alt="" className="h-12 w-12 rounded-full object-cover ring-2 ring-neon/40" />
              <div className="min-w-0">
                <h3 className="truncate font-display text-xl text-white">{player.displayName}</h3>
                <p className="truncate font-mono text-[10px] uppercase tracking-widest text-slate-400">{player.game} · {player.role}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <span className="rounded-full border border-volt/40 bg-volt/10 px-2 py-0.5 font-mono text-[10px] uppercase text-volt">{player.rank}</span>
              <button
                type="button"
                onClick={() => onConnect(player)}
                className="inline-flex items-center gap-1 rounded-full bg-neon px-3 py-1 text-xs font-semibold text-slate-950"
              >
                <UserPlus size={12} /> Connect
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
