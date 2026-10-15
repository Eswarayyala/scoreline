import { useEffect, useState } from "react";
import { CMS_GAMES } from "../../data/posterPresets";
import { emptyCircuitEvent } from "../../hooks/useCircuitCms";
import EventStatusFields from "./EventStatusFields";
import PosterPicker from "./PosterPicker";

const inputClass = "w-full rounded-lg border border-white/15 bg-slate-950/80 px-3 py-2 text-sm text-white outline-none focus:border-neon";

export default function CircuitEventForm({ surface, initial, canWrite, onSave, onCancel }) {
  const [form, setForm] = useState(() => ({ ...emptyCircuitEvent(surface), ...initial, surface }));
  const [error, setError] = useState("");

  useEffect(() => {
    setForm({ ...emptyCircuitEvent(surface), ...initial, surface });
  }, [initial, surface]);

  const patch = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const submit = (event) => {
    event.preventDefault();
    setError("");
    if (!canWrite) {
      setError("Owner or support write access is required.");
      return;
    }
    if (form.eventStatus === "upcoming") {
      if (!form.seasonTitle?.trim() || !form.registrationUrl?.trim() || !form.startAt || !form.endAt) {
        setError("Upcoming events need a season title, registration link, and both event times.");
        return;
      }
    }
    try {
      onSave(form);
    } catch (issue) {
      setError(issue.message || "Could not save this event.");
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-4 rounded-2xl border border-neon/20 bg-slate-950/80 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-neon">
          {form.id ? "Edit" : "Create"} · {surface === "vault" ? "Vault slide" : "Tournament"}
        </p>
        <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Write roles: owner · support</p>
      </div>
      <label className="grid gap-1 text-xs text-slate-400">
        Event status
        <select className={inputClass} value={form.eventStatus} onChange={(e) => patch("eventStatus", e.target.value)}>
          <option value="completed">Completed</option>
          <option value="live">Live</option>
          <option value="upcoming">Upcoming</option>
        </select>
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-xs text-slate-400">
          Title
          <input required className={inputClass} value={form.title} onChange={(e) => patch("title", e.target.value)} />
        </label>
        <label className="grid gap-1 text-xs text-slate-400">
          Game
          <select className={inputClass} value={form.game} onChange={(e) => patch("game", e.target.value)}>
            {CMS_GAMES.map((game) => <option key={game} value={game}>{game}</option>)}
          </select>
        </label>
      </div>
      <label className="grid gap-1 text-xs text-slate-400">
        Short kicker
        <input className={inputClass} value={form.kicker || ""} onChange={(e) => patch("kicker", e.target.value)} />
      </label>
      <label className="grid gap-1 text-xs text-slate-400">
        Summary
        <textarea rows={3} className={inputClass} value={form.summary || ""} onChange={(e) => patch("summary", e.target.value)} />
      </label>
      <PosterPicker game={form.game} value={form.poster} onChange={(patchIn) => setForm((current) => ({ ...current, ...patchIn }))} />
      <EventStatusFields form={form} setForm={setForm} />
      {error && <p className="text-sm text-rose-400">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={!canWrite} className="rounded-full bg-neon px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-40">
          Save to desk
        </button>
        <button type="button" onClick={onCancel} className="rounded-full border border-white/15 px-4 py-2 text-sm text-slate-200">
          Cancel
        </button>
      </div>
    </form>
  );
}
