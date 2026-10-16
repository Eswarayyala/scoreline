import { serializeEdition } from "./vaultDeskSchema";

export const EVENT_SCOPES = [
  { id: "ewc", label: "EWC related" },
  { id: "region", label: "Region related" },
  { id: "random", label: "Random event" },
];

export function eventScopeLabel(id) {
  return EVENT_SCOPES.find((item) => item.id === id)?.label || "";
}

export function publicScopeKicker(item = {}) {
  if (item.eventScope === "ewc") return "EWC";
  if (item.eventScope === "region") return "Region";
  if (item.eventScope === "random") return "Event";
  if (item.research) return "EWC";
  return "";
}

export function inferEventScope(text = "") {
  if (/ewc|esports world cup|gamers8/i.test(String(text))) return "ewc";
  return "random";
}

export function isEwcEdition(edition = {}) {
  if (edition.eventScope === "region" || edition.eventScope === "random") return false;
  if (edition.eventScope === "ewc") return true;
  return /ewc|esports world cup|gamers8|riyadh masters/i.test(`${edition.event || ""} ${edition.season || ""}`);
}

export function normalizeGameKey(game = "") {
  return String(game || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function gamesMatch(a, b) {
  const left = normalizeGameKey(a);
  const right = normalizeGameKey(b);
  if (!left || !right) return false;
  return left === right || left.includes(right) || right.includes(left);
}

export function findGameVault(records = [], game) {
  return records.find((item) => (item.surface === "research" || item.research) && gamesMatch(item.game, game));
}

export function editionFromEvent(fields = {}) {
  const year = String(fields.eventDate || fields.year || "").match(/(\d{4})/)?.[1] || String(fields.year || "");
  return serializeEdition({
    year,
    season: year,
    event: fields.tournament || fields.event || "",
    champion: fields.winner || fields.champion || "",
    runnerUp: fields.runnerUp || "",
    mvp: fields.mvp || "",
    eventScope: fields.eventScope || inferEventScope(fields.tournament || fields.event),
    relatedBlogId: fields.blogPostId || "",
  }, fields.game);
}

export function applyEventToVault(record, fields = {}) {
  const game = fields.game || record?.game || "";
  const edition = editionFromEvent({ ...fields, game });
  const scope = fields.eventScope || edition.eventScope || "random";
  if (!record) {
    return {
      surface: "research",
      research: true,
      title: `${game} · Game vault`,
      game,
      summary: fields.content || "",
      eventScope: scope === "ewc" ? "ewc" : "random",
      region: fields.region || "Global",
      inFilters: true,
      editions: scope === "ewc" ? [{ ...edition, eventScope: "ewc" }] : [],
      relatedTournaments: scope === "ewc" ? [] : [{ year: edition.year, name: edition.event, region: fields.region || "", result: edition.champion }],
    };
  }
  if (scope === "ewc") {
    const editions = [...(record.editions || [])];
    const index = editions.findIndex((item) => String(item.year) === String(edition.year) && normalizeGameKey(item.event) === normalizeGameKey(edition.event));
    const nextEdition = { ...edition, eventScope: "ewc" };
    if (index >= 0) editions[index] = { ...editions[index], ...nextEdition };
    else editions.unshift(nextEdition);
    return { ...record, editions };
  }
  const related = [...(record.relatedTournaments || [])];
  const exists = related.some((row) => normalizeGameKey(row.name) === normalizeGameKey(edition.event) && String(row.year) === String(edition.year));
  if (!exists && edition.event) {
    related.unshift({ year: edition.year, name: edition.event, region: fields.region || record.region || "", result: edition.champion || "" });
  }
  return { ...record, relatedTournaments: related };
}
