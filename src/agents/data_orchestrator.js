/**
 * Live matrix data orchestrator — single-agent background service.
 *
 * Pipelines: ESPN scoreboard (Tier-1) → Liquipedia parse (catalog) → community rooms.
 * New / changed matches land in live_matrix.pending.json only.
 * Owner dashboard must approve one match at a time before --apply merges into live_matrix.json.
 *
 * Usage:
 *   node src/agents/data_orchestrator.js              # one extract cycle → pending
 *   node src/agents/data_orchestrator.js --cron       # repeat every CRON_MS (default 15m)
 *   node src/agents/data_orchestrator.js --apply      # merge approved decisions into live_matrix.json
 *   node src/agents/data_orchestrator.js --once --limit 5
 *
 * Env:
 *   LIQUIPEDIA_USER_AGENT  required compliant UA for Liquipedia (never hardcode email/token)
 *   ORCHESTRATOR_THROTTLE_MS  default 3000
 *   ORCHESTRATOR_CRON_MS      default 900000
 */

import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const DATA_DIR = join(ROOT, "src", "data");
const MATRIX_PATH = join(DATA_DIR, "live_matrix.json");
const PENDING_PATH = join(DATA_DIR, "live_matrix.pending.json");
const DECISIONS_PATH = join(DATA_DIR, "live_matrix.decisions.json");
const COMMUNITY_PATH = join(DATA_DIR, "community_rooms.json");

const THROTTLE_MS = Number(process.env.ORCHESTRATOR_THROTTLE_MS || 3000);
const CRON_MS = Number(process.env.ORCHESTRATOR_CRON_MS || 15 * 60 * 1000);
const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/esports";
const REQUEST_TIMEOUT_MS = Number(process.env.ORCHESTRATOR_TIMEOUT_MS || 45_000);

/** Tier-1 ESPN scoreboard targets. */
const ESPN_LEAGUES = [
  { gameId: "valorant", leagueSlug: "valorant", label: "Valorant" },
  { gameId: "league-of-legends", leagueSlug: "league-of-legends", label: "League of Legends" },
  { gameId: "cs2", leagueSlug: "csgo", label: "CS2" },
  { gameId: "dota-2", leagueSlug: "dota-2", label: "Dota 2" },
  { gameId: "call-of-duty", leagueSlug: "call-of-duty", label: "Call of Duty" },
];

/** Remaining catalog → Liquipedia wiki + default standings/bracket page. */
const LIQUIPEDIA_CATALOG = [
  { gameId: "overwatch-2", wiki: "overwatch", page: "Portal:Tournaments" },
  { gameId: "rocket-league", wiki: "rocketleague", page: "Portal:Tournaments" },
  { gameId: "apex-legends", wiki: "apexlegends", page: "Portal:Tournaments" },
  { gameId: "pubg", wiki: "pubg", page: "Portal:Tournaments" },
  { gameId: "pubg-mobile", wiki: "pubgmobile", page: "Portal:Tournaments" },
  { gameId: "bgmi", wiki: "pubgmobile", page: "Battlegrounds_Mobile_India" },
  { gameId: "mobile-legends-bang-bang", wiki: "mobilelegends", page: "Portal:Tournaments" },
  { gameId: "free-fire", wiki: "freefire", page: "Portal:Tournaments" },
  { gameId: "fortnite", wiki: "fortnite", page: "Portal:Tournaments" },
  { gameId: "rainbow-six-siege", wiki: "rainbowsix", page: "Portal:Tournaments" },
  { gameId: "honor-of-kings", wiki: "honorofkings", page: "Portal:Tournaments" },
  { gameId: "clash-royale", wiki: "clashroyale", page: "Portal:Tournaments" },
  { gameId: "brawl-stars", wiki: "brawlstars", page: "Portal:Tournaments" },
  { gameId: "starcraft-2", wiki: "starcraft2", page: "Portal:Tournaments" },
  { gameId: "teamfight-tactics", wiki: "teamfighttactics", page: "Portal:Tournaments" },
];

