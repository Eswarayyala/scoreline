import { canonicalFilterGame } from "./gameCatalog";
import { GENERATED_PACKS, generatedPackName, generatedAssetPath } from "./generatedGameArt";
import { slugMedia } from "./mediaCollections";
import { bannerForGame, packBackgroundForGame, packPosterForGame } from "./platformShowcase";

/**
 * Per-title visual language for game desks.
 * Accents lean into each title’s circuit identity — not the site neon default.
 */
const GAME_THEMES = {
  Valorant: {
    accent: "#ff4655",
    accentSecondary: "#ece8e1",
    ink: "#0f1923",
    glow: "rgba(255, 70, 85, 0.42)",
    mood: "Tactical FPS",
    headline: "Plant. Retake. Close.",
    tagline: "Agent utility, site executes, and ranked grind on one desk.",
  },
  "League of Legends": {
    accent: "#c8aa6e",
    accentSecondary: "#0ac8b9",
    ink: "#0a1428",
    glow: "rgba(200, 170, 110, 0.38)",
    mood: "MOBA",
    headline: "One nexus. Five roles.",
    tagline: "Lanes, objectives, and Worlds-era history under one banner.",
  },
  CS2: {
    accent: "#de9b35",
    accentSecondary: "#f3f3f3",
    ink: "#121212",
    glow: "rgba(222, 155, 53, 0.4)",
    mood: "Competitive FPS",
    headline: "Economy. Utility. Clutch.",
    tagline: "Majors energy — maps, buys, and scrim windows for Counter-Strike.",
  },
  "Dota 2": {
    accent: "#c23c2a",
    accentSecondary: "#e8c38a",
    ink: "#0c0a08",
    glow: "rgba(194, 60, 42, 0.4)",
    mood: "MOBA",
    headline: "Draft deep. Farm harder.",
    tagline: "Ancient siege, TI lore, and high-skill pub-to-pro grind.",
  },
  "Apex Legends": {
    accent: "#da292a",
    accentSecondary: "#efefe9",
    ink: "#141414",
    glow: "rgba(218, 41, 42, 0.4)",
    mood: "Battle Royale",
    headline: "Drop hot. Rotate smarter.",
    tagline: "Legends, rings, and ALGS-ready squad lookouts.",
  },
  "Overwatch 2": {
    accent: "#f99e1a",
    accentSecondary: "#218ffe",
    ink: "#1b1d21",
    glow: "rgba(249, 158, 26, 0.38)",
    mood: "Hero shooter",
    headline: "Push. Hybrid. Control.",
    tagline: "Role lock energy and hero swaps for ranked and scrims.",
  },
  "Rocket League": {
    accent: "#3b9dff",
    accentSecondary: "#ff9f1a",
    ink: "#0b1220",
    glow: "rgba(59, 157, 255, 0.4)",
    mood: "Sports",
    headline: "Aerials over everything.",
    tagline: "Boost paths, kickoffs, and 3s grind windows.",
  },
  PUBG: {
    accent: "#f2a900",
    accentSecondary: "#c4d0c0",
    ink: "#1a1c16",
    glow: "rgba(242, 169, 0, 0.35)",
    mood: "Battle Royale",
    headline: "Loot. Zone. Survive.",
    tagline: "PC battlegrounds desk for squads and circuit nights.",
  },
  BGMI: {
    accent: "#f5b400",
    accentSecondary: "#7dffb3",
    ink: "#10160f",
    glow: "rgba(245, 180, 0, 0.38)",
    mood: "Mobile BR",
    headline: "Drop India. Hold zone.",
    tagline: "BGMI flyers, hosts, and mobile squad lookouts.",
  },
  "Mobile Legends: Bang Bang": {
    accent: "#e8b84a",
    accentSecondary: "#2ee6d6",
    ink: "#0d1520",
    glow: "rgba(232, 184, 74, 0.38)",
    mood: "Mobile MOBA",
    headline: "Five man. Fast fights.",
    tagline: "Roam paths, lord timers, and MLBB scrim desks.",
  },
  "Free Fire": {
    accent: "#ff6a00",
    accentSecondary: "#ffe566",
    ink: "#140c08",
    glow: "rgba(255, 106, 0, 0.42)",
    mood: "Mobile BR",
    headline: "Loadout. Rush. Reset.",
    tagline: "Short-match heat for Free Fire nights and hosts.",
  },
  Fortnite: {
    accent: "#1de0ff",
    accentSecondary: "#ffe14a",
    ink: "#0a1630",
    glow: "rgba(29, 224, 255, 0.38)",
    mood: "Battle Royale",
    headline: "Build. Edit. Endgame.",
    tagline: "Creative energy and competitive Fortnite windows.",
  },
  "Call of Duty": {
    accent: "#6bff4d",
    accentSecondary: "#d0d0d0",
    ink: "#0e1210",
    glow: "rgba(107, 255, 77, 0.32)",
    mood: "FPS",
    headline: "Hardpoint. Search. Control.",
    tagline: "CDL-flavored desk for ranked and custom rooms.",
  },
  "Rainbow Six Siege": {
    accent: "#f5c518",
    accentSecondary: "#9aa4b2",
    ink: "#10141c",
    glow: "rgba(245, 197, 24, 0.35)",
    mood: "Tactical FPS",
    headline: "Breach. Hold. Diffuser.",
    tagline: "Operator dens and Siege scrim lookouts.",
  },
  "Honor of Kings": {
    accent: "#d4a017",
    accentSecondary: "#5ad1ff",
    ink: "#0c1220",
    glow: "rgba(212, 160, 23, 0.36)",
    mood: "Mobile MOBA",
    headline: "Lane pressure. Dragon tempo.",
    tagline: "HoK circuit desk with title-side art.",
  },
  "Clash Royale": {
    accent: "#3d8bfd",
    accentSecondary: "#ffd34e",
    ink: "#0b1528",
    glow: "rgba(61, 139, 253, 0.36)",
    mood: "Strategy",
    headline: "Elixir timing wins.",
    tagline: "Ladder and challenge nights on a Royale-tinted desk.",
  },
  "Brawl Stars": {
    accent: "#ffcc00",
    accentSecondary: "#ff4d6d",
    ink: "#121018",
    glow: "rgba(255, 204, 0, 0.36)",
    mood: "Mobile arena",
    headline: "Three lanes. Fast fights.",
    tagline: "Brawler picks and short-queue energy.",
  },
  "StarCraft II": {
    accent: "#3aa0ff",
    accentSecondary: "#e8b84a",
    ink: "#070b14",
    glow: "rgba(58, 160, 255, 0.36)",
    mood: "RTS",
    headline: "Macro. Scout. Commit.",
    tagline: "Ladder and exhibition windows for SC2.",
  },
  "Teamfight Tactics": {
    accent: "#d4af37",
    accentSecondary: "#7ec8ff",
    ink: "#0c1020",
    glow: "rgba(212, 175, 55, 0.34)",
    mood: "Auto battler",
    headline: "Roll. Cap. Augment.",
    tagline: "Set metas and TFT grind desks.",
  },
  "Street Fighter 6": {
    accent: "#e63946",
    accentSecondary: "#f4f1de",
    ink: "#140a0c",
    glow: "rgba(230, 57, 70, 0.38)",
    mood: "Fighter",
    headline: "Drive rush. Punish.",
    tagline: "Bracket nights with SF6 heat.",
  },
  "Tekken 8": {
    accent: "#ff3b3b",
    accentSecondary: "#ececec",
    ink: "#100808",
    glow: "rgba(255, 59, 59, 0.38)",
    mood: "Fighter",
    headline: "Heat dash. Wall carry.",
    tagline: "Tekken labs and local bracket desks.",
  },
  "EA Sports FC": {
    accent: "#00ff87",
    accentSecondary: "#e8e8e8",
    ink: "#061018",
    glow: "rgba(0, 255, 135, 0.32)",
    mood: "Sports",
    headline: "Build. Press. Finish.",
    tagline: "FC clubs and weekend cup windows.",
  },
  Rennsport: {
    accent: "#ff4d1a",
    accentSecondary: "#d0d6e0",
    ink: "#0c0e12",
    glow: "rgba(255, 77, 26, 0.36)",
    mood: "Sim racing",
    headline: "Apex late. Exit clean.",
    tagline: "Grid nights for Rennsport and sim desks.",
  },
  Trackmania: {
    accent: "#00c2ff",
    accentSecondary: "#ff7a18",
    ink: "#071018",
    glow: "rgba(0, 194, 255, 0.36)",
    mood: "Racing",
    headline: "Hunt the ghost.",
    tagline: "Campaign maps and Trackmania lobbies.",
  },
  Chess: {
    accent: "#e8d5a3",
    accentSecondary: "#8fa3bf",
    ink: "#12141a",
    glow: "rgba(232, 213, 163, 0.32)",
    mood: "Board",
    headline: "Calculate. Commit.",
    tagline: "Rapid and invitational chess windows.",
  },
  "Fatal Fury": {
    accent: "#ff5a1f",
    accentSecondary: "#f0e6d8",
    ink: "#140c08",
    glow: "rgba(255, 90, 31, 0.38)",
    mood: "Fighter",
    headline: "Southtown heat.",
    tagline: "Fatal Fury brackets with neon-orange flare.",
  },
  Crossfire: {
    accent: "#ffb000",
    accentSecondary: "#b8c0cc",
    ink: "#101218",
    glow: "rgba(255, 176, 0, 0.34)",
    mood: "FPS",
    headline: "Bomb site pressure.",
    tagline: "Crossfire scrim and flyer desks.",
  },
  "Standoff 2": {
    accent: "#ff5c33",
    accentSecondary: "#c9d2e0",
    ink: "#0e1218",
    glow: "rgba(255, 92, 51, 0.36)",
    mood: "Mobile FPS",
    headline: "Mobile majors energy.",
    tagline: "Standoff 2 lobbies and ranked lookouts.",
  },
};

