import { bannerForGame } from "./platformShowcase";
import liveSnapshot from "./bgmiStandingsStaging/bmic-2026-live.json";

export const BGMI_LIVE_EVENT_ID = "live-bmic-2026";

/** Circuit CMS vault window for the live BMIC / present BGIS desk. */
export function seedBgmiLiveRecords() {
  const rows = [...(liveSnapshot.standings || [])].sort((a, b) => Number(a.rank) - Number(b.rank));
  const leader = rows[0];
  const snapshot = liveSnapshot.snapshot || "Live";
  return [
    {
      id: BGMI_LIVE_EVENT_ID,
      surface: "vault",
      eventStatus: "live",
      slug: "bmic-2026-live",
      title: liveSnapshot.event || "BMIC 2026",
      game: liveSnapshot.game || "BGMI",
      kicker: "Live · present BGIS",
      summary: [
        snapshot,
        leader ? `#1 ${leader.team} · ${leader.total_points} pts` : null,
        `${rows.length} teams in lobby`,
      ]
        .filter(Boolean)
        .join(" · "),
      poster: bannerForGame("BGMI"),
      posterSource: "preset",
      season: "2026",
      eventScope: "region",
      region: "India",
      activeStage: "Grand Final",
      liveEmbedUrl: "",
      floating: true,
      floatingPriority: 96,
      enabled: true,
      inFilters: true,
      source: "bgmi_live_seed",
      liveSnapshot: snapshot,
      pointsTable: rows.map((row) => ({
        group: String(row.rank),
        team: row.team,
        points: String(row.total_points),
        wins: String(row.wwcd),
        finish: String(row.finish_points),
        placement: String(row.placement_points),
      })),
      updatedAt: Date.now(),
    },
  ];
}
