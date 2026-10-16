const RAWG_API_KEY = String(import.meta.env.VITE_RAWG_API_KEY || "").trim();
const RAWG_BASE = "https://api.rawg.io/api/games";

export const COMPETITIVE_GAMES = [
  { slug: "valorant", game: "Valorant" },
  { slug: "counter-strike-2", game: "CS2" },
  { slug: "league-of-legends", game: "League of Legends" },
  { slug: "apex-legends", game: "Apex Legends" },
  { slug: "pubg-battlegrounds", game: "PUBG" },
  { slug: "rocket-league", game: "Rocket League" },
  { slug: "dota-2", game: "Dota 2" },
  { slug: "fortnite", game: "Fortnite" },
];

const GAME_RAWG_SLUGS = {
  Valorant: "valorant",
  CS2: "counter-strike-2",
  "League of Legends": "league-of-legends",
  "Apex Legends": "apex-legends",
  PUBG: "pubg-battlegrounds",
  "PUBG: Battlegrounds": "pubg-battlegrounds",
  "PUBG Mobile (PMWC)": "playerunknowns-battlegrounds",
  "PUBG Mobile": "playerunknowns-battlegrounds",
  BGMI: "playerunknowns-battlegrounds",
  "Rocket League": "rocket-league",
  "Dota 2": "dota-2",
  "Dota 2 (Riyadh Masters)": "dota-2",
  Fortnite: "fortnite",
  "Overwatch 2": "overwatch-2",
  "Rainbow Six Siege": "tom-clancys-rainbow-six-siege",
  "Call of Duty": "call-of-duty-warzone",
  "Call of Duty (CDL & Warzone)": "call-of-duty-warzone",
  "Mobile Legends: Bang Bang": "mobile-legends-bang-bang",
  "Mobile Legends: Bang Bang (MLBB)": "mobile-legends-bang-bang",
  "Honor of Kings": "honor-of-kings",
  "Honor of Kings (HoK)": "honor-of-kings",
  "Free Fire": "garena-free-fire",
  "Garena Free Fire": "garena-free-fire",
  "Street Fighter 6": "street-fighter-6",
  "Tekken 8": "tekken-8",
  "EA Sports FC": "ea-sports-fc-24",
  "Teamfight Tactics": "teamfight-tactics",
  "Teamfight Tactics (TFT)": "teamfight-tactics",
  "StarCraft II": "starcraft-ii",
  "StarCraft 2": "starcraft-ii",
  "Rennsport (ESL R1)": "rennsport",
  Rennsport: "rennsport",
  Crossfire: "crossfire",
  "Standoff 2": "standoff-2",
  Trackmania: "trackmania",
  Chess: "chess",
  "Chess (EWC Invitational)": "chess",
};

export async function fetchGamePoster(game) {
  if (!RAWG_API_KEY) return "";
  const slug = GAME_RAWG_SLUGS[game];
  if (!slug) return "";
  try {
    const response = await fetch(`${RAWG_BASE}/${encodeURIComponent(slug)}?key=${encodeURIComponent(RAWG_API_KEY)}`);
    if (!response.ok) return "";
    const data = await response.json();
    return String(data.background_image || data.background_image_additional || "");
  } catch {
    return "";
  }
}

function normalizeGameName(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  if (raw.includes("counter-strike") || raw === "cs2") return "cs2";
  if (raw.includes("pubg") || raw.includes("battlegrounds") || raw === "bgmi") return "pubg";
  if (raw.includes("league of legends")) return "league of legends";
  if (raw.includes("dota")) return "dota 2";
  if (raw.includes("mobile legends")) return "mobile legends: bang bang";
  if (raw.includes("honor of kings") || raw.includes("(hok)") || raw === "hok") return "honor of kings";
  if (raw.includes("free fire")) return "free fire";
  if (raw.includes("street fighter")) return "street fighter 6";
  if (raw.includes("tekken")) return "tekken 8";
  if (raw.includes("ea sports fc") || raw.includes("fifa") || raw === "eafc") return "ea sports fc";
  if (raw.includes("teamfight tactics") || raw === "tft") return "teamfight tactics";
  if (raw.includes("starcraft")) return "starcraft ii";
  if (raw.includes("rennsport") || raw.includes("esl r1")) return "rennsport";
  if (raw.includes("crossfire")) return "crossfire";
  if (raw.includes("call of duty") || raw.includes("warzone") || raw === "cdl" || raw === "cod") return "call of duty";
  if (raw.includes("standoff")) return "standoff 2";
  if (raw.includes("trackmania")) return "trackmania";
  if (raw.includes("chess")) return "chess";
  return raw;
}

function toBanner(game, index) {
  const imageUrl = game?.background_image || game?.background_image_additional || "";
  if (!imageUrl) return null;
  const slug = String(game.slug || COMPETITIVE_GAMES[index]?.slug || `game-${index}`);
  return {
    id: `vault-live-${slug}`,
    game: COMPETITIVE_GAMES.find((item) => item.slug === slug)?.game || game.name,
    title: `${game.name} Highlights`,
    imageUrl,
    status: "live",
    routePath: `/vault/${slug}`,
    slug,
    kicker: "RAWG art",
    summary: String(game.description_raw || "").slice(0, 280),
    poster: imageUrl,
    season: "Live circuit",
    eventStatus: "live",
    surface: "vault",
    posterSource: "rawg",
  };
}

export async function fetchLiveEsportsData() {
  if (!RAWG_API_KEY) return [];
  try {
    const results = await Promise.all(
      COMPETITIVE_GAMES.map(async ({ slug }) => {
        const response = await fetch(`${RAWG_BASE}/${encodeURIComponent(slug)}?key=${encodeURIComponent(RAWG_API_KEY)}`);
        if (!response.ok) return null;
        return response.json();
      }),
    );
    return results.map((game, index) => toBanner(game, index)).filter(Boolean);
  } catch (error) {
    console.error("Error pulling live graphics from RAWG:", error);
    return [];
  }
}

export function mergeVaultMedia(slides = [], liveBanners = []) {
  const artByGame = new Map(
    liveBanners.map((banner) => [normalizeGameName(banner.game), banner.imageUrl]),
  );
  const merged = slides.map((slide) => {
    if (slide.posterSource === "upload") return slide;
    const art = artByGame.get(normalizeGameName(slide.game));
    return art ? { ...slide, poster: art, imageUrl: art } : slide;
  });
  const used = new Set(merged.map((slide) => normalizeGameName(slide.game)));
  liveBanners.forEach((banner) => {
    const key = normalizeGameName(banner.game);
    if (used.has(key)) return;
    used.add(key);
    merged.push(banner);
  });
  return merged;
}
