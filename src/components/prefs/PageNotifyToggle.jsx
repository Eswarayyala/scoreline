/**
 * Compact On/Off notify control for page headers.
 */
export default function PageNotifyToggle({
  enabled = true,
  onChange,
  label = "Notify",
  disabled = false,
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={enabled}
      aria-label={`${label} ${enabled ? "on" : "off"}`}
      onClick={() => onChange?.(!enabled)}
      className="inline-flex min-h-9 items-center gap-2 border border-white/15 px-3 font-mono text-[10px] uppercase tracking-widest text-slate-300 transition-colors hover:border-white/35 disabled:cursor-not-allowed disabled:opacity-40"
    >
      <span>{label}</span>
      <span style={{ color: enabled ? "var(--accent-secondary, #7dffb3)" : "var(--text-muted, #64748b)" }}>
        {enabled ? "On" : "Off"}
      </span>
    </button>
  );
}
