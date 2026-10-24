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
  BGMI: "PUBG",
  "PUBG PC": "PUBG",
  "Counter-Strike 2": "CS2",
  "Counter-Strike": "CS2",
  "CS:GO": "CS2",
  CSGO: "CS2",
};

export function generatedPackName(game) {
  return PACK_ALIAS[game] || game;
}

export function generatedAssetPath(game, kind, index) {
  const pack = generatedPackName(game);
  return `/media/generated/${slugMedia(pack)}/${kind}-${index}.jpg`;
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
      title: `${game} · ${kind.label} · generated`,
      defaultUrl: assets[0].url,
      coverUrl: assets[0].url,
      seeded: true,
      generated: true,
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
