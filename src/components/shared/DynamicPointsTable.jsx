import { useMemo, useState } from "react";

const EMPTY_ROW = () => ({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, team: "", placement: "1", kills: "0" });

function scoreRow(row, placementPoints = [10, 6, 4, 2, 1]) {
  const place = Math.max(1, Math.min(20, Number(row.placement) || 1));
  const kills = Math.max(0, Number(row.kills) || 0);
  const placePts = placementPoints[place - 1] ?? Math.max(0, 6 - place);
  return placePts + kills;
}

/** Host-side points table: placement + kills → auto total + sort. Local React state. */
export default function DynamicPointsTable({ initialRows, placementPoints, readOnly = false }) {
  const [rows, setRows] = useState(() =>
    (initialRows?.length ? initialRows : [EMPTY_ROW(), EMPTY_ROW(), EMPTY_ROW()]).map((row) => ({
      ...EMPTY_ROW(),
      ...row,
      id: row.id || EMPTY_ROW().id,
    })),
  );

  const ranked = useMemo(
    () =>
      [...rows]
        .map((row) => ({ ...row, total: scoreRow(row, placementPoints) }))
        .sort((a, b) => b.total - a.total || Number(a.placement) - Number(b.placement)),
    [rows, placementPoints],
  );

  const update = (id, patch) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  return (
    <section className="mt-4 rounded-2xl border border-white/10 bg-slate-950/50 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-volt">Dynamic points</p>
          <h3 className="font-display text-2xl text-white">Match standings</h3>
        </div>
        {!readOnly && (
          <button
            type="button"
            onClick={() => setRows((current) => [...current, EMPTY_ROW()])}
            className="font-mono text-[11px] uppercase tracking-widest text-neon"
          >
            + Add row
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm text-slate-300">
          <thead>
            <tr className="text-slate-500">
              <th className="py-1 pr-2 font-mono text-[10px] uppercase tracking-widest">#</th>
              <th className="py-1 pr-2 font-mono text-[10px] uppercase tracking-widest">Team</th>
              <th className="py-1 pr-2 font-mono text-[10px] uppercase tracking-widest">Place</th>
              <th className="py-1 pr-2 font-mono text-[10px] uppercase tracking-widest">Kills</th>
              <th className="py-1 font-mono text-[10px] uppercase tracking-widest">Total</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((row, index) => (
              <tr key={row.id} className="border-t border-white/5">
                <td className="py-2 pr-2 font-mono text-neon">{index + 1}</td>
                <td className="py-2 pr-2">
                  {readOnly ? (
                    row.team || "—"
                  ) : (
                    <input
                      value={row.team}
                      onChange={(event) => update(row.id, { team: event.target.value.slice(0, 40) })}
                      className="w-full border border-white/10 bg-black/40 px-2 py-1 text-white"
                      placeholder="Team"
                    />
                  )}
                </td>
                <td className="py-2 pr-2">
                  {readOnly ? (
                    row.placement
                  ) : (
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={row.placement}
                      onChange={(event) => update(row.id, { placement: event.target.value })}
                      className="w-16 border border-white/10 bg-black/40 px-2 py-1 text-white"
                    />
                  )}
                </td>
                <td className="py-2 pr-2">
                  {readOnly ? (
                    row.kills
                  ) : (
                    <input
                      type="number"
                      min="0"
                      max="99"
                      value={row.kills}
                      onChange={(event) => update(row.id, { kills: event.target.value })}
                      className="w-16 border border-white/10 bg-black/40 px-2 py-1 text-white"
                    />
                  )}
                </td>
                <td className="py-2 font-mono text-neon">{row.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
