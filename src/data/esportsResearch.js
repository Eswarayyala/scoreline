import { bannerForGame } from "./platformShowcase";
import { isEwcEdition } from "./eventScope";
import { normalizeEdition } from "./vaultDeskSchema";
import { ESPORTS_RESEARCH } from "./vaultResearchSeed";

export { ESPORTS_RESEARCH };

const HIGHLIGHT_LABELS = [
  ["madeItLookEasy", "Made it look easy"],
  ["clutchesAndRivalries", "Clutches and rivalries"],
  ["lostComposure", "Lost composure"],
  ["droppedOut", "Dropped out"],
];

export function researchHighlightLabels() {
  return HIGHLIGHT_LABELS;
}

export function editionsNewestFirst(editions = []) {
  return [...editions].sort((a, b) => Number(b.year) - Number(a.year));
}

export function yearlyStatsFromEditions(editions = []) {
  const byYear = new Map();
  editionsNewestFirst(editions).forEach((edition) => {
    const year = edition.year;
    const region = /paris/i.test(edition.event || "") ? "Europe" : /riyadh|gamers8/i.test(edition.event || "") ? "Middle East" : "Global";
    const current = byYear.get(year) || { year, tournamentCount: 0, circuit: "", region };
    current.tournamentCount += 1;
    if (!current.circuit) current.circuit = edition.event || "";
    byYear.set(year, current);
  });
  return [...byYear.values()];
}

function slideScope(editions = []) {
  const scopes = [...new Set(editions.map((edition) => edition.eventScope).filter(Boolean))];
  if (scopes.length === 1) return scopes[0];
  return "";
}

export function flattenEwcEditions(slides = []) {
  return slides.flatMap((slide) =>
    editionsNewestFirst(slide.editions || [])
      .filter((edition) => isEwcEdition(edition))
      .map((edition) => ({
        ...edition,
        eventScope: "ewc",
        game: slide.game,
        slug: slide.slug,
        dossier: slide.title,
        peakPrizePool: slide.peakPrizePool,
      })),
  ).sort((a, b) => Number(b.year) - Number(a.year) || String(a.game).localeCompare(String(b.game)));
}

export function groupEwcChampionships(editions = []) {
  const groups = new Map();
  editions.forEach((edition) => {
    const year = String(edition.year || "");
    const place = /paris/i.test(edition.event || "") ? "Paris" : /riyadh|gamers8/i.test(edition.event || "") ? "Riyadh" : "";
    const family = /gamers8/i.test(edition.event || "") ? "Gamers8" : "Esports World Cup";
    const key = `${year}|${family}|${place}`;
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        year,
        title: [family, year, place && `(${place})`].filter(Boolean).join(" "),
        games: [],
      });
    }
    groups.get(key).games.push(edition);
  });
  return [...groups.values()]
    .sort((a, b) => Number(b.year) - Number(a.year) || String(a.title).localeCompare(String(b.title)))
    .map((group) => ({
      ...group,
      games: [...group.games].sort((a, b) => String(a.game).localeCompare(String(b.game))),
    }));
}

export function ewcFloatingSlides(slides = []) {
  return groupEwcChampionships(flattenEwcEditions(slides)).map((group, index) => ({
    slug: `ewc-year-${String(group.key).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
    title: group.title,
    game: "Esports World Cup",
    kicker: "EWC",
    eventScope: "ewc",
    surface: "ewc-window",
    floating: true,
    season: group.year,
    summary: `${group.games.length} titles in this championship.`,
    poster: bannerForGame(group.games[0]?.game),
    championship: group,
    floatingPriority: 80 - index,
  }));
}

export function seedResearchCmsRecords() {
  return researchVaultSlides().map((slide) => ({
    ...slide,
    id: slide.slug,
    surface: "research",
    research: true,
    floatingPriority: 0,
    region: "Global",
    yearlyStats: yearlyStatsFromEditions(slide.editions),
    relatedTournaments: [],
  }));
}

export function researchVaultSlides() {
  return [...ESPORTS_RESEARCH]
    .map((game) => {
      const editions = editionsNewestFirst(game.editions).map((edition) => normalizeEdition(edition, game.game));
      const latest = editions[0];
      const oldest = editions[editions.length - 1];
      const top = (rankPrefix) => {
        const row = latest?.payouts?.find((item) => String(item.rank).startsWith(rankPrefix));
        return row?.team || row?.player || "";
      };
      const firstYear = oldest?.year;
      const lastYear = latest?.year;
      return {
        slug: `research-${game.id}`,
        title: game.game,
        game: game.game,
        kicker: "Championship research",
        season: firstYear === lastYear ? String(lastYear || "") : `${lastYear || ""}–${firstYear || ""}`,
        summary: game.overview,
        poster: bannerForGame(game.game),
        eventStatus: "completed",
        surface: "research",
        research: true,
        eventScope: slideScope(editions),
        genre: game.genre,
        type: game.type,
        peakPrizePool: game.peakPrizePool,
        fullName: game.fullName,
        editions,
        winners: top("1st"),
        runnerUps: top("2nd"),
      };
    })
    .sort((a, b) => Number(b.editions[0]?.year || 0) - Number(a.editions[0]?.year || 0));
}
