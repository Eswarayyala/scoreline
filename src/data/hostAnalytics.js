/** Client-side host desk metrics from tournaments + optional registration counts. */

function isPast(item) {
  return item?.archived === true || item?.status === "completed" || item?.status === "closed";
}

export function rollupHostAnalytics(tournaments = [], hostUid) {
  const hosted = tournaments.filter((item) => item.adminUserId === hostUid);
  const completed = hosted.filter((item) => isPast(item));
  const live = hosted.filter((item) => !isPast(item));
  const withResults = completed.filter((item) => item?.results?.winner);
  const withStandings = hosted.filter((item) => Array.isArray(item.standings) && item.standings.length > 0);
  const publicCount = hosted.filter((item) => String(item.joinMode) === "open").length;
  const paidCount = hosted.filter((item) => Number(item.prizeAmount) > 0).length;
  const published = hosted.filter((item) => item.published === true).length;
  const slots = hosted.reduce((sum, item) => sum + (Number(item.maxSlots) > 0 ? Number(item.maxSlots) : 0), 0);

  return {
    total: hosted.length,
    live: live.length,
    completed: completed.length,
    withResults: withResults.length,
    withStandings: withStandings.length,
    publicCount,
    paidCount,
    published,
    slotsListed: slots,
    completionRate: hosted.length ? Math.round((completed.length / hosted.length) * 100) : 0,
    resultsRate: completed.length ? Math.round((withResults.length / completed.length) * 100) : 0,
  };
}

export function formatHostAnalyticsLine(stats) {
  if (!stats?.total) return "No scrims hosted yet";
  return `${stats.live} live · ${stats.completed} past · ${stats.resultsRate}% results posted`;
}