function loadDotEnv() {
  const envPath = join(ROOT, ".env");
  if (!existsSync(envPath)) return;
  const text = readFileSync(envPath, "utf8");
  text.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const eq = trimmed.indexOf("=");
    if (eq < 1) return;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  });
}

loadDotEnv();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseArgs(argv) {
  const opts = { cron: false, apply: false, once: true, limit: 0, dryRun: false };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--cron") {
      opts.cron = true;
      opts.once = false;
    } else if (arg === "--apply") opts.apply = true;
    else if (arg === "--once") opts.once = true;
    else if (arg === "--dry-run") opts.dryRun = true;
    else if (arg === "--limit") opts.limit = Number(argv[++i]) || 0;
  }
  return opts;
}

async function readJson(path, fallback) {
  try {
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function slugGame(value) {
  return (
    String(value || "game")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "game"
  );
}

/** Map compiled match → 1080p asset matrix paths under /assets/games/{gameId}/… */
export function assetPathsForGame(gameId) {
  const id = slugGame(gameId);
  return {
    avatar: `/assets/games/${id}/avatars/variant_1.png`,
    poster: `/assets/games/${id}/posters/variant_1.png`,
    background: `/assets/games/${id}/backgrounds/variant_1.png`,
  };
}

function emptyRoom() {
  return {
    roomId: null,
    password: null,
    timeline: [],
    bracketResults: [],
  };
}

/**
 * Standardize every outgoing match entity.
 * status: "scheduled" | "live" | "completed"
 */
export function normalizeMatch(partial = {}) {
  const gameId = slugGame(partial.gameId || partial.game || "unknown");
  const teamA = normalizeTeam(partial.teamA);
  const teamB = normalizeTeam(partial.teamB);
  const idSeed =
    partial.id ||
    partial.matchKey ||
    `${gameId}-${teamA.name}-${teamB.name}-${partial.tournamentName || "match"}`.toLowerCase();
  const id = slugGame(idSeed).slice(0, 96);
  const status = normalizeStatus(partial.status);
  return {
    id,
    gameId,
    tournamentName: String(partial.tournamentName || partial.title || "Untitled").slice(0, 160),
    status,
    gameClock: String(partial.gameClock || partial.clock || "").slice(0, 40),
    teamA,
    teamB,
    communityRoom: {
      ...emptyRoom(),
      ...(partial.communityRoom && typeof partial.communityRoom === "object" ? partial.communityRoom : {}),
      ...(partial.room && typeof partial.room === "object" ? partial.room : {}),
    },
    assets: assetPathsForGame(gameId),
    source: String(partial.source || "unknown").slice(0, 40),
    mapStatus: partial.mapStatus ? String(partial.mapStatus).slice(0, 80) : null,
    stream: partial.stream
      ? {
          available: Boolean(partial.stream.available),
          url: partial.stream.url ? String(partial.stream.url).slice(0, 300) : null,
        }
      : { available: false, url: null },
    extractedAt: partial.extractedAt || Date.now(),
  };
}

function normalizeTeam(team) {
  if (!team || typeof team !== "object") {
    return { name: "TBD", score: null, logo: null };
  }
  const score = team.score;
  return {
    name: String(team.name || team.displayName || "TBD").slice(0, 80),
    score: score === null || score === undefined || score === "" ? null : Number(score),
    logo: team.logo ? String(team.logo).slice(0, 300) : null,
  };
}

function normalizeStatus(value) {
  const raw = String(value || "").toLowerCase();
  if (["live", "in", "inprogress", "in progress", "status_in_progress"].includes(raw)) return "live";
  if (["completed", "final", "post", "status_final", "finished"].includes(raw)) return "completed";
  return "scheduled";
}

async function fetchJson(url, { headers = {} } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...headers,
      },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status} ${body.slice(0, 180)}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// ─── ESPN Scoreboard ─────────────────────────────────────────────────────────

function mapEspnStatus(event) {
  const name = String(event?.status?.type?.name || event?.status?.type?.state || "").toLowerCase();
  if (name.includes("in") || name === "status_in_progress") return "live";
  if (name.includes("final") || name === "post" || name === "status_final") return "completed";
  return "scheduled";
}

function extractEspnEvent(gameMeta, event) {
  const competitions = event?.competitions || [];
  const competition = competitions[0] || {};
  const competitors = competition.competitors || [];
  const home = competitors.find((c) => c.homeAway === "home") || competitors[0] || {};
  const away = competitors.find((c) => c.homeAway === "away") || competitors[1] || {};
  const broadcasts = competition.broadcasts || event.broadcasts || [];
  const streamUrl =
    broadcasts[0]?.media?.shortName ||
    broadcasts[0]?.names?.[0] ||
    competition.geoBroadcasts?.[0]?.media?.shortName ||
    null;
  const mapDetail =
    competition.situation?.lastPlay?.text ||
    competition.notes?.[0]?.headline ||
    event.links?.find((l) => /map/i.test(l?.rel?.join?.(" ") || ""))?.text ||
    null;

  return normalizeMatch({
    id: `espn-${gameMeta.gameId}-${event.id || event.uid || Date.now()}`,
    gameId: gameMeta.gameId,
    tournamentName: event.name || event.shortName || gameMeta.label,
    status: mapEspnStatus(event),
    gameClock: event.status?.displayClock || event.status?.type?.detail || "",
    teamA: {
      name: away.team?.displayName || away.team?.name || away.name || "TBD",
      score: away.score,
      logo: away.team?.logo || null,
    },
    teamB: {
      name: home.team?.displayName || home.team?.name || home.name || "TBD",
      score: home.score,
      logo: home.team?.logo || null,
    },
    mapStatus: mapDetail,
    stream: { available: Boolean(streamUrl || broadcasts.length), url: streamUrl },
    source: "espn",
  });
}

async function extractEspnScoreboard(gameMeta) {
  const url = `${ESPN_BASE}/${gameMeta.leagueSlug}/scoreboard`;
  try {
    const data = await fetchJson(url);
    const events = Array.isArray(data?.events) ? data.events : [];
    return events.map((event) => extractEspnEvent(gameMeta, event));
  } catch (error) {
    console.warn(`[espn] ${gameMeta.gameId} skipped: ${error.message}`);
    return [];
  }
}

// ─── Liquipedia MediaWiki parse ──────────────────────────────────────────────

function stripHtml(html = "") {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function parseLiquipediaMatches(gameId, pageTitle, html) {
  const text = stripHtml(html);
  const matches = [];
  // Lightweight matrix: pull "TeamA vs TeamB" style pairs from portal copy.
  const vsPattern = /([A-Za-z0-9 .'\-]{2,40})\s+vs\.?\s+([A-Za-z0-9 .'\-]{2,40})/gi;
  let hit;
  let count = 0;
  while ((hit = vsPattern.exec(text)) && count < 12) {
    const teamA = hit[1].trim();
    const teamB = hit[2].trim();
    if (teamA.length < 2 || teamB.length < 2) continue;
    matches.push(
      normalizeMatch({
        id: `lp-${gameId}-${slugGame(teamA)}-${slugGame(teamB)}-${count}`,
        gameId,
        tournamentName: pageTitle.replace(/_/g, " "),
        status: "scheduled",
        gameClock: "",
        teamA: { name: teamA, score: null },
        teamB: { name: teamB, score: null },
        source: "liquipedia",
      }),
    );
    count += 1;
  }
  if (matches.length === 0) {
    matches.push(
      normalizeMatch({
        id: `lp-${gameId}-portal`,
        gameId,
        tournamentName: `${pageTitle.replace(/_/g, " ")} (standings/brackets)`,
        status: "scheduled",
        teamA: { name: "Bracket TBD", score: null },
        teamB: { name: "Bracket TBD", score: null },
        source: "liquipedia",
        mapStatus: text.slice(0, 120) || null,
      }),
    );
  }
  return matches;
}

async function extractLiquipedia(entry) {
  const ua = process.env.LIQUIPEDIA_USER_AGENT;
  if (!ua) {
    console.warn(`[liquipedia] ${entry.gameId} skipped: set LIQUIPEDIA_USER_AGENT`);
    return [];
  }
  const url =
    `https://liquipedia.net/${entry.wiki}/api.php` +
    `?action=parse&page=${encodeURIComponent(entry.page)}&format=json&prop=text`;
  try {
    const data = await fetchJson(url, {
      headers: {
        "User-Agent": ua,
        "Accept-Encoding": "gzip",
      },
    });
    const html = data?.parse?.text?.["*"] || "";
    const title = data?.parse?.title || entry.page;
    return parseLiquipediaMatches(entry.gameId, title, html);
  } catch (error) {
    console.warn(`[liquipedia] ${entry.gameId} skipped: ${error.message}`);
    return [];
  }
}

// ─── Community rooms (local hook) ────────────────────────────────────────────

async function readCommunityRooms() {
  try {
    const rows = await readJson(COMMUNITY_PATH, []);
    if (!Array.isArray(rows)) return [];
    return rows.map((row) =>
      normalizeMatch({
        ...row,
        id: row.matchKey || row.id,
        source: "community",
        communityRoom: row.room || row.communityRoom || emptyRoom(),
      }),
    );
  } catch (error) {
    console.warn(`[community] skipped: ${error.message}`);
    return [];
  }
}

// ─── Merge / pending / apply ─────────────────────────────────────────────────

function indexById(list = []) {
  return new Map(list.map((item) => [item.id, item]));
}

function matchFingerprint(item) {
  return [
    item.gameId,
    item.tournamentName,
    item.status,
    item.gameClock,
    item.teamA?.name,
    item.teamA?.score,
    item.teamB?.name,
    item.teamB?.score,
    item.communityRoom?.roomId,
  ].join("|");
}

/**
 * Stage candidates into pending. Never writes live_matrix.json here —
 * owner dashboard must approve each match first (decisions file / desk).
 */
function stagePending({ existingMatches, pendingQueue, decisions, candidates }) {
  const live = indexById(existingMatches);
  const pending = indexById(pendingQueue);
  const nextPending = [...pendingQueue];
  let staged = 0;
  let skipped = 0;

  for (const raw of candidates) {
    const item = normalizeMatch(raw);
    const decision = decisions[item.id];
    if (decision === "rejected") {
      skipped += 1;
      continue;
    }
    if (decision === "approved" && live.has(item.id)) {
      const current = live.get(item.id);
      if (matchFingerprint(current) === matchFingerprint(item)) {
        skipped += 1;
        continue;
      }
      // Changed after prior approval → re-queue for owner review before overwrite.
    }
    if (pending.has(item.id) && matchFingerprint(pending.get(item.id)) === matchFingerprint(item)) {
      skipped += 1;
      continue;
    }
    if (live.has(item.id) && matchFingerprint(live.get(item.id)) === matchFingerprint(item)) {
      skipped += 1;
      continue;
    }

    const existingIdx = nextPending.findIndex((row) => row.id === item.id);
    if (existingIdx >= 0) nextPending[existingIdx] = item;
    else nextPending.push(item);
    pending.set(item.id, item);
    staged += 1;
  }

  return { nextPending, staged, skipped };
}

async function applyApprovals({ dryRun = false } = {}) {
  const matrix = await readJson(MATRIX_PATH, { matches: [] });
  const pendingDoc = await readJson(PENDING_PATH, { queue: [] });
  const decisionsDoc = await readJson(DECISIONS_PATH, { decisions: {} });
  const decisions = decisionsDoc.decisions || {};
  const live = indexById(matrix.matches || []);
  const remaining = [];
  let merged = 0;
  let dropped = 0;

  for (const item of pendingDoc.queue || []) {
    const verdict = decisions[item.id];
    if (verdict === "approved") {
      live.set(item.id, normalizeMatch(item));
      merged += 1;
      continue;
    }
    if (verdict === "rejected") {
      dropped += 1;
      continue;
    }
    remaining.push(item);
  }

  const nextMatrix = {
    updatedAt: Date.now(),
    source: "data_orchestrator",
    matches: [...live.values()],
  };
  const nextPending = {
    updatedAt: Date.now(),
    queue: remaining,
  };

  if (!dryRun) {
    await writeJson(MATRIX_PATH, nextMatrix);
    await writeJson(PENDING_PATH, nextPending);
  }

  console.log(`[apply] merged=${merged} rejected=${dropped} stillPending=${remaining.length}`);
  return { merged, dropped, pending: remaining.length };
}

async function runExtractCycle({ limit = 0, dryRun = false } = {}) {
  console.log(`[orchestrator] throttle=${THROTTLE_MS}ms · starting extract`);
  const candidates = [];

  for (const league of ESPN_LEAGUES) {
    const rows = await extractEspnScoreboard(league);
    candidates.push(...rows);
    console.log(`[espn] ${league.gameId} → ${rows.length} events`);
    await sleep(THROTTLE_MS);
    if (limit && candidates.length >= limit) break;
  }

  if (!limit || candidates.length < limit) {
    for (const entry of LIQUIPEDIA_CATALOG) {
      if (limit && candidates.length >= limit) break;
      const rows = await extractLiquipedia(entry);
      candidates.push(...rows);
      console.log(`[liquipedia] ${entry.gameId} → ${rows.length} rows`);
      await sleep(THROTTLE_MS);
    }
  }

  const community = await readCommunityRooms();
  candidates.push(...community);
  console.log(`[community] → ${community.length} rooms`);

  const sliced = limit ? candidates.slice(0, limit) : candidates;
  const matrix = await readJson(MATRIX_PATH, { matches: [] });
  const pendingDoc = await readJson(PENDING_PATH, { queue: [] });
  const decisionsDoc = await readJson(DECISIONS_PATH, { decisions: {} });

  const { nextPending, staged, skipped } = stagePending({
    existingMatches: matrix.matches || [],
    pendingQueue: pendingDoc.queue || [],
    decisions: decisionsDoc.decisions || {},
    candidates: sliced,
  });

  const pendingOut = { updatedAt: Date.now(), queue: nextPending };
  if (!dryRun) await writeJson(PENDING_PATH, pendingOut);

  console.log(
    `[done] candidates=${sliced.length} stagedPending=${staged} unchangedSkipped=${skipped} pendingTotal=${nextPending.length}`,
  );
  console.log(
    `[gate] Owner must approve one match at a time (dashboard / decisions file) then run --apply to write live_matrix.json`,
  );
  return { staged, skipped, pendingTotal: nextPending.length };
}

async function masterLoop(opts) {
  if (opts.apply) {
    await applyApprovals({ dryRun: opts.dryRun });
    if (!opts.cron) return;
  }

  const tick = async () => {
    try {
      await runExtractCycle({ limit: opts.limit, dryRun: opts.dryRun });
    } catch (error) {
      console.error(`[fatal] extract cycle: ${error.message}`);
    }
  };

  await tick();
  if (!opts.cron) return;

  console.log(`[cron] scheduling iterations every ${CRON_MS}ms (${Math.round(CRON_MS / 60000)} min)`);
  setInterval(tick, CRON_MS);
}

const isMain =
  Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const opts = parseArgs(process.argv);
  masterLoop(opts).catch((error) => {
    console.error(`[fatal] ${error.message}`);
    process.exitCode = 1;
  });
}
