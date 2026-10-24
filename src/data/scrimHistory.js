/** Denormalized player participation for history + host follow. */

export function buildScrimHistoryEntry(tournament = {}, registration = {}) {
  return {
    tournamentId: String(tournament.id || registration.tournamentId || "").slice(0, 128),
    tournamentName: String(tournament.name || "Scrim").slice(0, 120),
    game: String(tournament.game || "").slice(0, 60),
    hostUid: String(tournament.adminUserId || "").slice(0, 128),
    hostName: String(tournament.adminDisplayName || "Host").slice(0, 40),
    joinMode: String(tournament.joinMode || "request").slice(0, 20),
    status: String(registration.status || "pending").slice(0, 20),
    entryType: String(registration.entryType || "solo").slice(0, 20),
    attendance: String(registration.attendance || "pending").slice(0, 20),
    resultWinner: String(tournament.results?.winner || "").slice(0, 80),
    at: Number(registration.requestedAt) || Date.now(),
    updatedAt: Date.now(),
  };
}

export function sortScrimHistory(rows = []) {
  return [...rows].sort((a, b) => (b.at || 0) - (a.at || 0));
}
