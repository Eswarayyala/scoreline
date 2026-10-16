import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { canWriteCircuitContent } from "../../lib/staffAccess";
import { FILTER_GAMES } from "../../data/gameCatalog";
import { emptyCircuitEvent } from "../../hooks/useCircuitCms";
import CircuitEventForm from "./CircuitEventForm";

export default function CircuitCmsDesk({ surface, records, role, onSave, onDelete, games = FILTER_GAMES }) {
  const canWrite = canWriteCircuitContent(role);
  const [editing, setEditing] = useState(null);
  const items = useMemo(() => records.filter((item) => item.surface === surface), [records, surface]);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-neon">Circuit CMS · {role || "staff"}</p>
          <h2 className="font-display text-3xl text-white">{surface === "vault" ? "Floating windows" : "Tournaments"}</h2>
          <p className="mt-1 text-sm text-slate-400">{surface === "vault" ? "Priority controls which windows lead The Vault carousel. Higher numbers show first." : "Status dropdown swaps completed, live, and upcoming fields."} Support edits wait for owner approval.</p>
        </div>
        {canWrite && (
          <button type="button" onClick={() => setEditing(emptyCircuitEvent(surface))} className="inline-flex items-center gap-1 rounded-full bg-neon px-4 py-2 text-sm font-semibold text-slate-950">
            <Plus size={14} /> New {surface === "vault" ? "window" : "event"}
          </button>
        )}
      </div>

      {editing && (
        <CircuitEventForm
          surface={surface}
          initial={editing}
          canWrite={canWrite}
          games={games}
          onSave={(draft) => { onSave({ ...draft, surface }); setEditing(null); }}
          onCancel={() => setEditing(null)}
        />
      )}

      <div className="grid gap-3">
        {[...items].sort((a, b) => (Number(b.floatingPriority) || 0) - (Number(a.floatingPriority) || 0)).map((item) => (
          <article key={item.id} className="flex gap-3 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/60">
            {item.poster && <img src={item.poster} alt="" className="h-28 w-28 shrink-0 object-cover" />}
            <div className="min-w-0 flex-1 py-3 pr-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">{item.eventStatus} · {item.game}{surface === "vault" ? ` · priority ${item.floatingPriority || 0}` : ""}</p>
              <h3 className="font-display text-2xl text-white">{item.title}</h3>
              <p className="line-clamp-2 text-xs text-slate-400">{item.summary || item.seasonTitle || item.activeStage || item.winners}</p>
            </div>
            {canWrite && (
              <div className="flex flex-col justify-center gap-2 p-3">
                <button type="button" onClick={() => setEditing(item)} className="inline-flex items-center gap-1 text-xs text-neon"><Pencil size={12} /> Edit</button>
                <button type="button" onClick={() => onDelete(item.id)} className="inline-flex items-center gap-1 text-xs text-rose-400"><Trash2 size={12} /> Remove</button>
              </div>
            )}
          </article>
        ))}
        {items.length === 0 && <p className="text-sm text-slate-400">No managed {surface === "vault" ? "slides" : "tournaments"} yet. Create one to preview status layouts.</p>}
      </div>
    </section>
  );
}
