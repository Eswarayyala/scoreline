import { isPublicScrim, scrimIsPaid } from "./scrimAccess";

export const SCRIM_ALERT_MODES = [
  { id: "public", label: "Public free scrims" },
  { id: "paid", label: "Paid / prize flyers" },
  { id: "both", label: "Public and paid" },
];

export const DEFAULT_SCRIM_ALERTS = {
  enabled: true,
  modes: "both",
  games: [],
  followedHosts: [],
  lastSeenAt: 0,
  browserPushOptIn: false,
  digestOptIn: false,
};

export function normalizeScrimAlerts(prefs = {}, profileGames = []) {
  const games = Array.isArray(prefs.scrimAlertGames) && prefs.scrimAlertGames.length
    ? prefs.scrimAlertGames.map(String).filter(Boolean).slice(0, 20)
    : (profileGames || []).map(String).filter(Boolean).slice(0, 20);
  const modes = ["public", "paid", "both"].includes(prefs.scrimAlertModes)
    ? prefs.scrimAlertModes
    : DEFAULT_SCRIM_ALERTS.modes;
  return {
    enabled: prefs.scrimAlertsEnabled !== false,
    modes,
    games,
    followedHosts: Array.isArray(prefs.followedHosts)
      ? prefs.followedHosts.map(String).filter(Boolean).slice(0, 80)
      : [],
    lastSeenAt: Number(prefs.scrimAlertsLastSeenAt) || 0,
    browserPushOptIn: prefs.browserPushOptIn === true,
    digestOptIn: prefs.digestOptIn === true,
  };
}

function gameKey(value = "") {
  return String(value || "").trim().toLowerCase();
}

/** Does this announcement match the viewer's alert prefs / follows? */
export function announcementMatchesViewer(announcement = {}, alerts = DEFAULT_SCRIM_ALERTS, { followingHost = false } = {}) {
  if (!announcement?.tournamentId) return false;
  if (followingHost || (alerts.followedHosts || []).includes(announcement.hostUid)) {
    if (!alerts.enabled) return followingHost;
  } else if (!alerts.enabled) {
    return false;
  }

  const games = (alerts.games || []).map(gameKey);
  if (games.length && !games.includes(gameKey(announcement.game))) {
    if (!(followingHost || (alerts.followedHosts || []).includes(announcement.hostUid))) return false;
  }

  const paid = announcement.paid === true || Number(announcement.prizeAmount) > 0;
  if (alerts.modes === "public" && paid) return false;
  if (alerts.modes === "paid" && !paid) return false;
  return isPublicScrim({ joinMode: announcement.joinMode || "open" }) || announcement.published === true;
}

export function buildScrimAnnouncement(tournament = {}, { tournamentId } = {}) {
  const id = tournamentId || tournament.id;
  return {
    tournamentId: id,
    tournamentName: String(tournament.name || "").slice(0, 120),
    game: String(tournament.game || "").slice(0, 60),
    hostUid: String(tournament.adminUserId || ""),
    hostName: String(tournament.adminDisplayName || "").slice(0, 40),
    joinMode: tournament.joinMode === "open" ? "open" : String(tournament.joinMode || "open"),
    paid: scrimIsPaid(tournament),
    prizeAmount: Number(tournament.prizeAmount) || 0,
    posterUrl: String(tournament.posterUrl || "").slice(0, 500000),
    published: true,
    publishedAt: Date.now(),
  };
}
