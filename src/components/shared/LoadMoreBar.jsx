import { useEffect, useState } from "react";

/** More loads a few more; All expands fully; Less collapses back to the default page. */
export default function LoadMoreBar({
  total = 0,
  shown = 0,
  pageSize = 6,
  initial = pageSize,
  onMore,
  onAll,
  onLess,
  className = "",
}) {
  const floor = Math.max(1, initial || pageSize);
  if (total <= floor && shown >= total) return null;
  const remaining = Math.max(0, total - shown);
  const nextChunk = Math.min(pageSize, remaining);
  const canLess = shown > floor;
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {remaining > 0 && (
        <button
          type="button"
          onClick={onMore}
          className="border border-dashed border-neon/40 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-neon hover:border-neon"
        >
          More (+{nextChunk})
        </button>
      )}
      {remaining > nextChunk && (
        <button
          type="button"
          onClick={onAll}
          className="border border-white/15 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-slate-300 hover:border-white/30"
        >
          All ({total})
        </button>
      )}
      {canLess && (
        <button
          type="button"
          onClick={onLess}
          className="border border-white/15 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-slate-300 hover:border-white/30"
        >
          Less
        </button>
      )}
    </div>
  );
}

export function usePagedVisible(totalCount, initial = 6, pageSize = 6) {
  const [visible, setVisible] = useState(Math.min(initial, totalCount || initial));
  useEffect(() => {
    setVisible((current) => {
      const floor = Math.min(initial, Math.max(totalCount, 0));
      if (totalCount <= initial) return totalCount;
      return Math.min(Math.max(floor, current), totalCount);
    });
  }, [totalCount, initial]);
  return {
    visible: Math.min(visible, totalCount),
    pageSize,
    more: () => setVisible((current) => Math.min(totalCount, current + pageSize)),
    all: () => setVisible(totalCount),
    less: () => setVisible(Math.min(initial, totalCount)),
  };
}