function hashHue(value = "") {
  let hash = 0;
  const raw = String(value);
  for (let i = 0; i < raw.length; i += 1) hash = (hash * 31 + raw.charCodeAt(i)) >>> 0;
  return hash % 360;
}

function deriveTheme(game = "") {
  const hue = hashHue(game);
  const accent = `hsl(${hue} 78% 58%)`;
  const accentSecondary = `hsl(${(hue + 40) % 360} 70% 72%)`;
  return {
    accent,
    accentSecondary,
    ink: "#0a0e16",
    glow: `hsla(${hue}, 78%, 58%, 0.36)`,
    mood: "Circuit",
    headline: "Own the desk.",
    tagline: `${game} windows, flyers, and scrim lookouts in one place.`,
  };
}

export function themedGames() {
  return [...GENERATED_PACKS];
}

export function gameDeskSlug(game = "") {
  return slugMedia(generatedPackName(canonicalFilterGame(game) || game));
}

export function gameFromDeskSlug(slug = "") {
  const key = String(slug || "").toLowerCase();
  return themedGames().find((game) => gameDeskSlug(game) === key) || "";
}

export function gameDeskPath(game = "") {
  const slug = gameDeskSlug(game);
  return slug ? `/games/${slug}` : "/games";
}

export function themeForGame(game = "") {
  const pack = generatedPackName(canonicalFilterGame(game) || game);
  const base = GAME_THEMES[pack] || deriveTheme(pack || "Game");
  const background =
    packBackgroundForGame(pack, 1)
    || packBackgroundForGame(pack, 2)
    || packPosterForGame(pack, 1)
    || bannerForGame(pack);
  const poster = packPosterForGame(pack, 1) || bannerForGame(pack);
  const avatar = generatedAssetPath(pack, "avatar", 1);

  return {
    game: pack || canonicalFilterGame(game) || game || "Game",
    slug: gameDeskSlug(pack || game),
    ...base,
    background,
    poster,
    avatar,
    cssVars: {
      "--game-accent": base.accent,
      "--game-accent-secondary": base.accentSecondary,
      "--game-ink": base.ink,
      "--game-glow": base.glow,
      "--accent": base.accent,
      "--accent-secondary": base.accentSecondary,
      "--color-neon": base.accent,
    },
  };
}

export function allGameThemes() {
  return themedGames().map((game) => themeForGame(game));
}
