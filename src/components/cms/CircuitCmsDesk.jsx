import { useMemo, useState } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { canProposeCmsDelete, canWriteCircuitContent, isSiteSupportRole, supportWritesDirect } from "../../lib/staffAccess";
import { FILTER_GAMES } from "../../data/gameCatalog";
import { recordRecency, sortByRecency } from "../../lib/deskSort";
import { emptyCircuitEvent } from "../../hooks/useCircuitCms";
import CircuitEventForm from "./CircuitEventForm";
import DeskBin from "./DeskBin";
import DeskSortSelect from "./DeskSortSelect";

const inputClass = "w-full rounded-lg border border-white/15 bg-slate-950/80 px-3 py-2 text-sm text-white outline-none focus:border-neon";

export default function CircuitCmsDesk({
  surface,
  records,
  deletedRecords = [],
  role,
  permissions = null,
  onSave,
  onDelete,
  onRestore,
  onPurge,
  games = FILTER_GAMES,
}) {
  const canWrite = canWriteCircuitContent(role);
  const canRemove = canProposeCmsDelete(role, permissions);
  const [editing, setEditing] = useState(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");
  const items = useMemo(() => records.filter((item) => item.surface === surface), [records, surface]);
  const binned = useMemo(() => deletedRecords.filter((item) => item.surface === surface), [deletedRecords, surface]);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = !q
      ? items
      : items.filter((item) => [item.title, item.game, item.summary, item.eventStatus, item.seasonTitle]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q));
    return sortByRecency(filtered, sort, (item) => recordRecency(item) || (Number(item.floatingPriority) || 0));
  }, [items, query, sort]);

  if (editing) {
    return (
      <section className="space-y-4">
        <button
          type="button"
          onClick={() => setEditing(null)}
          className="font-mono text-xs uppercase tracking-widest text-neon"
        >
          ← {surface === "vault" ? "Windows" : "Scrims"}
        </button>
        <h2 className="font-display text-3xl text-white">
          {editing.id ? "Edit" : "New"} {surface === "vault" ? "window" : "event"}
        </h2>
        <CircuitEventForm
          surface={surface}
          initial={editing}
          canWrite={canWrite}
          games={games}
          onSave={(draft) => { onSave({ ...draft, surface }); setEditing(null); }}
          onCancel={() => setEditing(null)}
        />
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-neon">Circuit CMS · {role || "staff"}</p>
          <h2 className="font-display text-3xl text-white">{surface === "vault" ? "Floating windows" : "Scrims"}</h2>
          <p className="mt-1 text-sm text-slate-400">{surface === "vault" ? "Priority controls which windows lead The Vault carousel. Higher numbers show first." : "Status dropdown swaps completed, live, and upcoming fields."} Edit opens one event here; the rest stay hidden until you save or cancel.</p>
        </div>
        {canWrite && (
          <button type="button" onClick={() => setEditing(emptyCircuitEvent(surface))} className="inline-flex items-center gap-1 rounded-full bg-neon px-4 py-2 text-sm font-semibold text-slate-950">
            <Plus size={14} /> New {surface === "vault" ? "window" : "event"}
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <label className="relative block min-w-0 flex-1 sm:max-w-md">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            className={`${inputClass} pl-9`}
            placeholder={surface === "vault" ? "Search windows…" : "Search scrims…"}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label={surface === "vault" ? "Search windows" : "Search scrims"}
          />
        </label>
        <DeskSortSelect value={sort} onChange={setSort} />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {visible.map((item) => (
          <article key={item.id} className="flex min-h-[6.5rem] overflow-hidden rounded-xl border border-white/10 bg-slate-950/60">
            {item.poster && <img src={item.poster} alt="" className="h-full w-12 shrink-0 object-cover sm:w-14" />}
            <div className="flex min-w-0 flex-1 flex-col justify-between gap-2 p-2.5 sm:p-3">
              <div className="min-w-0">
                <p className="truncate font-mono text-[8px] uppercase tracking-widest text-slate-500 sm:text-[9px]">{item.eventStatus} · {item.game}{surface === "vault" ? ` · p${item.floatingPriority || 0}` : ""}</p>
                <h3 className="mt-0.5 line-clamp-2 font-display text-base leading-tight text-white sm:text-lg">{item.title}</h3>
                <p className="mt-0.5 line-clamp-2 text-[10px] text-slate-400 sm:text-[11px]">{item.summary || item.seasonTitle || item.activeStage || item.winners}</p>
              </div>
              {canWrite && (
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setEditing(item)} className="inline-flex items-center gap-1 text-[11px] text-neon"><Pencil size={11} /> Edit</button>
                  {canRemove && (
                    <button type="button" onClick={() => onDelete(item.id)} className="inline-flex items-center gap-1 text-[11px] text-rose-400">
                      <Trash2 size={11} /> {isSiteSupportRole(role) && !supportWritesDirect(role, permissions, "vaultDelete") ? "Request remove" : "Move to bin"}
                    </button>
                  )}
                </div>
              )}
            </div>
          </article>
        ))}
        {visible.length === 0 && <p className="col-span-full text-sm text-slate-400">No managed {surface === "vault" ? "slides" : "tournaments"} match.</p>}
      </div>

      <DeskBin
        items={binned}
        title={surface === "vault" ? "Windows bin" : "Scrims bin"}
        canManage={canWrite && !!onRestore && !!onPurge}
        onRestore={(item) => onRestore(item.id)}
        onPurge={(item) => onPurge(item.id)}
      />
    </section>
  );
}
