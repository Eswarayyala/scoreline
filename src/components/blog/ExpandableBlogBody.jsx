import { useMemo, useState } from "react";
import { linkifyHttpsText } from "../../data/blogAnalysis";

const PREVIEW_LINES = 6;
const PREVIEW_CHARS = PREVIEW_LINES * 90;

function needsExpand(text) {
  const raw = String(text || "");
  if (!raw) return false;
  if (raw.split(/\r?\n/).length > PREVIEW_LINES) return true;
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
  const raw = String(text || "");
  const canExpand = useMemo(() => needsExpand(raw), [raw]);
  const clamped = canExpand && !expanded;

  return (
    <div className={className}>
      <div
        style={{
          color: "var(--text-muted)",
          whiteSpace: "pre-wrap",
          ...(clamped
            ? {
                display: "-webkit-box",
                WebkitLineClamp: PREVIEW_LINES,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }
            : null),
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
