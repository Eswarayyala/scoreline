import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { canProposeCmsDelete, canWriteCircuitContent, isSiteSupportRole, supportWritesDirect } from "../../lib/staffAccess";
import { FILTER_GAMES, canonicalFilterGame } from "../../data/gameCatalog";
import { recordRecency, sortByRecency } from "../../lib/deskSort";
import DeskBin from "./DeskBin";
import StickyFilterBar from "../shared/StickyFilterBar";
import DeskSortSelect from "./DeskSortSelect";
import PosterPicker from "./PosterPicker";
import { ensureGameCollections } from "../../services/mediaLibrary";
import EventImagePicker from "./EventImagePicker";
import { emptyCircuitEvent } from "../../hooks/useCircuitCms";
import EventScopeField from "./EventScopeField";
import {
  emptyEdition,
  emptyFinalsRow,
  formatForGame,
  normalizeEdition,
  normalizeStageEntries,
  serializeEdition,
  STAGE_STATUSES,
  VAULT_FORMATS,
} from "../../data/vaultDeskSchema";

const inputClass = "w-full rounded-lg border border-white/15 bg-slate-950/80 px-3 py-2 text-sm text-white outline-none focus:border-neon";

function Field({ label, children }) {
  return (
    <label className="grid gap-1 text-xs text-slate-400">
      {label}
      {children}
    </label>
  );
}

