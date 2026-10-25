import { canonicalFilterGame } from "./gameCatalog";
import { normalizeInternationalStage, stageSatisfiesRequirement } from "./scrimRooms";

/** Results must land within this window after the last room completes. */
export const RESULTS_POST_WINDOW_MS = 24 * 60 * 60 * 1000;

export const HOST_VERIFY_THRESHOLD_DEFAULT = 5;

/**
 * Per-game verification process: stage path + how many complete desks unlock review notify.
 * Hosts must run that game's path (not a generic one) to count toward badge review.
 */
export const GAME_VERIFY_PROCESSES = {
  BGMI: {
    label: "Battle royale · groups to survival finals",
    stages: ["group", "semifinals", "survival", "finals"],
    threshold: 8,
  },
  "Free Fire": {
    label: "Battle royale · groups to survival finals",
    stages: ["group", "semifinals", "survival", "finals"],
    threshold: 8,
  },
  "PUBG Mobile": {
    label: "Battle royale · groups to survival finals",
    stages: ["group", "semifinals", "survival", "finals"],
    threshold: 8,
  },
  PUBG: {
    label: "Battle royale · groups to survival finals",
    stages: ["group", "semifinals", "survival", "finals"],
    threshold: 5,
  },
  Fortnite: {
    label: "Battle royale · groups to survival finals",
    stages: ["group", "semifinals", "survival", "finals"],
    threshold: 5,
  },
  "Apex Legends": {
    label: "BR trios · groups to survival finals",
    stages: ["group", "semifinals", "survival", "finals"],
    threshold: 5,
  },
  Valorant: {
    label: "Tactical bracket · groups through finals",
    stages: ["group", "quarters", "semifinals", "finals"],
    threshold: 5,
  },
  CS2: {
    label: "Tactical bracket · groups through finals",
    stages: ["group", "quarters", "semifinals", "finals"],
    threshold: 5,
  },
  "Counter-Strike 2": {
    label: "Tactical bracket · groups through finals",
    stages: ["group", "quarters", "semifinals", "finals"],
    threshold: 5,
  },
  "Rainbow Six Siege": {
    label: "Tactical bracket · groups through finals",
    stages: ["group", "quarters", "semifinals", "finals"],
    threshold: 5,
  },
  "Call of Duty": {
    label: "FPS bracket · groups through finals",
    stages: ["group", "quarters", "semifinals", "finals"],
    threshold: 5,
  },
  "League of Legends": {
    label: "MOBA bracket · groups through finals",
    stages: ["group", "quarters", "semifinals", "finals"],
    threshold: 5,
  },
  "Dota 2": {
    label: "MOBA bracket · groups through finals",
    stages: ["group", "quarters", "semifinals", "finals"],
    threshold: 5,
  },
  "Mobile Legends: Bang Bang": {
    label: "MOBA bracket · groups through finals",
    stages: ["group", "quarters", "semifinals", "finals"],
    threshold: 5,
  },
  "Honor of Kings": {
    label: "MOBA bracket · groups through finals",
    stages: ["group", "quarters", "semifinals", "finals"],
    threshold: 5,
  },
  "Overwatch 2": {
    label: "Hero shooter bracket · groups through finals",
    stages: ["group", "quarters", "semifinals", "finals"],
    threshold: 5,
  },
  "Rocket League": {
    label: "Sports bracket · groups to finals",
    stages: ["group", "semifinals", "finals"],
    threshold: 5,
  },
  "EA Sports FC": {
    label: "Sports bracket · groups to finals",
    stages: ["group", "semifinals", "finals"],
    threshold: 3,
  },
  Chess: {
    label: "Swiss / bracket · groups to finals",
    stages: ["group", "semifinals", "finals"],
    threshold: 3,
  },
  "Street Fighter 6": {
    label: "Fighter bracket · groups through finals",
    stages: ["group", "quarters", "semifinals", "finals"],
    threshold: 3,
  },
  "Tekken 8": {
    label: "Fighter bracket · groups through finals",
    stages: ["group", "quarters", "semifinals", "finals"],
    threshold: 3,
  },
  Other: {
    label: "International core · groups to finals",
    stages: ["group", "semifinals", "finals"],
    threshold: 3,
  },
};

/** @deprecated use GAME_VERIFY_PROCESSES — kept for older imports */
export const HOST_VERIFY_THRESHOLDS = Object.fromEntries(
  Object.entries(GAME_VERIFY_PROCESSES).map(([game, process]) => [game, process.threshold]),
);

