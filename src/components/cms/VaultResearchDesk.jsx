import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { canWriteCircuitContent } from "../../lib/staffAccess";
import { FILTER_GAMES } from "../../data/gameCatalog";
import { emptyCircuitEvent } from "../../hooks/useCircuitCms";

const inputClass = "w-full rounded-lg border border-white/15 bg-slate-950/80 px-3 py-2 text-sm text-white outline-none focus:border-neon";

function parseJsonField(raw, fallback) {
  try {
    const parsed = JSON.parse(raw);
    return parsed;
  } catch {
    return fallback;
  }
}

function ResearchForm({ initial, canWrite, games, onSave, onCancel }) {
  const [form, setForm] = useState(() => ({ ...emptyCircuitEvent("research"), ...initial, surface: "research", research: true }));
  const [editionsText, setEditionsText] = useState(() => JSON.stringify(initial.editions || [], null, 2));
  const [error, setError] = useState("");

  const patch = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const submit = (event) => {
    event.preventDefault();
    setError("");
    const editions = parseJsonField(editionsText, null);
    if (!Array.isArray(editions)) {
      setError("Editions must be valid JSON array.");
      return;
    }
    try {
      onSave({
        ...form,
        surface: "research",
        research: true,
        editions,
        yearlyStats: (form.yearlyStats || []).filter((row) => row.year),
        relatedTournaments: (form.relatedTournaments || []).filter((row) => row.name),
      });
    } catch (issue) {
      setError(issue.message || "Could not save this game vault.");
    }
  };

  const rows = form.yearlyStats?.length ? form.yearlyStats : [{ year: "", tournamentCount: 1, circuit: "", region: "Global" }];
  const related = form.relatedTournaments?.length ? form.relatedTournaments : [{ year: "", name: "", region: "", result: "" }];

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-2xl border border-neon/20 bg-slate-950/80 p-5">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-neon">{form.id ? "Edit game vault" : "New game vault"}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-xs text-slate-400">Title<input required className={inputClass} value={form.title || ""} onChange={(e) => patch("title", e.target.value)} /></label>
        <label className="grid gap-1 text-xs text-slate-400">
          Game
          <input list="vault-games" className={inputClass} value={form.game || ""} onChange={(e) => patch("game", e.target.value)} />
          <datalist id="vault-games">{games.map((game) => <option key={game} value={game} />)}</datalist>
        </label>
        <label className="grid gap-1 text-xs text-slate-400">Region<input className={inputClass} value={form.region || ""} onChange={(e) => patch("region", e.target.value)} /></label>
        <label className="grid gap-1 text-xs text-slate-400">Peak prize pool<input className={inputClass} value={form.peakPrizePool || ""} onChange={(e) => patch("peakPrizePool", e.target.value)} /></label>
        <label className="grid gap-1 text-xs text-slate-400">Genre<input className={inputClass} value={form.genre || ""} onChange={(e) => patch("genre", e.target.value)} /></label>
        <label className="grid gap-1 text-xs text-slate-400">Platform / type<input className={inputClass} value={form.type || ""} onChange={(e) => patch("type", e.target.value)} /></label>
      </div>
      <label className="grid gap-1 text-xs text-slate-400">Overview<textarea rows={3} className={inputClass} value={form.summary || ""} onChange={(e) => patch("summary", e.target.value)} /></label>
      <div>
        <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-slate-500">Tournaments held by year</p>
        {rows.map((row, index) => (
          <div key={index} className="mb-2 grid gap-2 sm:grid-cols-4">
            <input placeholder="Year" className={inputClass} value={row.year} onChange={(e) => patch("yearlyStats", rows.map((item, i) => i === index ? { ...item, year: e.target.value } : item))} />
            <input placeholder="Count" className={inputClass} value={row.tournamentCount} onChange={(e) => patch("yearlyStats", rows.map((item, i) => i === index ? { ...item, tournamentCount: e.target.value } : item))} />
            <input placeholder="Circuit" className={inputClass} value={row.circuit || ""} onChange={(e) => patch("yearlyStats", rows.map((item, i) => i === index ? { ...item, circuit: e.target.value } : item))} />
            <input placeholder="Region" className={inputClass} value={row.region || ""} onChange={(e) => patch("yearlyStats", rows.map((item, i) => i === index ? { ...item, region: e.target.value } : item))} />
          </div>
        ))}
        <button type="button" className="text-xs text-neon" onClick={() => patch("yearlyStats", [...rows, { year: "", tournamentCount: 1, circuit: "", region: "Global" }])}>+ Year</button>
      </div>
      <div>
        <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-slate-500">Related past tournaments</p>
        {related.map((row, index) => (
          <div key={index} className="mb-2 grid gap-2 sm:grid-cols-4">
            <input placeholder="Year" className={inputClass} value={row.year || ""} onChange={(e) => patch("relatedTournaments", related.map((item, i) => i === index ? { ...item, year: e.target.value } : item))} />
            <input placeholder="Event" className={inputClass} value={row.name || ""} onChange={(e) => patch("relatedTournaments", related.map((item, i) => i === index ? { ...item, name: e.target.value } : item))} />
            <input placeholder="Region" className={inputClass} value={row.region || ""} onChange={(e) => patch("relatedTournaments", related.map((item, i) => i === index ? { ...item, region: e.target.value } : item))} />
            <input placeholder="Result" className={inputClass} value={row.result || ""} onChange={(e) => patch("relatedTournaments", related.map((item, i) => i === index ? { ...item, result: e.target.value } : item))} />
          </div>
        ))}
        <button type="button" className="text-xs text-neon" onClick={() => patch("relatedTournaments", [...related, { year: "", name: "", region: "", result: "" }])}>+ Related event</button>
      </div>
      <label className="grid gap-1 text-xs text-slate-400">
        Editions JSON (newest first)
        <textarea rows={12} className={`${inputClass} font-mono text-xs`} value={editionsText} onChange={(e) => setEditionsText(e.target.value)} />
      </label>
      {error && <p className="text-sm text-rose-400">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={!canWrite} className="rounded-full bg-neon px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-40">Save game vault</button>
        <button type="button" onClick={onCancel} className="rounded-full border border-white/15 px-4 py-2 text-sm text-slate-200">Cancel</button>
      </div>
    </form>
  );
}

