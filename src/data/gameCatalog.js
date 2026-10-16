import { ESPORTS_RESEARCH } from "./esportsResearch";

const PRESET_GAMES = [
  "Valorant",
  "League of Legends",
  "CS2",
  "Dota 2",
  "Overwatch 2",
  "Rocket League",
  "Apex Legends",
  "BGMI",
  "PUBG Mobile",
  "PUBG PC",
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
  "PUBG",
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

function uniqueGames(list = []) {
  const seen = new Set();
  const next = [];
  list.forEach((name) => {
    const game = String(name || "").trim();
    if (!game || seen.has(game.toLowerCase())) return;
    seen.add(game.toLowerCase());
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
