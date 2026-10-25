import { gameMatchesFilter, canonicalFilterGame } from "./gameCatalog";
import { resolveScrimDeskPhase } from "./scrimPhase";

const TODAY_PHASES = ["live", "checkin", "open"];
const PHASE_RANK = { live: 0, checkin: 1, open: 2 };

/**
 * Active desk windows for the Today strip: Open → Check-in → Live only.
 * Defaults to the viewer's game when `game` is set; otherwise all games.
 */
export function pickScrimTodayWindows(tournaments = [], { game = "", limit = 8 } = {}) {
  const want = canonicalFilterGame(game);
  const rows = (tournaments || [])
    .map((scrim) => {
      const phase = resolveScrimDeskPhase(scrim);
      if (!TODAY_PHASES.includes(phase.phase)) return null;
      if (want && !gameMatchesFilter(scrim.game, want)) return null;
      return { scrim, phase: phase.phase, statusLabel: phase.statusLabel, accent: phase.accent };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const rank = (PHASE_RANK[a.phase] ?? 9) - (PHASE_RANK[b.phase] ?? 9);
      if (rank !== 0) return rank;
      const aStart = Date.parse(a.scrim.startDate || "") || Number.MAX_SAFE_INTEGER;
      const bStart = Date.parse(b.scrim.startDate || "") || Number.MAX_SAFE_INTEGER;
      return aStart - bStart;
    })
    .slice(0, Math.max(1, Math.min(24, limit)));

  return rows;
}

/** Preferred Today game: alert prefs → profile games → URL query → first live game. */
export function resolveTodayGameDefault({
  alertGames = [],
  profileGames = [],
  queryGame = "",
  tournaments = [],
} = {}) {
  const fromAlerts = (alertGames || []).map(canonicalFilterGame).filter(Boolean);
  if (fromAlerts[0]) return fromAlerts[0];
  const fromProfile = (profileGames || []).map(canonicalFilterGame).filter(Boolean);
  if (fromProfile[0]) return fromProfile[0];
  const fromQuery = canonicalFilterGame(queryGame || "");
  if (fromQuery) return fromQuery;
  const live = (tournaments || []).find((item) => {
    const phase = resolveScrimDeskPhase(item).phase;
    return TODAY_PHASES.includes(phase) && item.game;
  });
  return canonicalFilterGame(live?.game || "") || "";
}

export function todayGameChoices({ alertGames = [], profileGames = [], queryGame = "" } = {}) {
  const seen = new Set();
  const out = [];
  for (const raw of [...(alertGames || []), ...(profileGames || []), queryGame].filter(Boolean)) {
    const game = canonicalFilterGame(raw);
    if (!game || seen.has(game.toLowerCase())) continue;
    seen.add(game.toLowerCase());
    out.push(game);
  }
  return out.slice(0, 12);
}
