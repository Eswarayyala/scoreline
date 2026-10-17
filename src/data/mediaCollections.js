export const SITE_COLLECTION_KINDS = [
  { id: "background", label: "Background" },
  { id: "avatar", label: "Avatar" },
  { id: "poster", label: "Poster" },
  { id: "event", label: "Event" },
  { id: "flyer", label: "Flyer" },
  { id: "post", label: "Post" },
];

export const TOURNAMENT_COLLECTION_KINDS = [
  { id: "poster", label: "Poster" },
];

export const ALL_COLLECTION_KINDS = [...SITE_COLLECTION_KINDS, ...TOURNAMENT_COLLECTION_KINDS];

export function slugMedia(value) {
  return String(value || "item")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "item";
}

export function siteCollectionId(game, kind) {
  return `site-${slugMedia(game)}-${kind}`;
}

export function tournamentCollectionId(tournamentId, title = "posters") {
  return `tournament-${String(tournamentId).slice(0, 48)}-${slugMedia(title)}`;
}

export function collectionKindLabel(kind) {
  return ALL_COLLECTION_KINDS.find((item) => item.id === kind)?.label || kind;
}
