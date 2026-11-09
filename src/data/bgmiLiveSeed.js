import { bannerForGame } from "./platformShowcase";
import liveSnapshot from "./bgmiStandingsStaging/bmic-2026-live.json";

export const BGMI_LIVE_EVENT_ID = "live-bmic-2026";
export const BMIC_PUBG_MOBILE_EVENT_ID = "bmic-2026-pubg-mobile";

const BRIEF =
  liveSnapshot.brief ||
  "Nongshim RedForce won BMIC after 18 matches (233 pts, 5 WWCD). Korea swept 1–3; Gladiators led India in 4th.";

const AWARDS = liveSnapshot.awards || {};

function standingsRows() {
  return [...(liveSnapshot.standings || [])].sort((a, b) => Number(a.rank) - Number(b.rank));
}

function pointsTableFromRows(rows) {
  return rows.map((row) => ({
    group: String(row.rank),
    team: row.country ? `${row.team} (${row.country})` : row.team,
    points: String(row.total_points),
    wins: String(row.wwcd),
    finish: String(row.finish_points),
    placement: String(row.placement_points),
  }));
}

function awardFields() {
  return {
    winners: "Nongshim RedForce (South Korea)",
    runnerUps: "Kiwoom DRX (South Korea)",
    secondRunnerUps: "Dplus KIA (South Korea)",
    mvp: AWARDS.mvp || "XZY1 (Nongshim RedForce) — 45 finishes",
    bestIgl: AWARDS.bestIgl || "SOEZ (Nongshim RedForce)",
    bestClutches: AWARDS.bestClutch || "Taurus (K9 Esports)",
    fanFavourite: AWARDS.grenadier ? `The Grenadier · ${AWARDS.grenadier}` : "The Grenadier · XZY1 (Nongshim RedForce)",
    extraHighlights: [
      { game: "BGMI", milestone: "Best clutch · Taurus (K9) — multi-elim survival vs KR / regional pressure" },
      { game: "BGMI", milestone: "XZY1 swept Tournament MVP (45 finishes) + The Grenadier" },
      { game: "BGMI", milestone: "SOEZ Best IGL — 5 WWCD rotations for Nongshim RedForce" },
      { game: "BGMI", milestone: "India best: Gladiators 4th · Outrage 5th · K9 6th" },
    ],
  };
}

/** Circuit CMS vault window for BMIC (BGMI / tournament slot). */
export function seedBgmiLiveRecords() {
  const rows = standingsRows();
  const leader = rows[0];
  const snapshot = liveSnapshot.snapshot || "Final · After 18 matches";
  const awards = awardFields();
  return [
    {
      id: BGMI_LIVE_EVENT_ID,
      surface: "vault",
      eventStatus: "completed",
      slug: "bmic-2026-live",
      title: liveSnapshot.event || "BGMI International Cup (BMIC) 2026",
      game: "BGMI",
      kicker: "BMIC · Final after 18",
      summary: BRIEF,
      poster: bannerForGame("BGMI"),
      posterSource: "preset",
      season: "2026",
      eventScope: "international",
      region: "International",
      activeStage: "Grand Final",
      liveEmbedUrl: "",
      liveSnapshot: snapshot,
      floating: true,
      floatingPriority: 97,
      enabled: true,
      inFilters: true,
      source: "bgmi_live_seed",
      windowKey: "bmic-bgmi",
      ...awards,
      pointsTable: pointsTableFromRows(rows),
      relatedTournaments: [
        { year: "2026", name: "BMIC Champion", region: "South Korea", result: leader?.team || "Nongshim RedForce" },
        { year: "2026", name: "India best finish", region: "India", result: "Gladiators Esports · 4th" },
      ],
      updatedAt: Date.now(),
    },
  ];
}

/**
 * Twin PUBG Mobile vault window for the same BMIC finale.
 * Separate id/slug/game so home/filter rails never merge it with the BGMI BMIC card.
 */
export function seedBmicPubgMobileRecords() {
  const rows = standingsRows();
  const awards = awardFields();
  return [
    {
      id: BMIC_PUBG_MOBILE_EVENT_ID,
      surface: "vault",
      // Separate window under PUBG Mobile — never shares id/slug/game with the BGMI BMIC card.
      eventStatus: "completed",
      slug: "bmic-2026-pubg-mobile",
      title: "BMIC 2026 · PUBG Mobile desk",
      game: "PUBG Mobile",
      kicker: "PUBG Mobile · BMIC final",
      summary: `${BRIEF} Filed on the PUBG Mobile desk so BGMI and PUBG Mobile filters each keep their own window.`,
      poster: bannerForGame("PUBG Mobile"),
      posterSource: "preset",
      season: "2026",
      eventScope: "international",
      region: "International",
      activeStage: "Grand Final",
      liveEmbedUrl: "",
      liveSnapshot: liveSnapshot.snapshot || "Final · After 18 matches",
      floating: true,
      floatingPriority: 96,
      enabled: true,
      inFilters: true,
      source: "bmic_pubg_mobile_seed",
      windowKey: "bmic-pubg-mobile",
      ...awards,
      pointsTable: pointsTableFromRows(rows),
      relatedTournaments: [
        { year: "2026", name: "BMIC Champion", region: "South Korea", result: "Nongshim RedForce" },
        { year: "2026", name: "Best Clutch", region: "India", result: "Taurus · K9 Esports" },
      ],
      updatedAt: Date.now(),
    },
  ];
}
