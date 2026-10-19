import { ESPORTS_RESEARCH } from "./esportsResearch";

/** Single filter label for all PUBG / PUBG Mobile / PMWC / BGMI variants. */
export const PUBG_FAMILY_LABEL = "PUBG / PUBG Mobile";

export const PUBG_FAMILY_ALIASES = [
  "PUBG",
  "PUBG: Battlegrounds",
  "PUBG Mobile",
  "PUBG Mobile (PMWC)",
  "PUBG Mobile (BGMI)",
  "PUBG PC",
  "BGMI",
  "BGMI and PUBG Mobile",
];

const PRESET_GAMES = [
  "Valorant",
  "League of Legends",
  "CS2",
  "Dota 2",
  "Overwatch 2",
  "Rocket League",
  "Apex Legends",
  PUBG_FAMILY_LABEL,
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
  "StarCraft II",
  "Fatal Fury",
  "Sim Racing",
];

export function isPubgFamily(game = "") {
  const raw = String(game || "").trim().toLowerCase();
  if (!raw) return false;
  if (raw === PUBG_FAMILY_LABEL.toLowerCase()) return true;
  if (PUBG_FAMILY_ALIASES.some((alias) => alias.toLowerCase() === raw)) return true;
  return /\bpubg\b/.test(raw) || /\bbgmi\b/.test(raw) || /\bbattlegrounds\b/.test(raw) || /\bpmwc\b/.test(raw);
}

/** Collapse PUBG variants to one catalog / filter label. */
export function canonicalFilterGame(game = "") {
  const raw = String(game || "").trim();
  if (!raw) return "";
  if (isPubgFamily(raw)) return PUBG_FAMILY_LABEL;
  return raw;
}

export function filterGameAliases(game = "") {
  const canonical = canonicalFilterGame(game);
  if (canonical === PUBG_FAMILY_LABEL) return [...PUBG_FAMILY_ALIASES, PUBG_FAMILY_LABEL];
  return canonical ? [canonical] : [];
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
  return [...core.filter((game) => game !== "Other"), "Other"];
}

export const FILTER_GAMES = buildFilterGames();
