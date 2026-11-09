/**
 * One-shot publisher: blog + vault window + scrims for Andhra Yuva Sankalp 2K26.
 * Auth: Firebase CLI refresh token from configstore (same login as `firebase login`).
 */
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const PROJECT = "scoreliner";
const OWNER_UID = "U915OgCjbTerGa8Ra17vpWpziFe2";
const NOW = Date.now();
const DOC_ROOT = `projects/${PROJECT}/databases/(default)/documents`;

const LINKS = {
  aysPortal: "https://www.andhrayuvasankalp.com/",
  aysTec: "https://teluguesportscommunity.in/andhra-yuva-sankalp",
  aysEsports: "https://andhrayuvasankalp.com/2k27/programs/tracks/esports-gaming",
  apChess: "https://apchess.org/",
  apChessRegister: "https://apchess.org/register",
  chessResults: "https://chess-results.com/",
  kraftonEsports: "https://krafton.in/esports/",
  bgmiCalendar: "https://esports.battlegroundsmobileindia.com/calendar",
};

const BLOG_ID = "ap-yuva-sankalp-2k26-report";
const VAULT_ID = "ap-yuva-sankalp-2k26";
const SCRIM_IDS = {
  bgmi: "scrim-ap-yuva-bgmi-2k26",
  freefire: "scrim-ap-yuva-ff-2k26",
  chess: "scrim-ap-yuva-chess-2k26",
};

const BLOG_CONTENT = `AP Competitive Gaming & Mind Sports Report: BGMI, Free Fire, and Chess Tournaments

Author / Reporter: Eswar Ayyala
Published for cross-platform distribution across gaming communities, esports blogs, and tech portals.

The competitive gaming and intellectual sports ecosystem in Andhra Pradesh is undergoing a massive transformation, supercharged by structured regional youth initiatives like Andhra Yuva Sankalp 2K26. By blending high-stakes mobile tactical esports with classical mind sports, these events provide a verified pathway for grassroots players to transition into professional competitive careers.

1. Battlegrounds Mobile India (BGMI) Championship
BGMI remains a cornerstone of mobile esports engagement across the state's districts, focusing on tactical squad synergy and strategic survival.
Format & Structure: Squad-based tournament format (4 primary players + 1 optional substitute). Strict mobile-only hardware mandates (emulators, triggers, tablets, and modified game clients are strictly banned).
Prize Pool & Highlights: Features dedicated regional prize pools designed to reward high-intensity fragging and precise zone rotations.
Ecosystem Path: Aligns with national-tier circuits governed by major tournament structures such as Krafton India Esports.

2. Free Fire Championship
As a favorite battle royale title across South Asian youth communities, Free Fire tournaments attract heavy participation from collegiate and independent rosters.
Format & Structure: Standard 4-player squad format with 1 optional substitute. Matches enforce anti-cheat guidelines, requiring valid government-issued photo IDs (Aadhaar, Voter ID, or Student ID) for LAN stage qualifiers.
Competitive Focus: Emphasizes close-quarter combat execution, map rotation awareness, and efficient utility management across knockout phases.

3. Chess Championship
Bridging traditional tactical depth with modern digital infrastructure, chess tournaments encompass rapid online qualifiers and physical arenas.
Format & Rules: Adheres strictly to FIDE Rapid rules. Online preliminary stages utilize formats such as 10-minute base clocks with 5-second increments under Swiss-system pairings, culminating in live arena LAN finals.
Official Bodies & Regular Events: Managed actively via platforms like the Andhra Chess Association and tracking portals like Chess-Results.

Step-by-Step Installation & Registration Guide
If you are a player, team captain, or organizer looking to register and set up your profile for these official tournaments, follow these detailed steps:

Step 1: Check Eligibility & Prepare Documents
Age & Residency: Open to youth and students aged 16–35 years residing, studying, or working across the districts of Andhra Pradesh.
Document Readiness: Keep digital copies or clear photos of a valid government-issued photo ID (Aadhaar Card, Voter ID, or Institutional Student ID) ready for upload.

Step 2: Access the Official Portal
Head over to the central platform via the Andhra Yuva Sankalp Competitions Portal.
For specialized chess profiling and ratings verification, set up your profile directly on the Andhra Pradesh Chess Association Registration Portal.

Step 3: Register Your Game or Sport Category
For BGMI / Free Fire: Select your respective game tournament link on the dashboard. Designate a Team Captain who will manage official communications. Submit all 4 player In-Game Names (IGN), In-Game IDs (IGID), and student/government ID proofs. Ensure your account meets minimum level criteria (e.g., Level 20+ for BGMI).
For Chess: Fill out your personal details, date of birth, and district information on the AP Chess Association Register Page. Input your FIDE ID and AICF ID if applicable.

Step 4: Verify Technical Compliance & Device Setup
Mobile-Only Check: Ensure your device is a standard smartphone. Check that your game client is unmodified and that external triggers, iPads, tablets, or emulators are uninstalled to avoid immediate disqualification.
Check Communications: Watch your registered email inbox and community messaging channels for online qualifier lobby credentials, schedule briefings, and rule updates.

## Links
- Andhra Yuva Sankalp portal: ${LINKS.aysPortal}
- Andhra Yuva Sankalp (TEC overview): ${LINKS.aysTec}
- Gaming & Esports careers track: ${LINKS.aysEsports}
- Andhra Pradesh Chess Association: ${LINKS.apChess}
- AP Chess registration: ${LINKS.apChessRegister}
- Chess-Results: ${LINKS.chessResults}
- KRAFTON India Esports: ${LINKS.kraftonEsports}
- BGMI esports calendar: ${LINKS.bgmiCalendar}

Report compiled and prepared by Eswar Ayyala.`;

