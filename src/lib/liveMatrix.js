/** Shared live-matrix helpers for agent output + owner dashboard. */

export function slugGameId(value) {
  return (
    String(value || "game")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "game"
  );
}

export function assetPathsForGame(gameId) {
  const id = slugGameId(gameId);
  return {
    avatar: `/assets/games/${id}/avatars/variant_1.png`,
    poster: `/assets/games/${id}/posters/variant_1.png`,
    background: `/assets/games/${id}/backgrounds/variant_1.png`,
  };
}

export function emptyCommunityRoom() {
  return {
    roomId: null,
    password: null,
    timeline: [],
    bracketResults: [],
  };
}

export function normalizeLiveMatch(partial = {}) {
  const gameId = slugGameId(partial.gameId || partial.game || "unknown");
  const teamA = normalizeTeam(partial.teamA);
  const teamB = normalizeTeam(partial.teamB);
  const idSeed =
    partial.id ||
    partial.matchKey ||
    `${gameId}-${teamA.name}-${teamB.name}-${partial.tournamentName || "match"}`;
  const id = slugGameId(idSeed).slice(0, 96);
  return {
    id,
    gameId,
    tournamentName: String(partial.tournamentName || partial.title || "Untitled").slice(0, 160),
    status: normalizeStatus(partial.status),
    gameClock: String(partial.gameClock || "").slice(0, 40),
    teamA,
    teamB,
    communityRoom: {
      ...emptyCommunityRoom(),
      ...(partial.communityRoom && typeof partial.communityRoom === "object" ? partial.communityRoom : {}),
      ...(partial.room && typeof partial.room === "object" ? partial.room : {}),
    },
    assets: partial.assets && typeof partial.assets === "object" ? partial.assets : assetPathsForGame(gameId),
    source: String(partial.source || "unknown").slice(0, 40),
    mapStatus: partial.mapStatus ? String(partial.mapStatus).slice(0, 80) : null,
    stream: partial.stream || { available: false, url: null },
    extractedAt: partial.extractedAt || Date.now(),
  };
}

function normalizeTeam(team) {
  if (!team || typeof team !== "object") return { name: "TBD", score: null, logo: null };
  return {
    name: String(team.name || "TBD").slice(0, 80),
    score: team.score === null || team.score === undefined || team.score === "" ? null : Number(team.score),
    logo: team.logo ? String(team.logo).slice(0, 300) : null,
  };
}

function normalizeStatus(value) {
  const raw = String(value || "").toLowerCase();
  if (["live", "in", "inprogress", "in progress"].includes(raw)) return "live";
  if (["completed", "final", "post", "finished"].includes(raw)) return "completed";
  return "scheduled";
}

/** Circuit CMS–shaped payload for one approved match (owner merge target). */
export function matchToCircuitPayload(match) {
  const item = normalizeLiveMatch(match);
  return {
    id: `live-matrix-${item.id}`,
    surface: "tournament",
    eventStatus: item.status === "live" ? "live" : item.status === "completed" ? "completed" : "upcoming",
    title: item.tournamentName,
    game: item.gameId,
    kicker: `${item.teamA.name} vs ${item.teamB.name}`,
    summary: [
      item.gameClock ? `Clock ${item.gameClock}` : null,
      item.mapStatus,
      item.communityRoom?.roomId ? `Room ${item.communityRoom.roomId}` : null,
    ]
      .filter(Boolean)
      .join(" · ")
      .slice(0, 280),
    poster: item.assets?.poster || "",
    posterSource: "preset",
    activeStage: item.status,
    liveEmbedUrl: item.stream?.url || "",
    source: "live_matrix",
    liveMatrixId: item.id,
    teamA: item.teamA,
    teamB: item.teamB,
    communityRoom: item.communityRoom,
    assets: item.assets,
  };
}
