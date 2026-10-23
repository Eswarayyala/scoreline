import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { linkifyHttpsText } from "../../data/blogAnalysis";

const PREVIEW_LINES = 6;
const PREVIEW_CHARS = PREVIEW_LINES * 72;

function needsExpand(text) {
  const raw = String(text || "").trim();
  if (!raw) return false;
  if (raw.split(/\r?\n/).filter(Boolean).length > PREVIEW_LINES) return true;
  return raw.length > PREVIEW_CHARS;
}

/** Show ~5–6 lines of blog text, with More / Less to reveal the full post. */
export default function ExpandableBlogBody({
  text,
  className = "",
  style,
  moreLabel = "More",
  lessLabel = "Less",
}) {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const bodyRef = useRef(null);
  const raw = String(text || "");
  const likelyLong = useMemo(() => needsExpand(raw), [raw]);
  const canExpand = likelyLong || overflows;
  const clamped = canExpand && !expanded;

  useLayoutEffect(() => {
    setExpanded(false);
    setOverflows(false);
  }, [raw]);

  useLayoutEffect(() => {
    if (expanded || !bodyRef.current) return undefined;
    const node = bodyRef.current;
    const measure = () => {
      // Line-clamp can fail with pre-wrap / nested links; measure actual overflow.
      const clipped = node.scrollHeight > node.clientHeight + 2;
      setOverflows(clipped || likelyLong);
    };
    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(node);
    return () => ro?.disconnect();
  }, [raw, expanded, likelyLong]);

  return (
    <div className={className}>
      <div
        ref={bodyRef}
        style={{
          color: "var(--text-muted)",
          ...(clamped
            ? {
                display: "-webkit-box",
                WebkitLineClamp: PREVIEW_LINES,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                whiteSpace: "normal",
              }
            : {
                whiteSpace: "pre-wrap",
              }),
          ...style,
        }}
      >
        {linkifyHttpsText(raw)}
      </div>
      {canExpand && (
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          className="mt-2 font-mono text-[11px] uppercase tracking-[0.18em] text-neon"
          style={{
            background: "transparent",
            border: "none",
            padding: 0,
            cursor: "pointer",
            color: "var(--accent, #ff2bd6)",
            fontFamily: "ui-monospace, monospace",
            fontSize: 11,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            marginTop: 8,
          }}
        >
          {expanded ? lessLabel : moreLabel}
        </button>
      )}
    </div>
  );
}
