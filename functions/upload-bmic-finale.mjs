/**
 * Publish BMIC finale into separate BGMI + PUBG Mobile vault windows.
 */
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT = "scoreliner";
const DOC_ROOT = `projects/${PROJECT}/databases/(default)/documents`;
const NOW = Date.now();

const snap = JSON.parse(
  readFileSync(join(__dirname, "../src/data/bgmiStandingsStaging/bmic-2026-live.json"), "utf8"),
);

const BRIEF =
  snap.brief ||
  "Nongshim RedForce won BMIC after 18 matches (233 pts, 5 WWCD). Korea swept 1–3; Gladiators led India in 4th.";
const AWARDS = snap.awards || {};

const POSTERS = {
  BGMI: "https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&w=1600&q=80",
  "PUBG Mobile": "https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&w=1600&q=80",
};

function pointsTable() {
  return [...(snap.standings || [])]
    .sort((a, b) => Number(a.rank) - Number(b.rank))
    .map((row) => ({
      group: String(row.rank),
      team: row.country ? `${row.team} (${row.country})` : row.team,
      points: String(row.total_points),
      wins: String(row.wwcd),
      finish: String(row.finish_points),
      placement: String(row.placement_points),
    }));
}

function awards() {
  return {
    winners: "Nongshim RedForce (South Korea)",
    runnerUps: "Kiwoom DRX (South Korea)",
    secondRunnerUps: "Dplus KIA (South Korea)",
    mvp: AWARDS.mvp || "XZY1 (Nongshim RedForce) — 45 finishes",
    bestIgl: AWARDS.bestIgl || "SOEZ (Nongshim RedForce)",
    bestClutches: AWARDS.bestClutch || "Taurus (K9 Esports)",
    fanFavourite: AWARDS.grenadier
      ? `The Grenadier · ${AWARDS.grenadier}`
      : "The Grenadier · XZY1 (Nongshim RedForce)",
    extraHighlights: [
      { game: "BGMI", milestone: "Best clutch · Taurus (K9) — multi-elim survival under circle pressure" },
      { game: "BGMI", milestone: "XZY1 swept Tournament MVP (45 finishes) + The Grenadier" },
      { game: "BGMI", milestone: "SOEZ Best IGL — 5 WWCD rotations for Nongshim RedForce" },
      { game: "BGMI", milestone: "India best: Gladiators 4th · Outrage 5th · K9 6th" },
    ],
  };
}

function windowDoc({ id, slug, game, title, kicker, summary, floatingPriority, windowKey }) {
  return {
    id,
    surface: "vault",
    eventStatus: "completed",
    slug,
    title,
    game,
    kicker,
    summary,
    poster: POSTERS[game] || POSTERS.BGMI,
    posterSource: "preset",
    season: "2026",
    eventScope: "international",
    region: "International",
    activeStage: "Grand Final",
    liveEmbedUrl: "",
    liveSnapshot: snap.snapshot || "Final · After 18 matches",
    floating: true,
    floatingPriority,
    enabled: true,
    inFilters: true,
    source: windowKey,
    windowKey,
    ...awards(),
    pointsTable: pointsTable(),
    relatedTournaments: [
      { year: "2026", name: "BMIC Champion", region: "South Korea", result: "Nongshim RedForce" },
      { year: "2026", name: "India best finish", region: "India", result: "Gladiators Esports · 4th" },
    ],
    createdAt: NOW,
    updatedAt: NOW,
  };
}

const docs = [
  windowDoc({
    id: "live-bmic-2026",
    slug: "bmic-2026-live",
    game: "BGMI",
    title: snap.event || "BGMI International Cup (BMIC) 2026",
    kicker: "BMIC · Final after 18",
    summary: BRIEF,
    floatingPriority: 97,
    windowKey: "bmic-bgmi",
  }),
  windowDoc({
    id: "bmic-2026-pubg-mobile",
    slug: "bmic-2026-pubg-mobile",
    game: "PUBG Mobile",
    title: "BMIC 2026 · PUBG Mobile desk",
    kicker: "PUBG Mobile · BMIC final",
    summary: `${BRIEF} Filed on the PUBG Mobile desk so BGMI and PUBG Mobile filters each keep their own window.`,
    floatingPriority: 96,
    windowKey: "bmic-pubg-mobile",
  }),
];

const [a, b] = docs;
if (a.id === b.id || a.slug === b.slug || a.game === b.game) {
  throw new Error("BMIC windows share id/slug/game and would merge");
}

function loadFirebaseCliTokens() {
  const confPath = join(homedir(), ".config", "configstore", "firebase-tools.json");
  const conf = JSON.parse(readFileSync(confPath, "utf8"));
  const tokens = conf?.tokens;
  if (!tokens?.access_token) throw new Error(`No Firebase CLI access token in ${confPath}`);
  if (Number(tokens.expires_at || 0) <= Date.now() + 60_000) {
    throw new Error("Firebase CLI access token expired — run `npx firebase login --reauth`");
  }
  return tokens;
}

function toFirestoreValue(value) {
  if (value === null || value === undefined) return { nullValue: "NULL_VALUE" };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value };
  }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toFirestoreValue) } };
  if (typeof value === "object") {
    const fields = {};
    for (const [k, v] of Object.entries(value)) fields[k] = toFirestoreValue(v);
    return { mapValue: { fields } };
  }
  return { stringValue: String(value) };
}

function toFirestoreFields(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    fields[k] = toFirestoreValue(v);
  }
  return fields;
}

const writes = docs.map((data) => ({
  update: {
    name: `${DOC_ROOT}/circuitCms/${data.id}`,
    fields: toFirestoreFields(data),
  },
}));

const accessToken = loadFirebaseCliTokens().access_token;
const res = await fetch(
  `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:commit`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ writes }),
  },
);
const text = await res.text();
if (!res.ok) throw new Error(`Firestore commit failed ${res.status}: ${text}`);

console.log(JSON.stringify({
  ok: true,
  windows: docs.map((d) => ({
    id: d.id,
    slug: d.slug,
    game: d.game,
    title: d.title,
    rows: d.pointsTable.length,
  })),
}, null, 2));