function isoDay(offsetDays = 0) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function loadFirebaseCliTokens() {
  const confPath = join(homedir(), ".config", "configstore", "firebase-tools.json");
  const conf = JSON.parse(readFileSync(confPath, "utf8"));
  const tokens = conf?.tokens;
  if (!tokens?.access_token) throw new Error(`No Firebase CLI access token in ${confPath}`);
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
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(toFirestoreValue) } };
  }
  if (typeof value === "object") {
    const fields = {};
    for (const [k, v] of Object.entries(value)) fields[k] = toFirestoreValue(v);
    return { mapValue: { fields } };
  }
  return { stringValue: String(value) };
}

function toFirestoreFields(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) fields[k] = toFirestoreValue(v);
  return fields;
}

async function getAccessToken() {
  const tokens = loadFirebaseCliTokens();
  if (Number(tokens.expires_at || 0) <= Date.now() + 60_000) {
    throw new Error("Firebase CLI access token expired — run `npx firebase login --reauth` then retry");
  }
  return tokens.access_token;
}

async function commitWrites(writes, accessToken) {
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
  return text ? JSON.parse(text) : {};
}

const blog = {
  title: "AP Competitive Gaming & Mind Sports Report: BGMI, Free Fire, and Chess Tournaments",
  game: "BGMI",
  content: BLOG_CONTENT.slice(0, 12000),
  source: LINKS.aysPortal,
  authorId: OWNER_UID,
  authorName: "Eswar Ayyala",
  anonymous: false,
  status: "published",
  createdAt: NOW,
  updatedAt: NOW,
  reviewedAt: NOW,
  reviewedBy: OWNER_UID,
  eventScope: "region",
  analysisType: "event",
  analysisSubject: "Andhra Yuva Sankalp 2K26",
  youtubeUrl: "",
  docsUrl: LINKS.aysPortal,
  coverUrl: "",
};

const vault = {
  id: VAULT_ID,
  surface: "research",
  research: true,
  eventStatus: "upcoming",
  slug: VAULT_ID,
  title: "Andhra Yuva Sankalp 2K26 · BGMI, Free Fire & Chess",
  game: "BGMI",
  kicker: "Andhra Pradesh · Youth circuit",
  summary:
    "Regional youth pathway blending BGMI and Free Fire squads with FIDE Rapid chess under Andhra Yuva Sankalp 2K26. Mobile-only BR desks, ID-checked LAN stages, and AP Chess Association registration.",
  poster: "",
  posterSource: "preset",
  flyers: [],
  avatar: "",
  posterIndex: 0,
  floating: true,
  floatingPriority: 20,
  inFilters: true,
  region: "India",
  eventScope: "region",
  registrationUrl: LINKS.aysPortal,
  seasonTitle: "Andhra Yuva Sankalp 2K26",
  startAt: isoDay(0),
  endAt: isoDay(45),
  updatedAt: NOW,
  createdAt: NOW,
  relatedTournaments: [
    { year: "2026", name: "BGMI Championship · Andhra Yuva Sankalp", region: "Andhra Pradesh", result: "Open registration" },
    { year: "2026", name: "Free Fire Championship · Andhra Yuva Sankalp", region: "Andhra Pradesh", result: "Open registration" },
    { year: "2026", name: "Chess Championship · FIDE Rapid / AP Chess", region: "Andhra Pradesh", result: "Register via AP Chess" },
  ],
  editions: [
    {
      year: 2026,
      event: "BGMI Championship · Andhra Yuva Sankalp 2K26",
      eventScope: "region",
      prizePool: "Regional prize pool",
      champion: "TBD",
      format: "Squad 4+1 · mobile-only",
      region: "Andhra Pradesh",
      notes: `Register: ${LINKS.aysPortal} · National path: ${LINKS.kraftonEsports}`,
    },
    {
      year: 2026,
      event: "Free Fire Championship · Andhra Yuva Sankalp 2K26",
      eventScope: "region",
      prizePool: "Regional prize pool",
      champion: "TBD",
      format: "Squad 4+1 · ID-checked LAN",
      region: "Andhra Pradesh",
      notes: `Register: ${LINKS.aysPortal} · Overview: ${LINKS.aysTec}`,
    },
    {
      year: 2026,
      event: "Chess Championship · FIDE Rapid · Andhra Yuva Sankalp 2K26",
      eventScope: "region",
      prizePool: "Regional / association circuit",
      champion: "TBD",
      format: "Swiss 10+5 · LAN finals",
      region: "Andhra Pradesh",
      notes: `AP Chess register: ${LINKS.apChessRegister} · Results: ${LINKS.chessResults}`,
    },
  ],
  yearlyStats: [{ year: 2026, tournamentCount: 3, circuit: "Andhra Yuva Sankalp", region: "India" }],
};

