import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { canWriteCircuitContent } from "../../lib/staffAccess";
import { FILTER_GAMES } from "../../data/gameCatalog";
import PosterPicker from "./PosterPicker";
import { ensureGameCollections } from "../../services/mediaLibrary";
import EventImagePicker from "./EventImagePicker";
import { emptyCircuitEvent } from "../../hooks/useCircuitCms";
import EventScopeField from "./EventScopeField";
import { emptyEdition, emptyFinalsRow, formatForGame, normalizeEdition, serializeEdition, VAULT_FORMATS } from "../../data/vaultDeskSchema";

const inputClass = "w-full rounded-lg border border-white/15 bg-slate-950/80 px-3 py-2 text-sm text-white outline-none focus:border-neon";

function Field({ label, children }) {
  return (
    <label className="grid gap-1 text-xs text-slate-400">
      {label}
      {children}
    </label>
  );
}

function EditionCard({ edition, game, onChange, onRemove }) {
  const format = formatForGame(game, edition.structureId);
  const patch = (key, value) => onChange({ ...edition, [key]: value });
  const payouts = edition.payouts?.length ? edition.payouts : [{ rank: "", team: "", player: "", prize: "" }];
  const stages = edition.stages?.length ? edition.stages : format.stages.map((name) => ({ name, teams: "", kickedOff: "" }));
  const finals = edition.finalsTable?.length ? edition.finalsTable : [emptyFinalsRow(format)];

  return (
    <div className="grid gap-3 rounded-2xl border border-white/10 p-4">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-widest text-volt">{edition.year || "Season"}</p>
        <button type="button" onClick={onRemove} className="inline-flex items-center gap-1 text-xs text-rose-400"><Trash2 size={12} /> Remove season</button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Year"><input className={inputClass} value={edition.year || ""} onChange={(e) => patch("year", e.target.value)} /></Field>
        <Field label="Season"><input className={inputClass} value={edition.season || ""} onChange={(e) => patch("season", e.target.value)} /></Field>
        <Field label="Event / circuit"><input className={inputClass} value={edition.event || ""} onChange={(e) => patch("event", e.target.value)} /></Field>
        <Field label="Prize pool"><input className={inputClass} value={edition.prizePool || ""} onChange={(e) => patch("prizePool", e.target.value)} /></Field>
        <Field label="Champion"><input className={inputClass} value={edition.champion || ""} onChange={(e) => patch("champion", e.target.value)} /></Field>
        <Field label="Runner-up"><input className={inputClass} value={edition.runnerUp || ""} onChange={(e) => patch("runnerUp", e.target.value)} /></Field>
        <Field label="Third / bronze"><input className={inputClass} value={edition.third || ""} onChange={(e) => patch("third", e.target.value)} /></Field>
        <Field label="MVP"><input className={inputClass} value={edition.mvp || ""} onChange={(e) => patch("mvp", e.target.value)} /></Field>
        {format.hasIgl && <Field label="Best IGL"><input className={inputClass} value={edition.bestIgl || ""} onChange={(e) => patch("bestIgl", e.target.value)} /></Field>}
        <Field label="Fan favourite"><input className={inputClass} value={edition.fanFavourite || ""} onChange={(e) => patch("fanFavourite", e.target.value)} /></Field>
        <Field label="Teams from groups to finals"><input className={inputClass} value={edition.totalTeams || ""} onChange={(e) => patch("totalTeams", e.target.value)} /></Field>
        <EventScopeField value={edition.eventScope} onChange={(value) => patch("eventScope", value)} />
      </div>
      <EventImagePicker
        game={game}
        poster={edition.poster}
        images={edition.images}
        heading="This event's poster and photos"
        onChange={(patchIn) => onChange({
          ...edition,
          poster: patchIn.poster ?? edition.poster,
          posterSource: patchIn.posterSource || edition.posterSource,
          images: patchIn.images ?? edition.images,
        })}
      />
      <details className="rounded-lg border border-white/10 p-3">
        <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-widest text-slate-500">Structure category</summary>
        <select
          className={`${inputClass} mt-2`}
          value={edition.structureId || format.id}
          onChange={(e) => patch("structureId", e.target.value)}
        >
          {Object.values(VAULT_FORMATS).map((item) => (
            <option key={item.id} value={item.id}>{item.id}</option>
          ))}
        </select>
      </details>
      <Field label="Who lost in the early stage">
        <textarea rows={2} className={inputClass} value={edition.earlyExits || ""} onChange={(e) => patch("earlyExits", e.target.value)} />
      </Field>
      <Field label="Who lost composure">
        <textarea rows={2} className={inputClass} value={edition.lostComposure || ""} onChange={(e) => patch("lostComposure", e.target.value)} />
      </Field>
      <Field label="Who made it look easy">
        <textarea rows={2} className={inputClass} value={edition.madeItLookEasy || ""} onChange={(e) => patch("madeItLookEasy", e.target.value)} />
      </Field>
      <Field label="Clutches, rivalries, MVP notes">
        <textarea rows={2} className={inputClass} value={edition.clutchesAndRivalries || ""} onChange={(e) => patch("clutchesAndRivalries", e.target.value)} />
      </Field>
      <Field label="Format notes (BO5, GSL groups, lobby points, etc.)">
        <textarea rows={2} className={inputClass} value={edition.formatNotes || ""} onChange={(e) => patch("formatNotes", e.target.value)} />
      </Field>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Kicked off at each level</p>
          <button type="button" className="text-xs text-neon" onClick={() => patch("stages", [...stages, { name: "", teams: "", kickedOff: "" }])}>+ Stage</button>
        </div>
        {stages.map((row, index) => (
          <div key={index} className="mb-2 grid gap-2 sm:grid-cols-[1fr_0.5fr_1.4fr_auto]">
            <input placeholder="Stage" className={inputClass} value={row.name || ""} onChange={(e) => patch("stages", stages.map((item, i) => i === index ? { ...item, name: e.target.value } : item))} />
            <input placeholder="Teams" className={inputClass} value={row.teams || ""} onChange={(e) => patch("stages", stages.map((item, i) => i === index ? { ...item, teams: e.target.value } : item))} />
            <input placeholder="Who got kicked off" className={inputClass} value={row.kickedOff || ""} onChange={(e) => patch("stages", stages.map((item, i) => i === index ? { ...item, kickedOff: e.target.value } : item))} />
            <button type="button" aria-label="Remove stage" onClick={() => patch("stages", stages.filter((_, i) => i !== index))} className="text-slate-400 hover:text-rose-400"><Trash2 size={14} /></button>
          </div>
        ))}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Finals point table</p>
          <button type="button" className="text-xs text-neon" onClick={() => patch("finalsTable", [...finals, emptyFinalsRow(format)])}>+ Row</button>
        </div>
        <div className="mb-1 hidden gap-2 text-[10px] uppercase tracking-widest text-slate-500 sm:grid" style={{ gridTemplateColumns: `repeat(${format.finalsColumns.length}, minmax(0, 1fr)) auto` }}>
          {format.finalsColumns.map((column) => <span key={column.key}>{column.label}</span>)}
          <span />
        </div>
        {finals.map((row, index) => (
          <div key={index} className="mb-2 grid gap-2" style={{ gridTemplateColumns: `repeat(${format.finalsColumns.length}, minmax(0, 1fr)) auto` }}>
            {format.finalsColumns.map((column) => (
              <input
                key={column.key}
                placeholder={column.label}
                className={inputClass}
                value={row[column.key] || ""}
                onChange={(e) => patch("finalsTable", finals.map((item, i) => i === index ? { ...item, [column.key]: e.target.value } : item))}
              />
            ))}
            <button type="button" aria-label="Remove finals row" onClick={() => patch("finalsTable", finals.filter((_, i) => i !== index))} className="text-slate-400 hover:text-rose-400"><Trash2 size={14} /></button>
          </div>
        ))}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Prize places</p>
          <button type="button" className="text-xs text-neon" onClick={() => patch("payouts", [...payouts, { rank: "", team: "", player: "", prize: "" }])}>+ Place</button>
        </div>
        {payouts.map((row, index) => (
          <div key={index} className="mb-2 grid gap-2 sm:grid-cols-[0.8fr_1.2fr_0.8fr_auto]">
            <input placeholder="Place" className={inputClass} value={row.rank || ""} onChange={(e) => patch("payouts", payouts.map((item, i) => i === index ? { ...item, rank: e.target.value } : item))} />
            <input
              placeholder={format.competitor}
              className={inputClass}
              value={format.competitor === "Player" ? (row.player || "") : (row.team || row.player || "")}
              onChange={(e) => patch("payouts", payouts.map((item, i) => i === index ? (format.competitor === "Player" ? { ...item, player: e.target.value } : { ...item, team: e.target.value }) : item))}
            />
            <input placeholder="Prize" className={inputClass} value={row.prize || ""} onChange={(e) => patch("payouts", payouts.map((item, i) => i === index ? { ...item, prize: e.target.value } : item))} />
            <button type="button" aria-label="Remove place" onClick={() => patch("payouts", payouts.filter((_, i) => i !== index))} className="text-slate-400 hover:text-rose-400"><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResearchForm({ initial, canWrite, games, onSave, onCancel }) {
  const [form, setForm] = useState(() => {
    const base = { ...emptyCircuitEvent("research"), ...initial, surface: "research", research: true };
    const editions = (initial.editions || []).map((edition) => normalizeEdition(edition, initial.game || base.game));
    return { ...base, editions: editions.length ? editions : [emptyEdition(base.game)] };
  });
  const [error, setError] = useState("");
  const patch = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const editions = form.editions?.length ? form.editions : [emptyEdition(form.game)];

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      await onSave({
        ...form,
        surface: "research",
        research: true,
        editions: editions.map((edition) => serializeEdition(edition, form.game)),
        yearlyStats: (form.yearlyStats || []).filter((row) => row.year),
        relatedTournaments: (form.relatedTournaments || []).filter((row) => row.name),
      });
      ensureGameCollections(form.game).catch(() => {});
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
        <Field label="Title"><input required className={inputClass} value={form.title || ""} onChange={(e) => patch("title", e.target.value)} /></Field>
        <Field label="Game">
          <input list="vault-games" className={inputClass} value={form.game || ""} onChange={(e) => patch("game", e.target.value)} />
          <datalist id="vault-games">{games.map((game) => <option key={game} value={game} />)}</datalist>
        </Field>
        <Field label="Region"><input className={inputClass} value={form.region || ""} onChange={(e) => patch("region", e.target.value)} /></Field>
        <Field label="Peak prize pool"><input className={inputClass} value={form.peakPrizePool || ""} onChange={(e) => patch("peakPrizePool", e.target.value)} /></Field>
        <EventScopeField value={form.eventScope} onChange={(value) => patch("eventScope", value)} />
        <Field label="Floating priority"><input type="number" min="0" max="99" className={inputClass} value={form.floatingPriority ?? 0} onChange={(e) => patch("floatingPriority", Number(e.target.value))} /></Field>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-200">
        <input type="checkbox" checked={form.floating === true} onChange={(e) => patch("floating", e.target.checked)} />
        Offer this game vault as a floating window (owner still has to enable Game vaults as a source)
      </label>
      <details className="rounded-lg border border-white/10 p-3">
        <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-widest text-slate-500">Game type category</summary>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <Field label="Genre"><input className={inputClass} value={form.genre || ""} onChange={(e) => patch("genre", e.target.value)} /></Field>
          <Field label="Platform / type"><input className={inputClass} value={form.type || ""} onChange={(e) => patch("type", e.target.value)} /></Field>
        </div>
      </details>
      <Field label="Overview"><textarea rows={3} className={inputClass} value={form.summary || ""} onChange={(e) => patch("summary", e.target.value)} /></Field>
      <div>
        <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-slate-500">Avatars, flyers, and posters</p>
        <PosterPicker
          game={form.game}
          value={form.poster}
          avatar={form.avatar}
          flyers={form.flyers}
          posterIndex={form.posterIndex}
          onChange={(patchIn) => setForm((current) => ({ ...current, ...patchIn }))}
        />
      </div>
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
      <div className="grid gap-4">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Seasons (text desk)</p>
          <button type="button" className="text-xs text-neon" onClick={() => patch("editions", [emptyEdition(form.game), ...editions])}>+ Season</button>
        </div>
        {editions.map((edition, index) => (
          <EditionCard
            key={index}
            edition={edition}
            game={form.game}
            onChange={(next) => patch("editions", editions.map((item, i) => i === index ? next : item))}
            onRemove={() => patch("editions", editions.filter((_, i) => i !== index))}
          />
        ))}
      </div>
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
  const [media, setMedia] = useState({ poster: "", flyers: [], avatar: "" });
  const extras = records.filter((item) => item.surface === "catalog");
  return (
    <section className="space-y-3 rounded-2xl border border-white/10 p-4">
      <h3 className="font-display text-2xl text-white">Filter catalog</h3>
      <p className="text-sm text-slate-400">These names power Find players, create-tournament, and CMS dropdowns. Attach posters for games you add by hand.</p>
      <p className="text-xs text-slate-500">{games.join(" · ")}</p>
      {canWrite && (
        <div className="grid gap-3">
          <div className="flex gap-2">
            <input className={inputClass} placeholder="Add a game to filters" value={name} onChange={(e) => setName(e.target.value)} />
            <button
              type="button"
              className="shrink-0 rounded-full bg-neon px-3 text-sm font-semibold text-slate-950"
              onClick={() => {
                const game = name.trim();
                if (!game) return;
                onSave({
                  surface: "catalog",
                  title: game,
                  game,
                  inFilters: true,
                  kicker: "Filter list",
                  poster: media.poster,
                  flyers: media.flyers,
                  avatar: media.avatar,
                  posterSource: media.posterSource || "upload",
                });
                ensureGameCollections(game).catch(() => {});
                setName("");
                setMedia({ poster: "", flyers: [], avatar: "" });
              }}
            >
              Add
            </button>
          </div>
          <PosterPicker
            game={name || "Other"}
            value={media.poster}
            avatar={media.avatar}
            flyers={media.flyers}
            onChange={(patchIn) => setMedia((current) => ({ ...current, ...patchIn }))}
          />
        </div>
      )}
      {extras.map((item) => (
        <div key={item.id} className="flex items-center justify-between gap-3 text-sm text-slate-300">
          <span className="flex items-center gap-2">
            {(item.poster || item.avatar) && <img src={item.poster || item.avatar} alt="" className="h-8 w-8 rounded object-cover" />}
            {item.game}
          </span>
          {canWrite && <button type="button" className="text-rose-400" onClick={() => onDelete(item.id)}>Remove</button>}
        </div>
      ))}
    </section>
  );
}

export default function VaultResearchDesk({ records, role, onSave, onDelete, filterGames = FILTER_GAMES, focusId }) {
  const navigate = useNavigate();
  const canWrite = canWriteCircuitContent(role);
  const items = useMemo(() => records.filter((item) => item.surface === "research" || item.research), [records]);

  if (focusId) {
    const initial = focusId === "new"
      ? { surface: "research", research: true }
      : items.find((item) => item.id === focusId);
    return (
      <section className="space-y-4">
        <Link to="/admin/portal?tab=vault" className="font-mono text-xs uppercase tracking-widest text-neon">← Game vaults</Link>
        <h2 className="font-display text-3xl text-white">{focusId === "new" ? "New game vault" : initial?.title || "Edit game vault"}</h2>
        {!initial && focusId !== "new" ? (
          <p className="text-sm text-slate-400">That game vault is not in the desk.</p>
        ) : (
          <ResearchForm
            initial={initial}
            canWrite={canWrite}
            games={filterGames}
            onSave={async (draft) => {
              const saved = await onSave(draft);
              if (focusId === "new" && saved?.id) navigate(`/admin/portal/vault/${saved.id}`, { replace: true });
            }}
            onCancel={() => navigate("/admin/portal?tab=vault")}
          />
        )}
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-neon">Shared research desk</p>
          <h2 className="font-display text-3xl text-white">Game vaults</h2>
          <p className="mt-1 text-sm text-slate-400">Open a game in a new tab to edit. The rest of the list stays on this desk.</p>
        </div>
        {canWrite && (
          <a href="/admin/portal/vault/new" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-neon px-4 py-2 text-sm font-semibold text-slate-950 no-underline">
            <Plus size={14} /> New game vault
          </a>
        )}
      </div>
      <CatalogDesk records={records} role={role} games={filterGames} onSave={onSave} onDelete={onDelete} />
      <div className="grid gap-3">
        {items.map((item) => (
          <article key={item.id} className="flex items-start justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">{item.game} · {item.region || "Global"} · {(item.editions || []).length} EWC editions</p>
              <h3 className="font-display text-2xl text-white">{item.title}</h3>
            </div>
            {canWrite && (
              <div className="flex gap-3">
                <a href={`/admin/portal/vault/${item.id}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-neon no-underline"><Pencil size={12} /> Edit</a>
                <button type="button" onClick={() => onDelete(item.id)} className="inline-flex items-center gap-1 text-xs text-rose-400"><Trash2 size={12} /> Remove</button>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
