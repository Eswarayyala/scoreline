import { DESK_SORT_OPTIONS } from "../../lib/deskSort";

const inputClass = "rounded-lg border border-white/15 bg-slate-950/80 px-3 py-2 text-sm text-white outline-none focus:border-neon";

export default function DeskSortSelect({ value = "newest", onChange, className = "" }) {
  return (
    <label className={`inline-flex items-center gap-2 text-xs text-slate-400 ${className}`}>
      <span className="font-mono text-[10px] uppercase tracking-widest">Sort</span>
      <select
        className={inputClass}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        aria-label="Sort order"
      >
        {DESK_SORT_OPTIONS.map((option) => (
          <option key={option.id} value={option.id}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}
