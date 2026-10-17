export const VAULT_FORMATS = {
  bracket: {
    id: "bracket",
    label: "Bracket / series",
    competitor: "Team",
    hasIgl: true,
    stages: ["Group stage", "Round of 16", "Quarterfinals", "Semifinals", "Grand finals"],
    finalsColumns: [
      { key: "map", label: "Map / game" },
      { key: "score", label: "Score" },
      { key: "winner", label: "Winner" },
      { key: "notes", label: "Notes" },
    ],
  },
  battleRoyale: {
    id: "battleRoyale",
    label: "Battle royale finals",
    competitor: "Team",
    hasIgl: true,
    stages: ["Lobby / groups", "Playoffs", "Grand finals"],
    finalsColumns: [
      { key: "place", label: "Place" },
      { key: "team", label: "Team" },
      { key: "points", label: "Points" },
      { key: "kills", label: "Kills" },
    ],
  },
  fighting: {
    id: "fighting",
    label: "Fighting grand finals",
    competitor: "Player",
    hasIgl: false,
    stages: ["Pools", "Top 16", "Top 8", "Grand finals"],
    finalsColumns: [
      { key: "game", label: "Game" },
      { key: "score", label: "Score" },
      { key: "winner", label: "Winner" },
      { key: "notes", label: "Notes" },
    ],
  },
  racing: {
    id: "racing",
    label: "Race standings",
    competitor: "Team / player",
    hasIgl: false,
    stages: ["Qualifying", "Heats", "Grand finals"],
    finalsColumns: [
      { key: "place", label: "Place" },
      { key: "driver", label: "Driver" },
      { key: "team", label: "Team" },
      { key: "time", label: "Time / pts" },
    ],
  },
  chess: {
    id: "chess",
    label: "Chess standings",
    competitor: "Player",
    hasIgl: false,
    stages: ["Swiss / groups", "Playoffs", "Grand finals"],
    finalsColumns: [
      { key: "place", label: "Place" },
      { key: "player", label: "Player" },
      { key: "points", label: "Points" },
      { key: "record", label: "W–D–L" },
    ],
  },
  sports: {
    id: "sports",
    label: "Match / series",
    competitor: "Player",
    hasIgl: false,
    stages: ["Groups", "Knockouts", "Grand finals"],
    finalsColumns: [
      { key: "game", label: "Game" },
      { key: "score", label: "Score" },
      { key: "winner", label: "Winner" },
      { key: "notes", label: "Notes" },
    ],
  },
};

export function formatForGame(game = "", structureId) {
  if (structureId && VAULT_FORMATS[structureId]) return VAULT_FORMATS[structureId];
  const name = String(game).toLowerCase();
  if (/apex|pubg|fortnite|free fire|warzone|bgmi|standoff/.test(name)) return VAULT_FORMATS.battleRoyale;
  if (/street fighter|tekken|fatal fury/.test(name)) return VAULT_FORMATS.fighting;
  if (/renn|trackmania|sim racing/.test(name)) return VAULT_FORMATS.racing;
  if (/chess/.test(name)) return VAULT_FORMATS.chess;
  if (/rocket|ea sports|fifa|\bfc\b/.test(name)) return VAULT_FORMATS.sports;
  return VAULT_FORMATS.bracket;
}

function payoutName(row = {}) {
  return row.team || row.player || "";
}

function payoutByPrefix(payouts = [], prefix) {
  return payouts.find((row) => String(row.rank || "").toLowerCase().startsWith(prefix));
}

function inferTotalTeams(edition = {}) {
  if (edition.totalTeams) return edition.totalTeams;
  const ranks = (edition.payouts || []).map((row) => String(row.rank || ""));
  const match = ranks.join(" ").match(/(\d+)\s*(?:nd|rd|th)?\s*$/i) || ranks.join(" ").match(/(\d+)(?:st|nd|rd|th)?\s*$/i);
  const span = ranks.join(" ").match(/(\d+)\s*[–-]\s*(\d+)/);
  if (span) return span[2];
  return match ? match[1] : "";
}

