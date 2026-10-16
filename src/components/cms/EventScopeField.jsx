import { EVENT_SCOPES } from "../../data/eventScope";

const inputClass = "w-full rounded-lg border border-white/15 bg-slate-950/80 px-3 py-2 text-sm text-white outline-none focus:border-neon";

export default function EventScopeField({ value, onChange }) {
  return (
    <label className="grid gap-1 text-xs text-slate-400">
      Event type
      <select className={inputClass} value={value || "random"} onChange={(e) => onChange(e.target.value)}>
        {EVENT_SCOPES.map((scope) => (
          <option key={scope.id} value={scope.id}>{scope.label}</option>
        ))}
      </select>
    </label>
  );
}
