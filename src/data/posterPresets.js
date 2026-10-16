import { FILTER_GAMES } from "./gameCatalog";
import { GAME_BANNERS } from "./platformShowcase";

export const POSTER_PRESETS = [
  { id: "val-1", game: "Valorant", label: "Valorant neon desk", src: GAME_BANNERS.Valorant },
  { id: "val-2", game: "Valorant", label: "Tactical night", src: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1400&q=80" },
  { id: "cs-1", game: "CS2", label: "CS2 arena", src: GAME_BANNERS.CS2 },
  { id: "cs-2", game: "CS2", label: "Major lights", src: "https://images.unsplash.com/photo-1574375927938-d5a150dd51b0?auto=format&fit=crop&w=1400&q=80" },
  { id: "apex-1", game: "Apex Legends", label: "ALGS ring", src: GAME_BANNERS["Apex Legends"] },
  { id: "lol-1", game: "League of Legends", label: "Worlds stage", src: GAME_BANNERS["League of Legends"] },
  { id: "lol-2", game: "League of Legends", label: "Nexus night", src: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1400&q=80" },
  { id: "dota-1", game: "Dota 2", label: "The International", src: GAME_BANNERS["Dota 2"] },
  { id: "mlbb-1", game: "Mobile Legends: Bang Bang", label: "MSC desk", src: GAME_BANNERS["Mobile Legends: Bang Bang"] },
  { id: "bgmi-1", game: "BGMI", label: "National series", src: GAME_BANNERS.BGMI },
];

export const CMS_GAMES = FILTER_GAMES;

export const EVENT_STAGES = [
  "Group Stage",
  "Qualifiers",
  "Survival Stage",
  "Quarter-Finals",
  "Semi-Finals",
  "Grand Final",
];
