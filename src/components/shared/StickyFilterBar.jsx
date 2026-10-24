/** Filter controls for desks and catalog pages (scrolls with the page). */
export default function StickyFilterBar({ children, trailing = null, className = "" }) {
  return (
    <div
      className={`relative z-10 border-b border-white/10 bg-slate-950/95 py-3 ${className}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">{children}</div>
        {trailing ? <div className="ml-auto flex shrink-0 items-center gap-2">{trailing}</div> : null}
      </div>
    </div>
  );
}