export const INTERNATIONAL_CORE_STAGES = ["group", "semifinals", "finals"];
export const INTERNATIONAL_SURVIVAL_STAGE = "survival";

function isPastScrim(item = {}) {
  return item?.archived === true || item?.status === "completed" || item?.status === "closed";
}

function hasPostedResults(item = {}) {
  const results = item?.results;
  if (results && typeof results === "object") {
    if (results.champion || results.winner || results.mvp) return true;
    if (Array.isArray(results.standings) && results.standings.length) return true;
    if (Array.isArray(results.placements) && results.placements.length) return true;
  }
  return Array.isArray(item.standings) && item.standings.length > 0;
}

export function gameVerifyProcess(game = "") {
  const key = canonicalFilterGame(game) || "Other";
  return GAME_VERIFY_PROCESSES[key] || GAME_VERIFY_PROCESSES.Other;
}

export function gameRequiresSurvival(game = "") {
  return requiredInternationalStages(game).includes("survival");
}

/** Stage path required for a complete desk on this game. */
export function requiredInternationalStages(game = "") {
  return [...(gameVerifyProcess(game).stages || INTERNATIONAL_CORE_STAGES)];
}

export function hostVerifyThresholdForGame(game = "") {
  return Number(gameVerifyProcess(game).threshold) || HOST_VERIFY_THRESHOLD_DEFAULT;
}

function roomStageKey(room = {}) {
  return normalizeInternationalStage(room.stage);
}

function roomWasRun(room = {}) {
  return Boolean(room.activatedAt || room.publishedAt || room.status === "active" || room.status === "collapsed");
}

function roomWasCompleted(room = {}, { finalsDone = false } = {}) {
  if (room.status === "collapsed" || room.collapsedAt) return true;
  const stage = roomStageKey(room);
  if (stage === "finals" && finalsDone && roomWasRun(room)) return true;
  return false;
}

/**
 * Build denormalized per-game track for a tournament (+ optional rooms).
 * Complete = that game's process stages finished + final results within 24h.
 */
export function buildInternationalTrack({
  game = "",
  rooms = [],
  results = null,
  standings = null,
  resultsPostedAt = null,
  previous = null,
} = {}) {
  const process = gameVerifyProcess(game);
  const required = requiredInternationalStages(game);
  const finalsDone = hasPostedResults({ results, standings });
  const postedAt = Number(resultsPostedAt) || (finalsDone ? Number(previous?.resultsPostedAt) || 0 : 0) || 0;

  const stagesPresent = [...new Set((rooms || []).map(roomStageKey).filter(Boolean))];

  const stagesCompleted = [...new Set(
    (rooms || [])
      .filter((room) => roomWasCompleted(room, { finalsDone }))
      .map(roomStageKey)
      .filter(Boolean),
  )];

  const missingStages = required.filter((stage) => !stageSatisfiesRequirement(stagesCompleted, stage));

  let lastRoomCompletedAt = 0;
  (rooms || []).forEach((room) => {
    const at = Number(room.collapsedAt) || 0;
    if (at > lastRoomCompletedAt) lastRoomCompletedAt = at;
  });
  if (!lastRoomCompletedAt && finalsDone && postedAt) {
    lastRoomCompletedAt = postedAt;
  }

  const resultsWithin24h = Boolean(
    finalsDone
    && postedAt
    && lastRoomCompletedAt
    && postedAt >= lastRoomCompletedAt
    && (postedAt - lastRoomCompletedAt) <= RESULTS_POST_WINDOW_MS,
  );

  const complete = Boolean(missingStages.length === 0 && finalsDone && resultsWithin24h);

  let reason = "";
  if (missingStages.length) {
    reason = `${process.label}: ${required.join(" → ")}. Still need: ${missingStages.join(", ")}.`;
  } else if (!finalsDone) {
    reason = "Post final results within 24 hours of the last room completion.";
  } else if (!resultsWithin24h) {
    reason = "Final results must be posted within 24 hours of the last room completion.";
  }

  return {
    model: "game_process",
    processLabel: process.label,
    game: canonicalFilterGame(game) || game || "Other",
    requiredStages: required,
    stagesPresent: [...new Set([...(stagesPresent || []), ...stagesCompleted])],
    stagesCompleted,
    missingStages,
    lastRoomCompletedAt: lastRoomCompletedAt || null,
    resultsPostedAt: postedAt || null,
    resultsWithin24h,
    complete,
    reason,
    survivalRequired: required.includes("survival"),
  };
}