function scrim({ id, name, game, blurb, startOffset, registrationUrl }) {
  return {
    id,
    name,
    game,
    format: game === "Chess" ? "Swiss · 10+5" : "Custom room",
    kind: game === "Chess" ? "bracket" : "custom_room",
    status: "upcoming",
    joinMode: "open",
    published: true,
    publishedAt: NOW,
    registrationOpen: true,
    startDate: isoDay(startOffset),
    endDate: isoDay(startOffset),
    prizeAmount: 0,
    prizeCurrency: "INR",
    maxSlots: game === "Chess" ? 32 : 20,
    region: "India",
    rankBand: "Intermediate",
    blurb: `${blurb} Register: ${registrationUrl}`,
    adminUserId: OWNER_UID,
    adminDisplayName: "Eswar Ayyala",
    coAdminUserIds: [],
    artwork: "",
    posterUrl: "",
    publicStats: true,
    requireRequest: false,
    requireCheckIn: false,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

const scrims = [
  scrim({
    id: SCRIM_IDS.bgmi,
    name: "AP Yuva Sankalp · BGMI Championship Desk",
    game: "BGMI",
    startOffset: 3,
    blurb: "Andhra Pradesh youth BGMI squad desk (4+1). Mobile-only · no emulators/triggers.",
    registrationUrl: LINKS.aysPortal,
  }),
  scrim({
    id: SCRIM_IDS.freefire,
    name: "AP Yuva Sankalp · Free Fire Championship Desk",
    game: "Free Fire",
    startOffset: 5,
    blurb: "Collegiate / independent Free Fire squads. Photo ID required for LAN qualifiers.",
    registrationUrl: LINKS.aysPortal,
  }),
  scrim({
    id: SCRIM_IDS.chess,
    name: "AP Yuva Sankalp · Chess Rapid Desk",
    game: "Chess",
    startOffset: 7,
    blurb: "FIDE Rapid pathway via Andhra Chess Association. Swiss online → LAN finals.",
    registrationUrl: LINKS.apChessRegister,
  }),
];

const docs = [
  ["blogPosts", BLOG_ID, blog],
  ["blogPrivate", BLOG_ID, {
    authorId: OWNER_UID,
    requesterName: "Eswar Ayyala",
    anonymous: false,
    createdAt: NOW,
  }],
  ["circuitCms", VAULT_ID, vault],
  ...scrims.map((item) => ["tournaments", item.id, item]),
  ["staffActions", `publish-${BLOG_ID}`, {
    action: "blog_published",
    targetType: "blog",
    targetId: BLOG_ID,
    targetLabel: blog.title.slice(0, 120),
    actorUid: OWNER_UID,
    actorName: "Eswar Ayyala",
    summary: "Published AP Yuva Sankalp 2K26 competitive gaming report",
    createdAt: NOW,
  }],
];

const writes = docs.map(([collection, id, data]) => ({
  update: {
    name: `${DOC_ROOT}/${collection}/${id}`,
    fields: toFirestoreFields(data),
  },
}));

const accessToken = await getAccessToken();
await commitWrites(writes, accessToken);
console.log(JSON.stringify({
  ok: true,
  blogId: BLOG_ID,
  vaultId: VAULT_ID,
  scrimIds: Object.values(SCRIM_IDS),
  contentChars: blog.content.length,
  writeCount: writes.length,
}, null, 2));