function CatalogDesk({ records, role, games, onSave, onDelete }) {
  const canWrite = canWriteCircuitContent(role);
  const [name, setName] = useState("");
  const extras = records.filter((item) => item.surface === "catalog");
  return (
    <section className="space-y-3 rounded-2xl border border-white/10 p-4">
      <h3 className="font-display text-2xl text-white">Filter catalog</h3>
      <p className="text-sm text-slate-400">These names power Find players, create-tournament, and CMS dropdowns. Vault research games are already included.</p>
      <p className="text-xs text-slate-500">{games.join(" · ")}</p>
      {canWrite && (
        <div className="flex gap-2">
          <input className={inputClass} placeholder="Add a game to filters" value={name} onChange={(e) => setName(e.target.value)} />
          <button
            type="button"
            className="shrink-0 rounded-full bg-neon px-3 text-sm font-semibold text-slate-950"
            onClick={() => {
              const game = name.trim();
              if (!game) return;
              onSave({ surface: "catalog", title: game, game, inFilters: true, kicker: "Filter list" });
              setName("");
            }}
          >
            Add
          </button>
        </div>
      )}
      {extras.map((item) => (
        <div key={item.id} className="flex items-center justify-between text-sm text-slate-300">
          <span>{item.game}</span>
          {canWrite && <button type="button" className="text-rose-400" onClick={() => onDelete(item.id)}>Remove</button>}
        </div>
      ))}
    </section>
  );
}

export default function VaultResearchDesk({ records, role, onSave, onDelete, filterGames = FILTER_GAMES }) {
  const canWrite = canWriteCircuitContent(role);
  const [editing, setEditing] = useState(null);
  const items = useMemo(() => records.filter((item) => item.surface === "research" || item.research), [records]);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-neon">Shared research desk</p>
          <h2 className="font-display text-3xl text-white">Game vaults</h2>
          <p className="mt-1 text-sm text-slate-400">Edits here feed the EWC directory, each game vault page, and the filter catalog.</p>
        </div>
        {canWrite && (
          <button type="button" onClick={() => setEditing({ surface: "research", research: true })} className="inline-flex items-center gap-1 rounded-full bg-neon px-4 py-2 text-sm font-semibold text-slate-950">
            <Plus size={14} /> New game vault
          </button>
        )}
      </div>
      <CatalogDesk records={records} role={role} games={filterGames} onSave={onSave} onDelete={onDelete} />
      {editing && (
        <ResearchForm
          initial={editing}
          canWrite={canWrite}
          games={filterGames}
          onSave={(draft) => { onSave(draft); setEditing(null); }}
          onCancel={() => setEditing(null)}
        />
      )}
      <div className="grid gap-3">
        {items.map((item) => (
          <article key={item.id} className="flex items-start justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">{item.game} · {item.region || "Global"} · {(item.editions || []).length} EWC editions</p>
              <h3 className="font-display text-2xl text-white">{item.title}</h3>
            </div>
            {canWrite && (
              <div className="flex gap-3">
                <button type="button" onClick={() => setEditing(item)} className="inline-flex items-center gap-1 text-xs text-neon"><Pencil size={12} /> Edit</button>
                <button type="button" onClick={() => onDelete(item.id)} className="inline-flex items-center gap-1 text-xs text-rose-400"><Trash2 size={12} /> Remove</button>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