/** Complete desk for verification: public/published + that game's process track complete. */
export function isSuccessfulHostedScrim(scrim = {}) {
  if (!isPastScrim(scrim)) return false;
  if (!hasPostedResults(scrim)) return false;
  const publicDesk = String(scrim.joinMode || "") === "open";
  const published = scrim.published === true;
  if (!publicDesk && !published) return false;
  const track = scrim.internationalTrack;
  if (!track || track.complete !== true || track.resultsWithin24h !== true) return false;
  // Track must match this desk's game process (ignore mismatched legacy stamps).
  const required = requiredInternationalStages(scrim.game);
  const trackRequired = Array.isArray(track.requiredStages) ? track.requiredStages : [];
  if (trackRequired.length && trackRequired.join("|") !== required.join("|")) {
    // Re-check completion against current process using stored completed stages.
    const missing = required.filter((stage) => !stageSatisfiesRequirement(track.stagesCompleted || [], stage));
    if (missing.length) return false;
  }
  return true;
}

export function countSuccessfulHostedByGame(tournaments = [], hostUid) {
  const counts = new Map();
  if (!hostUid) return counts;
  (tournaments || []).forEach((scrim) => {
    if (scrim.adminUserId !== hostUid) return;
    if (!isSuccessfulHostedScrim(scrim)) return;
    const game = canonicalFilterGame(scrim.game) || "Other";
    counts.set(game, (counts.get(game) || 0) + 1);
  });
  return counts;
}

export function evaluateHostVerification(tournaments = [], hostUid, { notifiedGames = {} } = {}) {
  const byGameCounts = countSuccessfulHostedByGame(tournaments, hostUid);
  const notified = notifiedGames && typeof notifiedGames === "object" ? notifiedGames : {};

  const rows = [...byGameCounts.entries()]
    .map(([game, count]) => {
      const process = gameVerifyProcess(game);
      const threshold = process.threshold;
      const eligible = count >= threshold;
      return {
        game,
        count,
        threshold,
        remaining: Math.max(0, threshold - count),
        eligible,
        progress: Math.min(1, threshold ? count / threshold : 0),
        processLabel: process.label,
        stages: process.stages,
        pathLabel: process.stages.join(" → "),
        reviewNotified: Boolean(notified[game]),
      };
    })
    .sort((a, b) => {
      if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
      return b.progress - a.progress || b.count - a.count;
    });

  const eligibleRows = rows.filter((row) => row.eligible);
  const pendingNotify = eligibleRows.find((row) => !row.reviewNotified) || null;
  const best = pendingNotify || eligibleRows[0] || rows[0] || null;
  const eligible = eligibleRows.length > 0;

  return {
    eligible,
    totalSuccessful: rows.reduce((sum, row) => sum + row.count, 0),
    best,
    pendingNotify,
    eligibleGames: eligibleRows,
    byGame: rows,
    summary: best
      ? eligible
        ? `Review ready · ${best.game} (${best.count}/${best.threshold}) · ${best.pathLabel}`
        : `${best.game}: ${best.count}/${best.threshold} · follow ${best.pathLabel}`
      : "Follow each game’s process, post results within 24h, then unlock verification review",
  };
}

/** Games that just crossed the bar and still need a review notify. */
export function hostVerifyGamesNeedingNotify(evaluation, notifiedGames = {}) {
  const notified = notifiedGames && typeof notifiedGames === "object" ? notifiedGames : {};
  return (evaluation?.eligibleGames || evaluation?.byGame || [])
    .filter((row) => row.eligible && !notified[row.game]);
}

export function hostVerificationRequestMeta(evaluation) {
  const best = evaluation?.best;
  if (!best) return {};
  return {
    qualifyingGame: best.game,
    successfulCount: best.count,
    threshold: best.threshold,
    totalSuccessful: evaluation.totalSuccessful || best.count,
    processLabel: best.processLabel || "",
    processPath: best.pathLabel || (best.stages || []).join(" → "),
  };
}

export function internationalPathLabel(game = "") {
  return requiredInternationalStages(game).join(" → ");
}

export function gameProcessLabel(game = "") {
  return gameVerifyProcess(game).label;
}
