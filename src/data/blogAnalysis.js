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
