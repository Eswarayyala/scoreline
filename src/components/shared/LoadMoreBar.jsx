import { useEffect, useState } from "react";

const STORAGE_PREFIX = "gi-page:";

function readStoredVisible(persistKey) {
  if (!persistKey || typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(`${STORAGE_PREFIX}${persistKey}`);
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

function writeStoredVisible(persistKey, value) {
  if (!persistKey || typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(`${STORAGE_PREFIX}${persistKey}`, String(value));
  } catch {
    /* ignore quota */
  }
}

function clampVisible(value, totalCount, initial) {
  const total = Math.max(0, Number(totalCount) || 0);
  const floor = Math.min(initial, total || initial);
  if (total <= initial) return total;
  return Math.min(Math.max(floor, value), total);
}

/** More loads the next page quietly (no +N / All). Less collapses to the default page. */
export default function LoadMoreBar({
  total = 0,
  shown = 0,
  pageSize = 6,
  initial = pageSize,
  onMore,
  onAll: _onAll,
  onLess,
  className = "",
}) {
  const floor = Math.max(1, initial || pageSize);
  if (total <= floor && shown >= total) return null;
  const remaining = Math.max(0, total - shown);
  const canLess = shown > floor;
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {remaining > 0 && (
        <button
          type="button"
          onClick={onMore}
          className="border border-dashed border-neon/40 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-neon hover:border-neon"
        >
          More
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

/**
 * Paged list size. Pass persistKey so "More" survives opening a card and navigating back
 * (sessionStorage — not reset to the default window count on remount).
 */
export function usePagedVisible(totalCount, initial = 6, pageSize = 6, persistKey = "") {
  const [visible, setVisible] = useState(() => {
    const stored = readStoredVisible(persistKey);
    if (stored != null) return clampVisible(stored, totalCount, initial);
    return Math.min(initial, totalCount || initial);
  });

  useEffect(() => {
    const stored = readStoredVisible(persistKey);
    setVisible(clampVisible(stored != null ? stored : initial, totalCount, initial));
  }, [persistKey]);

  useEffect(() => {
    setVisible((current) => clampVisible(current, totalCount, initial));
  }, [totalCount, initial]);

  useEffect(() => {
    writeStoredVisible(persistKey, visible);
  }, [persistKey, visible]);

  return {
    visible: Math.min(visible, Math.max(totalCount, 0)),
    pageSize,
    more: () => setVisible((current) => Math.min(totalCount, current + pageSize)),
    all: () => setVisible(totalCount),
    less: () => setVisible(Math.min(initial, totalCount)),
  };
}
