import { Plus, Trash2 } from "lucide-react";
import { EVENT_STAGES } from "../../data/posterPresets";

const inputClass = "w-full rounded-lg border border-white/15 bg-slate-950/80 px-3 py-2 text-sm text-white outline-none focus:border-neon";

function Field({ label, children }) {
  return (
    <label className="grid gap-1 text-xs text-slate-400">
      {label}
      {children}
    </label>
  );
}

export default function EventStatusFields({ form, setForm }) {
  const status = form.eventStatus;
  const patch = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  if (status === "completed") {
    const highlights = form.extraHighlights?.length ? form.extraHighlights : [{ game: "", milestone: "" }];
    return (
      <div className="grid gap-3">
        <p className="font-mono text-[10px] uppercase tracking-widest text-volt">Completed event desk</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Winners"><input className={inputClass} value={form.winners || ""} onChange={(e) => patch("winners", e.target.value)} /></Field>
          <Field label="Runner-ups"><input className={inputClass} value={form.runnerUps || ""} onChange={(e) => patch("runnerUps", e.target.value)} /></Field>
          <Field label="Second runner-ups"><input className={inputClass} value={form.secondRunnerUps || ""} onChange={(e) => patch("secondRunnerUps", e.target.value)} /></Field>
          <Field label="Fan favourite"><input className={inputClass} value={form.fanFavourite || ""} onChange={(e) => patch("fanFavourite", e.target.value)} /></Field>
          <Field label="Best IGL"><input className={inputClass} value={form.bestIgl || ""} onChange={(e) => patch("bestIgl", e.target.value)} /></Field>
          <Field label="MVP"><input className={inputClass} value={form.mvp || ""} onChange={(e) => patch("mvp", e.target.value)} /></Field>
          <Field label="Best clutches"><input className={inputClass} value={form.bestClutches || ""} onChange={(e) => patch("bestClutches", e.target.value)} /></Field>
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-widest text-slate-400">Extra game highlights</p>
            <button type="button" onClick={() => patch("extraHighlights", [...highlights, { game: form.game || "", milestone: "" }])} className="inline-flex items-center gap-1 text-xs text-neon">
              <Plus size={12} /> Add milestone
            </button>
          </div>
          <div className="grid gap-2">
            {highlights.map((row, index) => (
              <div key={index} className="grid grid-cols-[1fr_1.4fr_auto] gap-2">
                <input className={inputClass} placeholder="Game" value={row.game} onChange={(e) => patch("extraHighlights", highlights.map((item, i) => i === index ? { ...item, game: e.target.value } : item))} />
                <input className={inputClass} placeholder="Milestone" value={row.milestone} onChange={(e) => patch("extraHighlights", highlights.map((item, i) => i === index ? { ...item, milestone: e.target.value } : item))} />
                <button type="button" aria-label="Remove highlight" onClick={() => patch("extraHighlights", highlights.filter((_, i) => i !== index))} className="grid place-items-center text-slate-400 hover:text-rose-400">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (status === "live") {
    const table = form.pointsTable?.length ? form.pointsTable : [{ group: "A", team: "", points: "", wins: "" }];
    return (
      <div className="grid gap-3">
        <p className="font-mono text-[10px] uppercase tracking-widest text-neon">Live event desk</p>
        <Field label="Active stage">
          <select className={inputClass} value={form.activeStage || "Group Stage"} onChange={(e) => patch("activeStage", e.target.value)}>
            {EVENT_STAGES.map((stage) => <option key={stage} value={stage}>{stage}</option>)}
          </select>
        </Field>
        <Field label="Live telecast embedded link">
          <input className={inputClass} placeholder="https://www.youtube.com/embed/… or Twitch player URL" value={form.liveEmbedUrl || ""} onChange={(e) => patch("liveEmbedUrl", e.target.value)} />
        </Field>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-widest text-slate-400">Points table per group</p>
            <button type="button" onClick={() => patch("pointsTable", [...table, { group: "", team: "", points: "", wins: "" }])} className="inline-flex items-center gap-1 text-xs text-neon">
              <Plus size={12} /> Add row
            </button>
          </div>
          <div className="grid gap-2">
            {table.map((row, index) => (
              <div key={index} className="grid grid-cols-[0.7fr_1.2fr_0.6fr_0.6fr_auto] gap-2">
                <input className={inputClass} placeholder="Group" value={row.group} onChange={(e) => patch("pointsTable", table.map((item, i) => i === index ? { ...item, group: e.target.value } : item))} />
                <input className={inputClass} placeholder="Team" value={row.team} onChange={(e) => patch("pointsTable", table.map((item, i) => i === index ? { ...item, team: e.target.value } : item))} />
                <input className={inputClass} placeholder="Pts" value={row.points} onChange={(e) => patch("pointsTable", table.map((item, i) => i === index ? { ...item, points: e.target.value } : item))} />
                <input className={inputClass} placeholder="W" value={row.wins} onChange={(e) => patch("pointsTable", table.map((item, i) => i === index ? { ...item, wins: e.target.value } : item))} />
                <button type="button" aria-label="Remove row" onClick={() => patch("pointsTable", table.filter((_, i) => i !== index))} className="grid place-items-center text-slate-400 hover:text-rose-400">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <p className="font-mono text-[10px] uppercase tracking-widest text-flare">Upcoming event desk · same layout for every game</p>
      <Field label="Season announcement title">
        <input required className={inputClass} value={form.seasonTitle || ""} onChange={(e) => patch("seasonTitle", e.target.value)} />
      </Field>
      <Field label="External registration link">
        <input required className={inputClass} placeholder="https://" value={form.registrationUrl || ""} onChange={(e) => patch("registrationUrl", e.target.value)} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Event start (date & time)">
          <input required type="datetime-local" className={inputClass} value={form.startAt || ""} onChange={(e) => patch("startAt", e.target.value)} />
        </Field>
        <Field label="Event end (date & time)">
          <input required type="datetime-local" className={inputClass} value={form.endAt || ""} onChange={(e) => patch("endAt", e.target.value)} />
        </Field>
      </div>
    </div>
  );
}
