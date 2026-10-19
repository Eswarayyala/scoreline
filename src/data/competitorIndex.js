import { formatForGame } from "./vaultDeskSchema";
import { canonicalOrgName, isPlaceholderCompetitor, looksLikeFranchiseName } from "./knownOrgs";

const PLAYER_ROLES = new Set(["MVP", "Best IGL", "Fan favourite"]);
const TITLE_ROLES = new Set(["Champion", "Runner-up", "Third"]);

function normalizeKey(name = "") {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pushAppearance(map, name, appearance) {
  const label = String(name || "").trim();
  if (!label || isPlaceholderCompetitor(label)) return false;
  const key = normalizeKey(canonicalOrgName(label));
  if (!key) return false;
  const current = map.get(key) || {
    name: looksLikeFranchiseName(label) ? canonicalOrgName(label) : label,
    key,
    appearances: [],
    sourceScores: { franchise: 0, player: 0 },
  };
  const editionKey = `${appearance.game}|${appearance.year}|${appearance.event}|${appearance.role}|${appearance.sourceField}`;
  if (current.appearances.some((row) => row._dedupe === editionKey)) return false;
  current.appearances.push({ ...appearance, _dedupe: editionKey });
  if (label.length > current.name.length && !looksLikeFranchiseName(current.name)) current.name = label;
  if (looksLikeFranchiseName(label) && !looksLikeFranchiseName(current.name)) current.name = canonicalOrgName(label);
  map.set(key, current);
  return true;
}

function rolesFromEdition(edition, game) {
  const format = formatForGame(game || edition.game, edition.structureId);
  const competitor = format.competitor || "Team";
  const roles = [];

  const pushTitle = (role, name) => {
    if (!name) return;
    roles.push({
      role,
      name,
      prize: "",
      sourceField: TITLE_ROLES.has(role) ? (competitor === "Player" ? "playerTitle" : "teamTitle") : "title",
      competitorHint: competitor === "Player" ? "player" : competitor === "Team" ? "team" : "mixed",
    });
  };

  pushTitle("Champion", edition.champion);
  pushTitle("Runner-up", edition.runnerUp);
  pushTitle("Third", edition.third);

  if (edition.mvp) {
    roles.push({
      role: "MVP",
      name: edition.mvp,
      prize: "",
      sourceField: "mvp",
      competitorHint: "player",
    });
  }
  if (edition.bestIgl) {
    roles.push({
      role: "Best IGL",
      name: edition.bestIgl,
      prize: "",
      sourceField: "bestIgl",
      competitorHint: "player",
    });
  }
  if (edition.fanFavourite) {
    roles.push({
      role: "Fan favourite",
      name: edition.fanFavourite,
      prize: "",
      sourceField: "fanFavourite",
      competitorHint: "player",
    });
  }

  (edition.payouts || []).forEach((row) => {
    if (row.team && !isPlaceholderCompetitor(row.team)) {
      roles.push({
        role: row.rank || "Placement",
        name: row.team,
        prize: row.prize || "",
        sourceField: "team",
        competitorHint: "team",
      });
    }
    if (row.player && !isPlaceholderCompetitor(row.player)) {
      // Strip trailing org annotation like "Magnus Carlsen (Team Liquid)" for player entity,
      // but keep full display name.
      roles.push({
        role: row.rank || "Placement",
        name: row.player,
        prize: row.prize || "",
        sourceField: "player",
        competitorHint: "player",
      });
    }
    if (!row.team && !row.player) return;
  });

  return roles;
}

function scoreAppearance(appearance) {
  let franchise = 0;
  let player = 0;
  if (appearance.sourceField === "team" || appearance.sourceField === "teamTitle") franchise += 3;
  if (appearance.sourceField === "player" || appearance.sourceField === "playerTitle") player += 3;
  if (appearance.sourceField === "mvp" || appearance.sourceField === "bestIgl" || appearance.sourceField === "fanFavourite") {
    player += 4;
  }
  if (appearance.competitorHint === "team") franchise += 1;
  if (appearance.competitorHint === "player") player += 1;
  if (PLAYER_ROLES.has(appearance.role)) player += 2;
  if (TITLE_ROLES.has(appearance.role) && appearance.competitorHint === "team") franchise += 2;
  if (TITLE_ROLES.has(appearance.role) && appearance.competitorHint === "player") player += 2;
  if (looksLikeFranchiseName(appearance.name)) franchise += 4;
  return { franchise, player };
}

function classifyEntry(entry) {
  let franchiseScore = entry.sourceScores.franchise;
  let playerScore = entry.sourceScores.player;
  const games = [...new Set(entry.appearances.map((row) => row.game).filter(Boolean))];
  const teamRoles = entry.appearances.filter(
    (row) => row.sourceField === "team" || row.sourceField === "teamTitle" || row.competitorHint === "team",
  ).length;
  const playerRoles = entry.appearances.filter(
    (row) =>
      row.sourceField === "player" ||
      row.sourceField === "playerTitle" ||
      row.sourceField === "mvp" ||
      row.sourceField === "bestIgl" ||
      row.sourceField === "fanFavourite" ||
      row.competitorHint === "player",
  ).length;

  if (looksLikeFranchiseName(entry.name)) franchiseScore += 5;
  if (games.length >= 2 && teamRoles >= playerRoles) franchiseScore += 3;
  if (games.length <= 1 && playerRoles >= teamRoles && entry.appearances.length <= 4) playerScore += 2;
  if (teamRoles === 0 && playerRoles > 0) playerScore += 3;
  if (playerRoles === 0 && teamRoles > 0) franchiseScore += 3;

  let kind = "unclassified";
  if (franchiseScore >= playerScore + 2 && (teamRoles > 0 || looksLikeFranchiseName(entry.name))) {
    kind = "franchise";
  } else if (playerScore >= franchiseScore + 1 || (playerRoles > 0 && teamRoles === 0)) {
    kind = "player";
  } else if (franchiseScore > playerScore) {
    kind = "franchise";
  } else if (playerScore > franchiseScore) {
    kind = "player";
  }

  const titles = entry.appearances.filter((row) => /champion/i.test(row.role)).length;

  return {
    ...entry,
    appearances: entry.appearances.map(({ _dedupe, ...rest }) => rest),
    games,
    gameCount: games.length,
    appearanceCount: entry.appearances.length,
    titles,
    teamRoleCount: teamRoles,
    playerRoleCount: playerRoles,
    franchiseScore,
    playerScore,
    kind,
  };
}

/** Build a name → career timeline index across vault research slides. */
export function buildCompetitorIndex(slides = []) {
  const map = new Map();
  slides.forEach((slide) => {
    if (slide.blog || slide.surface === "blog") return;
    (slide.editions || []).forEach((edition) => {
      const game = edition.game || slide.game || "";
      rolesFromEdition(edition, game).forEach(({ role, name, prize, sourceField, competitorHint }) => {
        const added = pushAppearance(map, name, {
          role,
          prize: prize || "",
          year: edition.year || edition.season || "",
          event: edition.event || slide.title || "",
          game,
          prizePool: edition.prizePool || "",
          slug: slide.slug || "",
          eventScope: edition.eventScope || slide.eventScope || "",
          sourceField,
          competitorHint,
        });
        if (!added) return;
        const scores = scoreAppearance({ role, name, sourceField, competitorHint });
        const entry = map.get(normalizeKey(canonicalOrgName(name)));
        if (entry) {
          entry.sourceScores.franchise += scores.franchise;
          entry.sourceScores.player += scores.player;
        }
      });
    });
  });

  return [...map.values()].map(classifyEntry).sort((a, b) => {
    if (b.appearanceCount !== a.appearanceCount) return b.appearanceCount - a.appearanceCount;
    return a.name.localeCompare(b.name);
  });
}

export function listFranchises(slides = []) {
  return buildCompetitorIndex(slides)
    .filter((entry) => entry.kind === "franchise")
    .filter((entry) => entry.gameCount >= 2 || entry.appearanceCount >= 2 || entry.titles >= 1)
    .sort(
      (a, b) =>
        b.gameCount - a.gameCount ||
        b.appearanceCount - a.appearanceCount ||
        b.titles - a.titles ||
        a.name.localeCompare(b.name),
    );
}

export function listPlayers(slides = []) {
  return buildCompetitorIndex(slides)
    .filter((entry) => entry.kind === "player")
    .filter((entry) => entry.appearanceCount >= 1)
    .sort(
      (a, b) =>
        a.gameCount - b.gameCount ||
        b.appearanceCount - a.appearanceCount ||
        a.name.localeCompare(b.name),
    );
}

export function findCompetitor(slides = [], rawName = "") {
  const key = normalizeKey(canonicalOrgName(rawName));
  if (!key) return null;
  return buildCompetitorIndex(slides).find((entry) => entry.key === key || normalizeKey(entry.name) === key) || null;
}

export function dossierPath(name) {
  return `/vault/dossier/${encodeURIComponent(String(name || "").trim())}`;
}
