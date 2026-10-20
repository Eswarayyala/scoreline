import { ESPORTS_RESEARCH } from "./esportsResearch";

/** @deprecated Kept for older records that still store the combined label. */
export const PUBG_FAMILY_LABEL = "PUBG / PUBG Mobile";

/** Distinct PUBG titles shown in filters and desks. */
export const PUBG_TITLES = ["PUBG", "PUBG Mobile", "BGMI", "PUBG PC"];

export const PUBG_FAMILY_ALIASES = [
  "PUBG",
  "PUBG: Battlegrounds",
  "PUBG Mobile",
  "PUBG Mobile (PMWC)",
  "PUBG Mobile (BGMI)",
  "PUBG PC",
  "BGMI",
  "BGMI and PUBG Mobile",
  PUBG_FAMILY_LABEL,
];

const PRESET_GAMES = [
  "Valorant",
  "League of Legends",
  "CS2",
  "Dota 2",
  "Overwatch 2",
  "Rocket League",
  "Apex Legends",
  ...PUBG_TITLES,
  "Mobile Legends: Bang Bang",
  "Free Fire",
  "Call of Duty",
  "Fortnite",
  "Rainbow Six Siege",
  "Honor of Kings",
  "Clash Royale",
  "Brawl Stars",
  "StarCraft 2",
  "Teamfight Tactics",
];

const VAULT_EXTRA_GAMES = [
  "Street Fighter 6",
  "Tekken 8",
  "EA Sports FC",
  "Rennsport",
  "Crossfire",
  "Standoff 2",
  "Trackmania",
  "Chess",
  "Chess (EWC Invitational)",
  "StarCraft II",
  "Fatal Fury",
  "Sim Racing",
];

/** Aliases that should collapse to a single desk / filter label. */
const GAME_ALIASES = {
  "chess (ewc invitational)": "Chess",
  "starcraft 2": "StarCraft II",
  "starcraft ii": "StarCraft II",
  "pubg: battlegrounds": "PUBG",
  "pubg mobile (pmwc)": "PUBG Mobile",
  "pubg mobile (bgmi)": "BGMI",
  "bgmi and pubg mobile": "BGMI",
  "pubg / pubg mobile": "PUBG Mobile",
};

export function isPubgFamily(game = "") {
  const raw = String(game || "").trim().toLowerCase();
  if (!raw) return false;
  if (PUBG_TITLES.some((title) => title.toLowerCase() === raw)) return true;
  if (raw === PUBG_FAMILY_LABEL.toLowerCase()) return true;
  if (PUBG_FAMILY_ALIASES.some((alias) => alias.toLowerCase() === raw)) return true;
  return /\bpubg\b/.test(raw) || /\bbgmi\b/.test(raw) || /\bbattlegrounds\b/.test(raw) || /\bpmwc\b/.test(raw);
}

/** Map aliases to their display title — PUBG titles stay separate. */
export function canonicalFilterGame(game = "") {
  const raw = String(game || "").trim();
  if (!raw) return "";
  const alias = GAME_ALIASES[raw.toLowerCase()];
  if (alias) return alias;
  if (PUBG_TITLES.some((title) => title.toLowerCase() === raw.toLowerCase())) {
    return PUBG_TITLES.find((title) => title.toLowerCase() === raw.toLowerCase());
  }
  return raw;
}

export function filterGameAliases(game = "") {
  const canonical = canonicalFilterGame(game);
  if (!canonical) return [];
  if (canonical === "PUBG") return ["PUBG", "PUBG: Battlegrounds"];
  if (canonical === "PUBG Mobile") return ["PUBG Mobile", "PUBG Mobile (PMWC)", PUBG_FAMILY_LABEL];
  if (canonical === "BGMI") return ["BGMI", "PUBG Mobile (BGMI)", "BGMI and PUBG Mobile"];
  if (canonical === "PUBG PC") return ["PUBG PC"];
  return [canonical];
}

export function gameMatchesFilter(slideGame, filterGame) {
  if (!filterGame || filterGame === "all") return true;
  return canonicalFilterGame(slideGame) === canonicalFilterGame(filterGame);
}

function uniqueGames(list = []) {
  const seen = new Set();
  const next = [];
  list.forEach((name) => {
    const game = canonicalFilterGame(name);
    if (!game) return;
    const key = game.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    next.push(game);
  });
  return next;
}

export function researchCatalogGames() {
  return uniqueGames(ESPORTS_RESEARCH.map((item) => item.game));
}

export function buildFilterGames(extra = []) {
  const core = uniqueGames([
    ...PRESET_GAMES,
    ...researchCatalogGames(),
    ...VAULT_EXTRA_GAMES,
    ...extra,
  ]);
  return [...core.filter((game) => game !== "Other" && game !== PUBG_FAMILY_LABEL), "Other"];
}

export const FILTER_GAMES = buildFilterGames();
