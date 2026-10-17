import { FILTER_GAMES } from "./gameCatalog";
import { flyersForGame } from "./platformShowcase";

const FLYER_LABELS = ["Flyer A", "Flyer B", "Flyer C", "Flyer D", "Flyer E", "Flyer F"];

export const POSTER_PRESETS = FILTER_GAMES.flatMap((game) =>
  flyersForGame(game)
    .slice(0, 3)
    .map((src, index) => ({
      id: `${game}-${index}`,
      game,
      label: `${game} · ${FLYER_LABELS[index] || `Flyer ${index + 1}`}`,
      src,
    })),
);

export const CMS_GAMES = FILTER_GAMES;

export const EVENT_STAGES = [
  "Group Stage",
  "Qualifiers",
  "Survival Stage",
  "Quarter-Finals",
  "Semi-Finals",
  "Grand Final",
];
