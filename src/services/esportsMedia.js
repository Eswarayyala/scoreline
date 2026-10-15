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

function normalizeGameName(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  if (raw.includes("counter-strike") || raw === "cs2") return "cs2";
  if (raw.includes("pubg") || raw.includes("battlegrounds") || raw === "bgmi") return "pubg";
  if (raw.includes("league of legends")) return "league of legends";
  if (raw.includes("mobile legends")) return "mobile legends: bang bang";
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