function stagesFromPayouts(edition, format) {
  if (edition.stages?.length) return edition.stages;
  const extras = (edition.payouts || [])
    .filter((row) => !/^1st|^2nd/i.test(String(row.rank || "")))
    .map((row) => ({
      name: row.rank || "",
      teams: "",
      kickedOff: payoutName(row),
    }));
  if (!extras.length) return [];
  return extras;
}

export function emptyFinalsRow(format) {
  return Object.fromEntries((format.finalsColumns || []).map((column) => [column.key, ""]));
}

export function emptyEdition(game = "", structureId) {
  const format = formatForGame(game, structureId);
  return {
    year: "",
    season: "",
    event: "",
    prizePool: "",
    champion: "",
    runnerUp: "",
    third: "",
    mvp: "",
    bestIgl: "",
    fanFavourite: "",
    earlyExits: "",
    lostComposure: "",
    madeItLookEasy: "",
    clutchesAndRivalries: "",
    totalTeams: "",
    formatNotes: "",
    eventScope: "ewc",
    structureId: format.id,
    stages: format.stages.map((name) => ({ name, teams: "", kickedOff: "" })),
    finalsTable: [emptyFinalsRow(format)],
    payouts: [{ rank: "1st (Champion)", team: "", player: "", prize: "" }],
  };
}

export function normalizeEdition(edition = {}, game = "") {
  const format = formatForGame(game, edition.structureId);
  const payouts = edition.payouts || [];
  const highlights = edition.highlights || {};
  const first = payoutByPrefix(payouts, "1st");
  const second = payoutByPrefix(payouts, "2nd");
  const third = payoutByPrefix(payouts, "3rd") || payoutByPrefix(payouts, "3rd–4th") || payoutByPrefix(payouts, "3rd-4th");
  return {
    ...emptyEdition(game),
    ...edition,
    season: edition.season || String(edition.year || ""),
    champion: edition.champion || payoutName(first),
    runnerUp: edition.runnerUp || payoutName(second),
    third: edition.third || payoutName(third),
    mvp: edition.mvp || "",
    bestIgl: edition.bestIgl || "",
    fanFavourite: edition.fanFavourite || "",
    earlyExits: edition.earlyExits || highlights.droppedOut || "",
    lostComposure: edition.lostComposure || highlights.lostComposure || "",
    madeItLookEasy: edition.madeItLookEasy || highlights.madeItLookEasy || "",
    clutchesAndRivalries: edition.clutchesAndRivalries || highlights.clutchesAndRivalries || "",
    totalTeams: inferTotalTeams(edition),
    formatNotes: edition.formatNotes || "",
    eventScope: edition.eventScope || (/ewc|esports world cup|gamers8|riyadh masters/i.test(edition.event || "") ? "ewc" : "random"),
    structureId: edition.structureId || format.id,
    stages: stagesFromPayouts(edition, format),
    finalsTable: edition.finalsTable?.length ? edition.finalsTable : [emptyFinalsRow(format)],
    payouts: payouts.length ? payouts : emptyEdition(game).payouts,
  };
}

export function serializeEdition(edition, game = "") {
  const next = normalizeEdition(edition, game);
  return {
    ...next,
    highlights: {
      madeItLookEasy: next.madeItLookEasy,
      clutchesAndRivalries: next.clutchesAndRivalries,
      lostComposure: next.lostComposure,
      droppedOut: next.earlyExits,
    },
    payouts: (next.payouts || []).filter((row) => row.rank || row.team || row.player || row.prize),
    stages: (next.stages || []).filter((row) => row.name || row.kickedOff || row.teams),
    finalsTable: (next.finalsTable || []).filter((row) => Object.values(row).some((value) => String(value || "").trim())),
  };
}
