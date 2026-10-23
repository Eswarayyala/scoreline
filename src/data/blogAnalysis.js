import { createElement } from "react";

export const BLOG_ANALYSIS_TYPES = [
  { id: "event", label: "Event" },
  { id: "team", label: "Team" },
  { id: "game", label: "Game" },
  { id: "match", label: "Match" },
];

export function analysisTypeLabel(id) {
  return BLOG_ANALYSIS_TYPES.find((item) => item.id === id)?.label || "Analysis";
}

export function isHttpsUrl(value) {
  return /^https:\/\//i.test(String(value || "").trim());
}

/** Turn plain https:// URLs in blog text into clickable external links. */
export function linkifyHttpsText(text) {
  const raw = String(text ?? "");
  if (!raw) return raw;
  const nodes = [];
  let lastIndex = 0;
  let match;
  let key = 0;
  const re = /https:\/\/[^\s<>"'`]+/gi;
  while ((match = re.exec(raw)) !== null) {
    if (match.index > lastIndex) nodes.push(raw.slice(lastIndex, match.index));
    const full = match[0];
    const href = full.replace(/[.,;:!?)\]}>]+$/g, "");
    const trail = full.slice(href.length);
    if (isHttpsUrl(href)) {
      nodes.push(
        createElement(
          "a",
          {
            key: `https-link-${key++}`,
            href,
            target: "_blank",
            rel: "noopener noreferrer",
            className: "text-neon",
            style: { overflowWrap: "anywhere" },
          },
          href,
        ),
      );
    } else {
      nodes.push(full);
    }
    if (trail) nodes.push(trail);
    lastIndex = match.index + full.length;
  }
  if (lastIndex < raw.length) nodes.push(raw.slice(lastIndex));
  return nodes;
}
