import { useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import { canWriteCircuitContent } from "../../lib/staffAccess";
import { FLOATING_FEATURES, FLOATING_POLICY_ID, floatingPolicyFromRecords } from "../../data/floatingWindows";

const inputClass = "w-full rounded-lg border border-white/15 bg-slate-950/80 px-3 py-2 text-sm text-white outline-none focus:border-neon";

export default function FloatingWindowsDesk({ records = [], ewcWindows = [], blogSlides = [], role, onSave }) {
  const canWrite = canWriteCircuitContent(role);
  const policy = floatingPolicyFromRecords(records);
  const [editing, setEditing] = useState(null);
  const windows = useMemo(() => {
    const listed = [];
    ewcWindows.forEach((slide) => listed.push({ ...slide, feature: "ewc", sourceLabel: "EWC year" }));
    records.filter((item) => (item.research || item.surface === "research") && item.surface !== "floating-policy").forEach((item) => {
      listed.push({ ...item, feature: "research", sourceLabel: "Game vault", floating: item.floating === true });
    });
    records.filter((item) => item.surface === "vault").forEach((item) => listed.push({ ...item, feature: "vault", sourceLabel: "Custom card" }));
    blogSlides.forEach((blog) => {
      const overlay = records.find((item) => item.surface === "blog-window" && (item.blogId === blog.id || item.slug === blog.slug));
      listed.push({ ...blog, ...overlay, feature: "blog", sourceLabel: "Blog", floating: blog.floating || overlay?.floating === true });
    });
    records.filter((item) => item.surface === "tournament").forEach((item) => listed.push({ ...item, feature: "tournament", sourceLabel: "Tournament", floating: item.floating === true }));
    return listed;
  }, [records, ewcWindows, blogSlides]);

  const savePolicy = (features) => {
    onSave({
      id: FLOATING_POLICY_ID,
      surface: "floating-policy",
      title: "Floating window sources",
      features,
      kicker: "Home carousel",
    });
  };

  const saveWindow = (draft) => {
    const feature = draft.feature;
    if (feature === "ewc") {
      onSave({
        id: draft.slug || draft.id,
        slug: draft.slug,
        surface: "ewc-window",
        championshipKey: draft.championship?.key || draft.championshipKey,
        title: draft.title,
        summary: draft.summary,
        poster: draft.poster,
        game: draft.game || "Esports World Cup",
        kicker: draft.kicker || "EWC",
        season: draft.season,
        floating: draft.floating !== false,
        floatingPriority: Number(draft.floatingPriority) || 0,
        eventScope: "ewc",
      });
    } else if (feature === "blog") {
      onSave({
        id: `blog-window-${draft.id || draft.blogId}`,
        surface: "blog-window",
        blogId: draft.id || draft.blogId,
        slug: draft.slug,
        title: draft.title,
        summary: draft.summary,
        poster: draft.poster,
        game: draft.game,
        floating: draft.floating !== false,
        floatingPriority: Number(draft.floatingPriority) || 0,
      });
    } else {
      const original = records.find((item) => item.id === draft.id) || draft;
      onSave({
        ...original,
        title: draft.title,
        summary: draft.summary,
        poster: draft.poster,
        floating: draft.floating !== false,
        floatingPriority: Number(draft.floatingPriority) || 0,
      });
    }
    setEditing(null);
  };

  return (
    <section className="space-y-4">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-neon">Home and Vault carousel</p>
        <h2 className="font-display text-3xl text-white">Floating windows</h2>
        <p className="mt-1 text-sm text-slate-400">
          Choose which catalogs can float, then edit each window. {role === "support" ? "Support edits wait for owner approval." : "Owner saves go live immediately."}
        </p>
      </div>
      <div className="grid gap-2 rounded-2xl border border-white/10 p-4">
        <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Sources allowed to float</p>
        {FLOATING_FEATURES.map((feature) => (
          <label key={feature.id} className="flex items-center gap-2 text-sm text-slate-200">
            <input
              type="checkbox"
              disabled={!canWrite}
              checked={policy[feature.id] === true}
              onChange={(event) => savePolicy({ ...policy, [feature.id]: event.target.checked })}
            />
            {feature.label}
          </label>
        ))}
      </div>
      {editing && (
        <form
          className="grid gap-3 rounded-2xl border border-neon/20 p-4"
          onSubmit={(event) => {
            event.preventDefault();
            saveWindow(editing);
          }}
        >
          <p className="font-mono text-[10px] uppercase tracking-widest text-volt">{editing.sourceLabel} · {editing.slug || editing.id}</p>
          <label className="grid gap-1 text-xs text-slate-400">Title<input className={inputClass} value={editing.title || ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></label>
          <label className="grid gap-1 text-xs text-slate-400">Summary<textarea rows={3} className={inputClass} value={editing.summary || ""} onChange={(e) => setEditing({ ...editing, summary: e.target.value })} /></label>
          <label className="grid gap-1 text-xs text-slate-400">Poster URL<input className={inputClass} value={editing.poster || ""} onChange={(e) => setEditing({ ...editing, poster: e.target.value })} /></label>
          <label className="grid gap-1 text-xs text-slate-400">Priority<input type="number" min="0" max="99" className={inputClass} value={editing.floatingPriority ?? 5} onChange={(e) => setEditing({ ...editing, floatingPriority: Number(e.target.value) })} /></label>
          <label className="flex items-center gap-2 text-sm text-slate-200">
            <input type="checkbox" checked={editing.floating !== false} onChange={(e) => setEditing({ ...editing, floating: e.target.checked })} />
            Show as a floating window
          </label>
          <div className="flex gap-2">
            <button type="submit" disabled={!canWrite} className="rounded-full bg-neon px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-40">Save window</button>
            <button type="button" className="rounded-full border border-white/15 px-4 py-2 text-sm text-slate-200" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </form>
      )}
      <div className="grid gap-3">
        {windows.map((item) => (
          <article key={`${item.feature}-${item.slug || item.id}`} className="flex items-start justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
                {item.sourceLabel} · {item.floating ? `priority ${item.floatingPriority || 0}` : "not floating"}
                {policy[item.feature] ? "" : " · source off"}
              </p>
              <h3 className="font-display text-2xl text-white">{item.title}</h3>
              <p className="line-clamp-2 text-xs text-slate-400">{item.summary}</p>
            </div>
            {canWrite && (
              <button type="button" className="inline-flex items-center gap-1 text-xs text-neon" onClick={() => setEditing(item)}>
                <Pencil size={12} /> Edit
              </button>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
