import { RotateCcw, Trash2 } from "lucide-react";

/** Soft-deleted desk items with restore + permanent delete. */
export default function DeskBin({
  items = [],
  title = "Bin",
  emptyLabel = "Bin is empty.",
  canManage = false,
  onRestore,
  onPurge,
  labelFor = (item) => item.title || item.game || item.id,
  metaFor = (item) => item.game || item.surface || "",
}) {
  if (!canManage) return null;
  return (
    <section className="space-y-2 rounded-xl border border-dashed border-rose-400/30 bg-slate-950/40 p-3">
      <p className="font-mono text-[10px] uppercase tracking-widest text-rose-300/90">
        {title} · {items.length}
      </p>
      {!items.length && <p className="text-xs text-slate-500">{emptyLabel}</p>}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <article key={item.id} className="flex items-start justify-between gap-2 rounded-lg border border-white/10 bg-slate-950/70 p-2.5 opacity-90">
            <div className="min-w-0">
              <p className="truncate font-mono text-[9px] uppercase tracking-widest text-slate-500">{metaFor(item)}</p>
              <h3 className="line-clamp-2 font-display text-base text-white">{labelFor(item)}</h3>
              {item.deletedAt ? (
                <p className="mt-0.5 text-[10px] text-slate-500">
                  Removed {new Date(item.deletedAt).toLocaleString()}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-col gap-1">
              <button
                type="button"
                className="inline-flex items-center gap-1 text-[11px] text-neon"
                onClick={() => onRestore?.(item)}
              >
                <RotateCcw size={11} /> Restore
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-[11px] text-rose-400"
                onClick={() => {
                  if (window.confirm("Permanently delete this item? This cannot be undone.")) {
                    onPurge?.(item);
                  }
                }}
              >
                <Trash2 size={11} /> Delete forever
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
