import { slugMedia } from "./mediaCollections";

export const GENERATED_KINDS = [
  { id: "avatar", label: "Avatar", count: 3 },
  { id: "poster", label: "Poster", count: 3 },
  { id: "background", label: "Background", count: 3 },
];

export const GENERATED_PACKS = [
  "Valorant",
  "League of Legends",
  "CS2",
  "Dota 2",
  "Apex Legends",
  "Fortnite",
  "Overwatch 2",
  "Rocket League",
  "PUBG",
  "BGMI",
  "Mobile Legends: Bang Bang",
  "Free Fire",
  "Call of Duty",
  "Rainbow Six Siege",
  "Honor of Kings",
  "Clash Royale",
  "Brawl Stars",
  "StarCraft II",
  "Teamfight Tactics",
  "Street Fighter 6",
  "Tekken 8",
  "EA Sports FC",
  "Rennsport",
  "Trackmania",
  "Chess",
  "Fatal Fury",
  "Crossfire",
  "Standoff 2",
];

const PACK_ALIAS = {
  "PUBG: Battlegrounds": "PUBG",
  "PUBG Mobile": "PUBG",
  "PUBG Mobile (PMWC)": "PUBG",
  "PUBG Mobile (BGMI)": "BGMI",
  "BGMI and PUBG Mobile": "BGMI",
  "Dota 2 (Riyadh Masters)": "Dota 2",
  "Mobile Legends: Bang Bang (MLBB)": "Mobile Legends: Bang Bang",
  "Honor of Kings (HoK)": "Honor of Kings",
  "Garena Free Fire": "Free Fire",
  "Call of Duty (CDL & Warzone)": "Call of Duty",
  "Teamfight Tactics (TFT)": "Teamfight Tactics",
  "StarCraft 2": "StarCraft II",
  "Rennsport (ESL R1)": "Rennsport",
  "Sim Racing": "Rennsport",
  "Chess (EWC Invitational)": "Chess",
  "PUBG PC": "PUBG",
  "Counter-Strike 2": "CS2",
  "Counter-Strike": "CS2",
  "CS:GO": "CS2",
  CSGO: "CS2",
};

export function generatedPackName(game) {
  return PACK_ALIAS[game] || game;
}

/** Bump when replacing pack bytes so browsers/CDN drop stale 24h media cache. */
const GENERATED_ASSET_REV = {
  valorant: "official-20261031c",
  "league-of-legends": "official-20261031c",
  cs2: "official-20261031c",
  "dota-2": "official-20261031c",
  "apex-legends": "official-20261031c",
  fortnite: "official-20261031c",
  "overwatch-2": "official-20261031c",
  "rocket-league": "official-20261031c",
  pubg: "official-20261031c",
  bgmi: "official-20261031c",
  "mobile-legends-bang-bang": "official-20261031c",
  "free-fire": "official-20261031c",
  "call-of-duty": "official-20261031c",
  "rainbow-six-siege": "official-20261031c",
  "honor-of-kings": "official-20261031c",
  "clash-royale": "official-20261031c",
  "brawl-stars": "official-20261031c",
  "starcraft-ii": "official-20261031c",
  "teamfight-tactics": "official-20261031c",
  "street-fighter-6": "official-20261031c",
  "tekken-8": "official-20261031c",
  "ea-sports-fc": "official-20261031c",
  rennsport: "official-20261031c",
  trackmania: "official-20261031c",
  chess: "official-20261031c",
  "fatal-fury": "official-20261031c",
  crossfire: "official-20261031c",
  "standoff-2": "official-20261031c",
};

export function generatedAssetPath(game, kind, index) {
  const pack = generatedPackName(game);
  const slug = slugMedia(pack);
  const base = `/media/generated/${slug}/${kind}-${index}.jpg`;
  const rev = GENERATED_ASSET_REV[slug];
  return rev ? `${base}?v=${encodeURIComponent(rev)}` : base;
}

export function generatedAssetsFor(game, kind) {
  return [1, 2, 3].map((index) => ({
    id: `${slugMedia(generatedPackName(game))}-${kind}-${index}`,
    url: generatedAssetPath(game, kind, index),
    name: `${kind}-${index}.jpg`,
    createdAt: index,
    seeded: true,
  }));
}

export function generatedCollectionsFor(game) {
  const pack = generatedPackName(game);
  return GENERATED_KINDS.map((kind) => {
    const assets = generatedAssetsFor(game, kind.id);
    return {
      id: `generated-${slugMedia(game)}-${kind.id}`,
      scope: "site",
      kind: kind.id,
      game,
      tournamentId: "",
      title: `${game} · ${kind.label} · official`,
      defaultUrl: assets[0].url,
      coverUrl: assets[0].url,
      seeded: true,
      generated: true,
      official: true,
      pack,
    };
  });
}

export function allGeneratedCollections(games = []) {
  const ready = new Set(GENERATED_PACKS);
  const names = [...new Set([...(games || []), ...GENERATED_PACKS])]
    .filter((name) => name && name !== "Other" && ready.has(generatedPackName(name)));
  return names.flatMap((game) => generatedCollectionsFor(game));
}
