import { Radio, Calendar } from "lucide-react";
import { bannerForGame, SHOWCASE_TOURNAMENTS } from "../../data/platformShowcase";
import { fmtDateSafe } from "../layout/platformUtils";

export default function TournamentsShowcase({ tournaments = [], onOpenTournament, onBrowseAll }) {
  const live = tournaments
    .filter((item) => item.status !== "completed" && item.archived !== true)
    .slice(0, 4)
    .map((item) => ({
      id: item.id,
      name: item.name,
      game: item.game,
      status: item.registrationOpen === false ? "bracket" : "live",
      window: `${fmtDateSafe(item.startDate)} – ${fmtDateSafe(item.endDate)}`,
      flyer: bannerForGame(item.game),
      liveId: item.id,
    }));
  const cards = (live.length ? live : SHOWCASE_TOURNAMENTS).slice(0, 4);

  return (
    <section className="rounded-3xl border border-white/10 bg-slate-950/60 p-5 backdrop-blur-md">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-flare">Scrims</p>
          <h2 className="font-display text-3xl text-white">Live / upcoming scrims</h2>
        </div>
        <button type="button" onClick={onBrowseAll} className="font-mono text-[11px] uppercase tracking-widest text-neon">Open desk</button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((card) => (
          <button
            key={card.id}
            type="button"
            onClick={() => (card.liveId ? onOpenTournament(card.liveId) : onBrowseAll())}
            className="group overflow-hidden rounded-2xl border border-white/10 text-left transition hover:border-neon/50"
          >
            <div className="relative h-32">
              <img src={card.flyer} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent" />
              <span className={`absolute left-3 top-3 inline-flex items-center gap-1 rounded-full px-2 py-1 font-mono text-[10px] uppercase ${card.status === "live" ? "bg-neon/20 text-neon" : "bg-white/10 text-white"}`}>
                {card.status === "live" ? <Radio size={10} /> : <Calendar size={10} />} {card.status}
              </span>
            </div>
            <div className="space-y-1 p-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-slate-400">{card.game}</p>
              <h3 className="font-display text-2xl text-white">{card.name}</h3>
              <p className="text-xs text-slate-400">{card.window}</p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
