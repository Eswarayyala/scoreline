/** Keeps filter controls pinned while the desk content scrolls. */
export default function StickyFilterBar({ children, trailing = null, className = "" }) {
  return (
    <div
      className={`sticky top-0 z-30 border-b border-white/10 bg-slate-950/95 py-3 backdrop-blur-md ${className}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">{children}</div>
        {trailing ? <div className="ml-auto flex shrink-0 items-center gap-2">{trailing}</div> : null}
      </div>
    </div>
  );
}
