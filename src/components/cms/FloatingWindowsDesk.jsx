import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Pencil, Search } from "lucide-react";
import { canWriteCircuitContent } from "../../lib/staffAccess";
import { FILTER_GAMES, canonicalFilterGame } from "../../data/gameCatalog";
import { FLOATING_FEATURES, FLOATING_POLICY_ID, floatingPolicyFromRecords } from "../../data/floatingWindows";
import { recordRecency, sortByRecency } from "../../lib/deskSort";
import DeskSortSelect from "./DeskSortSelect";

const inputClass = "w-full rounded-lg border border-white/15 bg-slate-950/80 px-3 py-2 text-sm text-white outline-none focus:border-neon";

const TYPE_FILTERS = [
  { id: "all", label: "All" },
  { id: "events", label: "Events" },
  { id: "games", label: "Games" },
];

function isEventFeature(feature) {
  return feature === "ewc" || feature === "blog" || feature === "tournament" || feature === "vault";
}

function isGameFeature(feature) {
  return feature === "research";
}

function matchesQuery(item, query) {
  if (!query) return true;
  const hay = [item.title, item.game, item.summary, item.sourceLabel, item.fullName, item.slug, item.id]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(query);
}

export default function FloatingWindowsDesk({ records = [], ewcWindows = [], blogSlides = [], role, onSave, filterGames = FILTER_GAMES }) {
  const canWrite = canWriteCircuitContent(role);
  const policy = floatingPolicyFromRecords(records);
  const [editing, setEditing] = useState(null);
  const [typeFilter, setTypeFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");

  const windows = useMemo(() => {
    const listed = [];
    ewcWindows.forEach((slide) => listed.push({ ...slide, feature: "ewc", sourceLabel: "EWC year" }));
    records.filter((item) => (item.research || item.surface === "research") && item.surface !== "floating-policy").forEach((item) => {
      listed.push({
        ...item,
        feature: "research",
        sourceLabel: "Game vault",
        floating: item.floating === true,
        displayTitle: item.fullName || item.title || item.game,
      });
    });
    records.filter((item) => item.surface === "vault").forEach((item) => listed.push({ ...item, feature: "vault", sourceLabel: "Custom card" }));
    blogSlides.forEach((blog) => {
      const overlay = records.find((item) => item.surface === "blog-window" && (item.blogId === blog.id || item.slug === blog.slug));
      listed.push({ ...blog, ...overlay, feature: "blog", sourceLabel: "Blog", floating: blog.floating || overlay?.floating === true });
    });
    records.filter((item) => item.surface === "tournament").forEach((item) => listed.push({ ...item, feature: "tournament", sourceLabel: "Tournament", floating: item.floating === true }));

    const present = new Set(
      listed
        .filter((item) => isGameFeature(item.feature))
        .flatMap((item) => [item.game, item.fullName, item.title].filter(Boolean).map((name) => canonicalFilterGame(name).toLowerCase())),
    );
    filterGames
      .filter((game) => game && game !== "Other")
      .forEach((game) => {
        const key = canonicalFilterGame(game).toLowerCase();
        const covered = [...present].some((name) => name === key || name.includes(key) || key.includes(name));
        if (covered) return;
        listed.push({
          id: `missing-game-${key.replace(/[^a-z0-9]+/g, "-")}`,
          feature: "research",
          sourceLabel: "Game vault",
          title: game,
          game,
          displayTitle: game,
          summary: "Missing from the desk — create a vault entry to edit seasons and posters.",
          floating: false,
          missing: true,
        });
        present.add(key);
      });

    return listed;
  }, [records, ewcWindows, blogSlides, filterGames]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = windows.filter((item) => {
      if (item.deleted) return false;
      if (typeFilter === "events" && !isEventFeature(item.feature)) return false;
      if (typeFilter === "games" && !isGameFeature(item.feature)) return false;
      return matchesQuery(item, q);
    });
    return sortByRecency(filtered, sort, (item) => recordRecency(item) || (Number(item.floatingPriority) || 0));
  }, [windows, typeFilter, query, sort]);

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
          Filter events or games, search a title, then edit. {role === "support" ? "Support edits wait for owner approval." : "Owner saves go live immediately."}
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

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="flex flex-wrap gap-1">
          {TYPE_FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTypeFilter(item.id)}
              className={`rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest ${typeFilter === item.id ? "bg-neon text-slate-950" : "border border-white/15 text-slate-300"}`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <label className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            className={`${inputClass} pl-9`}
            placeholder="Search windows…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search floating windows"
          />
        </label>
        <DeskSortSelect value={sort} onChange={setSort} />
        <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">{visible.length} shown</p>
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

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {visible.map((item) => (
          <article
            key={`${item.feature}-${item.slug || item.id}`}
            className="flex min-h-[6.5rem] flex-col justify-between rounded-xl border border-white/10 bg-slate-950/60 p-2.5 sm:min-h-[7rem] sm:p-3"
          >
            <div className="min-w-0">
              <p className="truncate font-mono text-[8px] uppercase tracking-widest text-slate-500 sm:text-[9px]">
                {item.sourceLabel}
                {item.floating ? ` · p${item.floatingPriority || 0}` : " · off"}
                {policy[item.feature] ? "" : " · src off"}
                {item.missing ? " · missing" : ""}
              </p>
              <h3 className="mt-1 line-clamp-2 font-display text-base leading-tight text-white sm:text-lg">
                {item.displayTitle || item.title}
              </h3>
              <p className="mt-0.5 line-clamp-2 text-[10px] text-slate-500 sm:text-[11px]">{item.summary}</p>
            </div>
            {canWrite && (
              item.missing ? (
                <Link
                  to={`/admin/portal/vault/new?game=${encodeURIComponent(item.game || item.title || "")}`}
                  className="mt-2 inline-flex items-center gap-1 text-[11px] text-neon no-underline"
                >
                  <Pencil size={11} /> Create
                </Link>
              ) : item.feature === "research" ? (
                <Link
                  to={`/admin/portal/vault/${item.id}`}
                  className="mt-2 inline-flex items-center gap-1 text-[11px] text-neon no-underline"
                >
                  <Pencil size={11} /> Edit
                </Link>
              ) : (
                <button type="button" className="mt-2 inline-flex items-center gap-1 text-[11px] text-neon" onClick={() => setEditing(item)}>
                  <Pencil size={11} /> Edit
                </button>
              )
            )}
          </article>
        ))}
      </div>
      {!visible.length && <p className="text-sm text-slate-500">No windows match this filter.</p>}
    </section>
  );
}
