import { Link } from "react-router-dom";
import { CalendarDays } from "lucide-react";

function withinDays(value, days) {
  const raw = Number(value) || Date.parse(value) || 0;
  if (!raw) return false;
  const age = Date.now() - raw;
  return age >= 0 && age <= days * 24 * 60 * 60 * 1000;
}

export default function WeeklyGrindPanel({
  slides = [],
  tournaments = [],
  prefs,
  onPrefsChange,
  digestControlsEnabled = false,
}) {
  const controlsOn = digestControlsEnabled === true;

  if (controlsOn && prefs?.showWeeklyPanel === false) {
    return (
      <button
        type="button"
        onClick={() => onPrefsChange?.({ showWeeklyPanel: true })}
        className="mt-8 font-mono text-[11px] uppercase tracking-widest text-slate-500"
      >
        Show weekly grind
      </button>
    );
  }

  const freshBlogs = slides
    .filter((slide) => (slide.blog || slide.surface === "blog") && withinDays(slide.createdAt, 14))
    .slice(0, 4);
  const freshVault = slides
    .filter((slide) => !(slide.blog || slide.surface === "blog"))
    .slice(0, 4);
  const openScrims = tournaments
    .filter((t) => !t.archived && t.registrationOpen !== false)
    .filter((t) => !t.startDate || withinDays(Date.parse(t.startDate) || 0, 10) || Date.parse(t.startDate) >= Date.now() - 86400000)
    .slice(0, 4);

  return (
    <section className="mb-6 border-b border-white/5 pb-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-stone-500">
          <CalendarDays size={11} /> Weekly grind
        </p>
        {controlsOn && (
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest text-stone-600">
              <input
                type="checkbox"
                checked={prefs?.digestOptIn === true}
                onChange={(event) => onPrefsChange?.({ digestOptIn: event.target.checked })}
              />
              Digest opt-in
            </label>
            <button
              type="button"
              onClick={() => onPrefsChange?.({ showWeeklyPanel: false })}
              className="font-mono text-[9px] uppercase tracking-widest text-stone-600 hover:text-stone-400"
            >
              Hide
            </button>
          </div>
        )}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <DigestColumn title="Vault windows" empty="No vault highlights yet.">
          {freshVault.map((slide) => (
            <Link key={slide.slug} to={`/vault/${slide.slug}`} className="block text-sm text-white no-underline hover:text-neon">
              {slide.title}
              <span className="block text-xs text-slate-500">{slide.game}</span>
            </Link>
          ))}
        </DigestColumn>
        <DigestColumn title="Recaps" empty="No new blogs this fortnight.">
          {freshBlogs.map((slide) => (
            <Link key={slide.slug} to={`/vault/${slide.slug}`} className="block text-sm text-white no-underline hover:text-neon">
              {slide.title}
              <span className="block text-xs text-slate-500">{slide.game}</span>
            </Link>
          ))}
        </DigestColumn>
        <DigestColumn title="Open scrims" empty="No open scrims right now.">
          {openScrims.map((t) => (
            <Link key={t.id} to={`/tournaments/${t.id}`} className="block text-sm text-white no-underline hover:text-neon">
              {t.name}
              <span className="block text-xs text-slate-500">{[t.game, t.region, t.rankBand].filter(Boolean).join(" · ")}</span>
            </Link>
          ))}
        </DigestColumn>
      </div>
    </section>
  );
}

function DigestColumn({ title, empty, children }) {
  const items = Array.isArray(children) ? children.filter(Boolean) : [children].filter(Boolean);
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">{title}</p>
      <div className="mt-2 space-y-2">
        {items.length ? items : <p className="text-sm text-slate-500">{empty}</p>}
      </div>
    </div>
  );
}