function EditionCard({ edition, game, role, onChange, onRemove }) {
  const format = formatForGame(game, edition.structureId);
  const patch = (key, value) => onChange({ ...edition, [key]: value });
  const payouts = edition.payouts?.length ? edition.payouts : [{ rank: "", team: "", player: "", prize: "" }];
  const stages = edition.stages?.length
    ? edition.stages.map((stage) => ({ ...stage, entries: normalizeStageEntries(stage) }))
    : format.stages.map((name) => ({ name, teams: "", kickedOff: "", entries: [] }));
  const finals = edition.finalsTable?.length ? edition.finalsTable : [emptyFinalsRow(format)];
  const patchStage = (index, next) => patch("stages", stages.map((item, i) => (i === index ? next : item)));
  const applyStructure = (structureId) => {
    const nextFormat = VAULT_FORMATS[structureId] || format;
    const nextStages = nextFormat.stages.map((name) => {
      const existing = stages.find((row) => String(row.name || "").toLowerCase() === String(name).toLowerCase());
      return existing
        ? { ...existing, name, entries: normalizeStageEntries(existing) }
        : { name, teams: "", kickedOff: "", entries: [] };
    });
    onChange({
      ...edition,
      structureId: nextFormat.id,
      stages: nextStages,
      finalsTable: edition.finalsTable?.length ? edition.finalsTable : [emptyFinalsRow(nextFormat)],
    });
  };

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
        year={edition.year}
        season={edition.season}
        event={edition.event}
        poster={edition.poster}
        images={edition.images}
        role={role}
        heading="This event's poster and photos"
        onChange={(patchIn) => onChange({
          ...edition,
          poster: patchIn.poster ?? edition.poster,
          posterSource: patchIn.posterSource || edition.posterSource,
          images: patchIn.images ?? edition.images,
        })}
      />
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">YouTube links for this event</p>
          <button
            type="button"
            className="text-xs text-neon"
            onClick={() => patch("youtubeUrls", [...(edition.youtubeUrls || []), ""])}
          >
            + Link
          </button>
        </div>
        {(edition.youtubeUrls?.length ? edition.youtubeUrls : [""]).map((url, index) => (
          <div key={index} className="mb-2 flex gap-2">
            <input
              className={inputClass}
              placeholder="https://youtube.com/watch?v=…"
              value={url || ""}
              onChange={(e) => {
                const list = [...(edition.youtubeUrls?.length ? edition.youtubeUrls : [""])];
                list[index] = e.target.value;
                patch("youtubeUrls", list);
              }}
            />
            <button
              type="button"
              aria-label="Remove YouTube link"
              className="text-slate-400 hover:text-rose-400"
              onClick={() => patch("youtubeUrls", (edition.youtubeUrls || []).filter((_, i) => i !== index))}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        <p className="text-[11px] text-slate-500">Each link opens on YouTube for this season / event only.</p>
      </div>
      <details className="rounded-lg border border-white/10 p-3" open>
        <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-widest text-slate-500">Structure · per-game ladder</summary>
        <select
          className={`${inputClass} mt-2`}
          value={edition.structureId || format.id}
          onChange={(e) => applyStructure(e.target.value)}
        >
          {Object.values(VAULT_FORMATS).map((item) => (
            <option key={item.id} value={item.id}>{item.label}</option>
          ))}
        </select>
        <p className="mt-2 text-[11px] text-slate-500">
          Ladder for this game: {format.stages.join(" → ")}. Public view lists Grand finals first.
        </p>
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
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
            Stage teams · qualified / eliminated / survival
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              className="text-xs text-slate-400 hover:text-neon"
              onClick={() => applyStructure(format.id)}
            >
              Fill {format.label} stages
            </button>
            <button
              type="button"
              className="text-xs text-neon"
              onClick={() => patch("stages", [...stages, { name: "", teams: "", kickedOff: "", entries: [] }])}
            >
              + Stage
            </button>
          </div>
        </div>
        <p className="mb-3 text-[11px] text-slate-500">
          Add every group, survival, quarters, semis, finals, and grand finals as its own stage. Status marks who qualified, got eliminated, or moved to survival.
        </p>
        {stages.map((row, index) => {
          const entries = row.entries?.length ? row.entries : [{ name: "", status: "qualified" }];
          return (
            <div key={index} className="mb-3 grid gap-2 rounded-xl border border-white/10 p-3">
              <div className="flex gap-2">
                <input
                  list={`stage-names-${format.id}`}
                  placeholder="Stage (Grand finals, Survival, Group A…)"
                  className={inputClass}
                  value={row.name || ""}
                  onChange={(e) => patchStage(index, { ...row, name: e.target.value })}
                />
                <button
                  type="button"
                  aria-label="Remove stage"
                  onClick={() => patch("stages", stages.filter((_, i) => i !== index))}
                  className="text-slate-400 hover:text-rose-400"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              {entries.map((entry, entryIndex) => (
                <div key={entryIndex} className="grid gap-2 sm:grid-cols-[1.4fr_1fr_auto]">
                  <input
                    placeholder={format.competitor}
                    className={inputClass}
                    value={entry.name || ""}
                    onChange={(e) => {
                      const nextEntries = entries.map((item, i) => (i === entryIndex ? { ...item, name: e.target.value } : item));
                      patchStage(index, { ...row, entries: nextEntries });
                    }}
                  />
                  <select
                    className={inputClass}
                    value={entry.status || "qualified"}
                    onChange={(e) => {
                      const nextEntries = entries.map((item, i) => (i === entryIndex ? { ...item, status: e.target.value } : item));
                      patchStage(index, { ...row, entries: nextEntries });
                    }}
                  >
                    {STAGE_STATUSES.map((status) => (
                      <option key={status.id} value={status.id}>{status.label}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    aria-label="Remove team"
                    onClick={() => patchStage(index, { ...row, entries: entries.filter((_, i) => i !== entryIndex) })}
                    className="text-slate-400 hover:text-rose-400"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="w-fit text-xs text-neon"
                onClick={() => patchStage(index, { ...row, entries: [...entries, { name: "", status: "qualified" }] })}
              >
                + {format.competitor}
              </button>
            </div>
          );
        })}
        <datalist id={`stage-names-${format.id}`}>
          {format.stages.map((name) => (
            <option key={name} value={name} />
          ))}
          <option value="Group A" />
          <option value="Group B" />
          <option value="Group C" />
          <option value="Group D" />
          <option value="Survival" />
          <option value="Quarterfinals" />
          <option value="Semifinals" />
          <option value="Finals" />
          <option value="Grand finals" />
        </datalist>
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

function ResearchForm({ initial, canWrite, role, games, onSave, onCancel }) {
  const [form, setForm] = useState(() => {
    const base = { ...emptyCircuitEvent("research"), ...initial, surface: "research", research: true };
    const editions = (initial.editions || []).map((edition) => normalizeEdition(edition, initial.game || base.game));
    return { ...base, editions: editions.length ? editions : [emptyEdition(base.game)] };
  });
  const [error, setError] = useState("");
  /** Index of the season being edited; null = season list + vault fields. */
  const [editionFocus, setEditionFocus] = useState(null);
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
  const focusedEdition = editionFocus != null ? editions[editionFocus] : null;

  if (focusedEdition) {
    return (
      <div className="grid gap-3 rounded-2xl border border-neon/20 bg-slate-950/80 p-5">
        <button
          type="button"
          onClick={() => setEditionFocus(null)}
          className="w-fit font-mono text-xs uppercase tracking-widest text-neon"
        >
          ← Seasons
        </button>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-neon">
          Edit season · {focusedEdition.year || focusedEdition.event || `#${editionFocus + 1}`}
        </p>
        <EditionCard
          edition={focusedEdition}
          game={form.game}
          role={role}
          onChange={(next) => patch("editions", editions.map((item, i) => i === editionFocus ? next : item))}
          onRemove={() => {
            patch("editions", editions.filter((_, i) => i !== editionFocus));
            setEditionFocus(null);
          }}
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setEditionFocus(null)}
            className="rounded-full bg-neon px-4 py-2 text-sm font-semibold text-slate-950"
          >
            Done · back to seasons
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-white/15 px-4 py-2 text-sm text-slate-200"
          >
            Cancel vault
          </button>
        </div>
      </div>
    );
  }

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
        <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-slate-500">Avatars and posters</p>
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
      <div className="grid gap-3">
        <div className="flex items-center justify-between gap-2">
          <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Seasons · {editions.length}</p>
          <button
            type="button"
            className="inline-flex items-center gap-1 text-xs text-neon"
            onClick={() => {
              patch("editions", [emptyEdition(form.game), ...editions]);
              setEditionFocus(0);
            }}
          >
            <Plus size={12} /> Season
          </button>
        </div>
        <div className="grid gap-2">
          {editions.map((edition, index) => (
            <article
              key={`${edition.year || ""}-${edition.event || ""}-${index}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate font-mono text-[9px] uppercase tracking-widest text-slate-500">
                  {edition.year || "Year?"} · {edition.eventScope || "scope"}
                </p>
                <p className="truncate text-sm text-white">{edition.event || edition.season || `Season ${index + 1}`}</p>
                {(edition.champion || edition.mvp) && (
                  <p className="truncate text-[11px] text-slate-500">
                    {[edition.champion && `Champ ${edition.champion}`, edition.mvp && `MVP ${edition.mvp}`].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setEditionFocus(index)}
                className="inline-flex items-center gap-1 text-[11px] text-neon"
              >
                <Pencil size={11} /> Edit
              </button>
            </article>
          ))}
        </div>
      </div>
      {error && <p className="text-sm text-rose-400">{error}</p>}
      {isSiteSupportRole(role) && (
        <p className="text-xs text-neon/90">Support saves (including event posters) wait for owner approval.</p>
      )}
      <div className="flex gap-2">
        <button type="submit" disabled={!canWrite} className="rounded-full bg-neon px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-40">Save game vault</button>
        <button type="button" onClick={onCancel} className="rounded-full border border-white/15 px-4 py-2 text-sm text-slate-200">Cancel</button>
      </div>
    </form>
  );
}

function CatalogDesk({ records, role, permissions, games, onSave, onDelete }) {
  const canWrite = canWriteCircuitContent(role);
  const canRemove = canProposeCmsDelete(role, permissions);
  const [name, setName] = useState("");
  const [media, setMedia] = useState({ poster: "", flyers: [], avatar: "" });
  const extras = records.filter((item) => item.surface === "catalog");
  return (
    <section className="space-y-3 rounded-2xl border border-white/10 p-4">
      <h3 className="font-display text-2xl text-white">Filter catalog</h3>
      <p className="text-sm text-slate-400">These names power Find players, create-tournament, and CMS dropdowns. Attach posters for games you add by hand.</p>
      {isSiteSupportRole(role) && (
        <p className="text-xs text-neon/90">Catalog edits and removals go to the owner queue — support never writes live.</p>
      )}
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
          {canRemove && <button type="button" className="text-rose-400" onClick={() => onDelete(item.id)}>Remove</button>}
        </div>
      ))}
    </section>
  );
}

export default function VaultResearchDesk({
  records,
  deletedRecords = [],
  role,
  permissions = null,
  onSave,
  onDelete,
  onRestore,
  onPurge,
  filterGames = FILTER_GAMES,
  focusId,
}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");
  const canWrite = canWriteCircuitContent(role);
  const canRemove = canProposeCmsDelete(role, permissions);
  const items = useMemo(() => records.filter((item) => item.surface === "research" || item.research), [records]);
  const binned = useMemo(
    () => deletedRecords.filter((item) => item.surface === "research" || item.research || item.surface === "catalog"),
    [deletedRecords],
  );

  const deskCards = useMemo(() => {
    const cards = items.map((item) => ({
      ...item,
      displayTitle: item.fullName || item.title || item.game,
      missing: false,
    }));
    const present = new Set(
      cards.flatMap((item) => [item.game, item.fullName, item.title].filter(Boolean).map((name) => canonicalFilterGame(name).toLowerCase())),
    );
    filterGames
      .filter((game) => game && game !== "Other")
      .forEach((game) => {
        const key = canonicalFilterGame(game).toLowerCase();
        const covered = [...present].some((name) => name === key || name.includes(key) || key.includes(name));
        if (covered) return;
        cards.push({
          id: `missing-${key.replace(/[^a-z0-9]+/g, "-")}`,
          game,
          title: game,
          displayTitle: game,
          region: "Global",
          editions: [],
          missing: true,
        });
        present.add(key);
      });
    return cards;
  }, [items, filterGames]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = !q
      ? deskCards
      : deskCards.filter((item) => [item.displayTitle, item.title, item.game, item.fullName, item.region]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q));
    return sortByRecency(filtered, sort, (item) => recordRecency(item) || String(item.displayTitle || "").charCodeAt(0));
  }, [deskCards, query, sort]);

  if (focusId) {
    const presetGame = searchParams.get("game") || "";
    const initial = focusId === "new"
      ? {
        surface: "research",
        research: true,
        ...(presetGame ? { game: presetGame, title: presetGame } : {}),
      }
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
            role={role}
            games={filterGames}
            onSave={async (draft) => {
              await onSave(draft);
              navigate("/admin/portal?tab=vault", { replace: true });
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
          <p className="mt-1 text-sm text-slate-400">
            Missing titles (including Chess) stay listed so you can create them. Edit opens in this tab
            {isSiteSupportRole(role) ? " — support publishes only after owner approval" : ""}.
          </p>
        </div>
        {canWrite && (
          <Link to="/admin/portal/vault/new" className="inline-flex items-center gap-1 rounded-full bg-neon px-4 py-2 text-sm font-semibold text-slate-950 no-underline">
            <Plus size={14} /> New game vault
          </Link>
        )}
      </div>
      <StickyFilterBar>
        <label className="relative block min-w-0 flex-1 sm:max-w-md">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            className={`${inputClass} pl-9`}
            placeholder="Search game vaults…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search game vaults"
          />
        </label>
        <DeskSortSelect value={sort} onChange={setSort} />
      </StickyFilterBar>
      <CatalogDesk records={records} role={role} permissions={permissions} games={filterGames} onSave={onSave} onDelete={onDelete} />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {visible.map((item) => (
          <article
            key={item.id}
            className="flex min-h-[6.5rem] flex-col justify-between rounded-xl border border-white/10 bg-slate-950/60 p-2.5 sm:min-h-[7.25rem] sm:p-3"
          >
            <div className="min-w-0">
              <p className="truncate font-mono text-[8px] uppercase tracking-widest text-slate-500 sm:text-[9px]">
                {item.missing ? "Missing · create" : `${item.game} · ${item.region || "Global"} · ${(item.editions || []).length} EWC`}
              </p>
              <h3 className="mt-1 line-clamp-2 font-display text-base leading-tight text-white sm:text-lg">{item.displayTitle || item.title}</h3>
            </div>
            {canWrite && (
              <div className="mt-2 flex flex-wrap gap-2">
                <Link
                  to={item.missing ? `/admin/portal/vault/new?game=${encodeURIComponent(item.game || item.title || "")}` : `/admin/portal/vault/${item.id}`}
                  className="inline-flex items-center gap-1 text-[11px] text-neon no-underline"
                >
                  <Pencil size={11} /> {item.missing ? "Create" : "Edit"}
                </Link>
                {!item.missing && canRemove && (
                  <button type="button" onClick={() => onDelete(item.id)} className="inline-flex items-center gap-1 text-[11px] text-rose-400">
                    <Trash2 size={11} /> {isSiteSupportRole(role) && !supportWritesDirect(role, permissions, "vaultDelete") ? "Request remove" : "Move to bin"}
                  </button>
                )}
              </div>
            )}
          </article>
        ))}
      </div>
      {!visible.length && <p className="text-sm text-slate-500">No game vaults match that search.</p>}
      <DeskBin
        items={binned}
        title="Vault bin"
        canManage={canWrite && !!onRestore && !!onPurge}
        onRestore={(item) => onRestore(item.id)}
        onPurge={(item) => onPurge(item.id)}
      />
    </section>
  );
}
