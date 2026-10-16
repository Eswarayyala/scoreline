import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  doc,
  collection,
  onSnapshot,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import {
  onAuthStateChanged,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { Link, Navigate, Route, Routes, useNavigate, useLocation } from "react-router-dom";
import { db, auth, realtimeDb, signInWithGoogle, completeGoogleSignInReturn } from "./firebase";
import PlatformHome from "./components/layout/PlatformHome";
import HubSections from "./components/layout/HubSections";
import PublicNav from "./components/layout/PublicNav";
import TournamentOpsRail from "./components/layout/TournamentOpsRail";
import VaultDetailPage from "./components/vault/VaultDetailPage";
import VaultLibraryPage from "./components/vault/VaultLibraryPage";
import EwcDirectoryPage from "./components/vault/EwcDirectoryPage";
import VaultResearchDesk from "./components/cms/VaultResearchDesk";
import { avatarForGamer, bannerForGame, flyerForEvent } from "./data/platformShowcase";
import CircuitCmsDesk from "./components/cms/CircuitCmsDesk";
import { useCircuitCms } from "./hooks/useCircuitCms";
import { useEsportsMedia } from "./hooks/useEsportsMedia";
import { fetchGamePoster, mergeVaultMedia } from "./services/esportsMedia";
import { FILTER_GAMES } from "./data/gameCatalog";
import { ewcFloatingSlides } from "./data/esportsResearch";
import { EVENT_SCOPES, applyEventToVault, findGameVault, inferEventScope, normalizeGameKey, publicScopeKicker } from "./data/eventScope";
import { getFunctions, httpsCallable } from "firebase/functions";
import { onValue, ref as databaseRef, onDisconnect, serverTimestamp, set as setDatabaseValue } from "firebase/database";

const PLAYERS_COLLECTION = collection(db, "players");
const playerDocRef = (uid) => doc(db, "players", uid);

const TOURNAMENTS_COLLECTION = collection(db, "tournaments");
const tournamentDocRef = (id) => doc(db, "tournaments", id);
const teamsCollectionRef = (tid) => collection(db, "tournaments", tid, "teams");
const matchesCollectionRef = (tid) => collection(db, "tournaments", tid, "matches");
const statsCollectionRef = (tid) => collection(db, "tournaments", tid, "stats");
const registrationsCollectionRef = (tid) => collection(db, "tournaments", tid, "registrations");
const lobbyCredentialsRef = (tid) => doc(db, "tournaments", tid, "lobby", "credentials");
const REPORTS_COLLECTION = collection(db, "reports");
const FRIEND_REQUESTS_COLLECTION = collection(db, "friendRequests");
const TOURNAMENT_INVITES_COLLECTION = collection(db, "tournamentInvites");
const CHAT_CONVERSATIONS_COLLECTION = collection(db, "conversations");
const CHAT_MESSAGES_COLLECTION = (conversationId) => collection(db, "conversations", conversationId, "messages");
const ARCHIVE_COLLECTION = collection(db, "esportsArchive");
const BLOG_POSTS_COLLECTION = collection(db, "blogPosts");
const SITE_POPUPS_COLLECTION = collection(db, "sitePopups");
const SITE_ROLES_COLLECTION = collection(db, "siteRoles");
const SITE_BANS_COLLECTION = collection(db, "siteBans");
const ARCHIVE_SUBMISSIONS_COLLECTION = collection(db, "archiveSubmissions");
const STAFF_ACTIONS_COLLECTION = collection(db, "staffActions");
const PRIZE_PRESETS = [0, 500, 1000, 2500, 5000, 10000];
const REPORT_REASONS = ["Abuse or harassment", "Scam or fraud", "Inappropriate content", "Other"];

const FONT_LINK_ID = "scoreline-fonts";

function useWindowLocation() {
  const [loc, setLoc] = useState(() => ({
    pathname: window.location.pathname,
    search: window.location.search,
    hash: window.location.hash,
    state: null,
    key: "window",
  }));
  useEffect(() => {
    const read = () => setLoc({
      pathname: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
      state: window.history.state,
      key: `${window.location.pathname}${window.location.search}${window.location.hash}`,
    });
    window.addEventListener("popstate", read);
    const pushState = window.history.pushState.bind(window.history);
    const replaceState = window.history.replaceState.bind(window.history);
    window.history.pushState = (...args) => { pushState(...args); read(); };
    window.history.replaceState = (...args) => { replaceState(...args); read(); };
    return () => {
      window.removeEventListener("popstate", read);
      window.history.pushState = pushState;
      window.history.replaceState = replaceState;
    };
  }, []);
  return loc;
}

function ensureFonts() {
  if (typeof document === "undefined") return;
  if (document.getElementById(FONT_LINK_ID)) return;
  const link = document.createElement("link");
  link.id = FONT_LINK_ID;
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap";
  document.head.appendChild(link);
}

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

function isEmailLike(value) {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function safeProfileName(...names) {
  return names.find((name) => typeof name === "string" && name.trim() && !isEmailLike(name))?.trim().slice(0, 40) || "Player";
}

const PLAYER_NAME_PATTERN = /^[A-Za-z0-9_]{3,16}$/;
const PLAYER_TAG_PATTERN = /^\d{4}$|^\d{8}$/;

function playerNameFromInput(value) {
  const raw = String(value || "").trim();
  return (raw.includes("#") ? raw.slice(0, raw.indexOf("#")) : raw).trim();
}

function extractPlayerTag(value) {
  return String(value || "").trim().replace(/^.*#/, "");
}

function isValidPlayerName(value) {
  return PLAYER_NAME_PATTERN.test(playerNameFromInput(value));
}

function grindHandle(name, tag) {
  const clean = playerNameFromInput(name) || "Player";
  return tag ? `${clean}#${tag}` : clean;
}

function playerMatchesQuery(player, raw) {
  const q = String(raw || "").trim().toLowerCase();
  if (!q) return true;
  const name = String(player.displayName || player.name || "").toLowerCase();
  const handle = String(player.handle || "").toLowerCase();
  const tag = String(player.playerTag || "");
  const id = grindHandle(player.displayName || player.name, player.playerTag).toLowerCase();
  if (q.includes("#")) return id === q || handle === q || tag === extractPlayerTag(raw);
  return name.includes(q) || handle.includes(q) || id.includes(q) || tag.includes(q.replace(/^#/, ""));
}

function normalizeHandle(value) {
  const name = playerNameFromInput(value).toLowerCase();
  const tag = extractPlayerTag(value);
  if (!value || !String(value).includes("#") || !PLAYER_NAME_PATTERN.test(name) || !PLAYER_TAG_PATTERN.test(tag)) return "";
  return `${name}#${tag}`;
}

function handleDocId(handle) {
  const normalized = normalizeHandle(handle);
  if (!normalized) return "";
  const [name, tag] = normalized.split("#");
  return `${name}::${tag}`;
}

const handleDocRef = (handle) => doc(db, "handles", handleDocId(handle));

const KNOWN_ACCOUNTS_KEY = "grindinfo-known-accounts";
const DUMMY_TESTER_EMAIL = "dummybot.grindinfo@gmail.com";

function readKnownAccounts() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KNOWN_ACCOUNTS_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((item) => item && (item.email || item.handle)).slice(0, 8) : [];
  } catch {
    return [];
  }
}

function rememberKnownAccount(entry) {
  if (!entry?.uid && !entry?.email) return;
  const current = readKnownAccounts().filter((item) => item.uid !== entry.uid && item.email !== entry.email);
  localStorage.setItem(KNOWN_ACCOUNTS_KEY, JSON.stringify([{ ...entry, seenAt: Date.now() }, ...current].slice(0, 8)));
}

function randomPlayerTag() {
  return String(Math.floor(Math.random() * 10000)).padStart(4, "0");
}

async function claimUniqueHandle(user, displayName, currentTag = "") {
  const name = playerNameFromInput(displayName);
  if (!user?.uid || !isValidPlayerName(name)) throw new Error("Choose a valid player name first.");
  const email = user.email || "";
  const tryClaim = async (tag) => {
    const handle = `${name.toLowerCase()}#${tag}`;
    await setDoc(handleDocRef(handle), { uid: user.uid, email, handle, createdAt: Date.now() });
    return { tag, handle };
  };
  if (currentTag && PLAYER_TAG_PATTERN.test(currentTag)) {
    const handle = `${name.toLowerCase()}#${currentTag}`;
    const existing = await getDoc(handleDocRef(handle));
    if (!existing.exists()) return tryClaim(currentTag);
    if (existing.data()?.uid === user.uid) return { tag: currentTag, handle };
    throw new Error("That username plus code is already taken. Choose another name.");
  }
  for (let attempt = 0; attempt < 48; attempt += 1) {
    const tag = randomPlayerTag();
    const handle = `${name.toLowerCase()}#${tag}`;
    const existing = await getDoc(handleDocRef(handle));
    if (existing.exists()) continue;
    try { return await tryClaim(tag); }
    catch { /* another player claimed this ID in the same moment */ }
  }
  throw new Error("Couldn't assign a unique GrindInfo ID. Try a different name.");
}

const LEGACY_GAME_NAMES = { "PUBG Mobile (BGMI)": "BGMI and PUBG Mobile" };

function normalizeGameName(game) {
  return LEGACY_GAME_NAMES[game] || game;
}

function normalizeGameNames(games = []) {
  return [...new Set(games.map(normalizeGameName))];
}

const REGIONS = [
  "North America",
  "South America",
  "Europe",
  "South Asia",
  "Southeast Asia",
  "India",
  "East Asia",
  "Middle East",
  "Oceania",
  "Africa",
];

const LANGUAGES = [
  "English",
  "Hindi",
  "Tamil",
  "Telugu",
  "Kannada",
  "Malayalam",
  "Bengali",
  "Marathi",
  "Punjabi",
  "Gujarati",
  "Urdu",
  "Spanish",
  "Portuguese",
  "Filipino",
  "Indonesian",
  "Arabic",
  "French",
  "German",
  "Russian",
  "Korean",
  "Japanese",
  "Mandarin",
  "Vietnamese",
  "Thai",
  "Other",
];

const PLAY_STYLES = [
  "IGL / Shotcaller",
  "Entry / Aggressive",
  "Support",
  "Sniper / Precision",
  "Flex / All-rounder",
];
const LOOKING_FOR = ["Duo", "Squad", "Ranked", "Casual", "Tournament"];
const RANK_BANDS = ["Unranked", "Beginner", "Intermediate", "High rank", "Pro / scrim"];

function normalizeLookingFor(list = []) {
  return [...new Set((Array.isArray(list) ? list : []).filter((item) => LOOKING_FOR.includes(item)))];
}

function normalizeRank(rank) {
  return RANK_BANDS.includes(rank) ? rank : "";
}

function similarityMatch(me, them) {
  if (!me) return { score: 0, reasons: [] };
  const myGames = new Set(normalizeGameNames(me.games || []));
  const sharedGames = normalizeGameNames(them.games || []).filter((game) => myGames.has(game));
  const myWants = new Set(normalizeLookingFor(me.lookingFor));
  const sharedWants = normalizeLookingFor(them.lookingFor).filter((want) => myWants.has(want));
  const reasons = [];
  let score = 0;
  if (sharedGames.length) {
    score += sharedGames.length * 5;
    reasons.push(`Same game: ${sharedGames.slice(0, 2).join(", ")}`);
  }
  if (me.region && them.region === me.region) {
    score += 4;
    reasons.push("Same region");
  }
  if (me.language && them.language === me.language) {
    score += 3;
    reasons.push("Same language");
  }
  if (sharedWants.length) {
    score += sharedWants.length * 2;
    reasons.push(`Also looking for ${sharedWants.slice(0, 2).join(", ")}`);
  }
  if (me.style && them.style && them.style === me.style) {
    score += 2;
    reasons.push("Same play style");
  }
  if (me.rank && them.rank && them.rank === me.rank) {
    score += 2;
    reasons.push("Same rank band");
  }
  return { score, reasons };
}
const PLAYER_AVATARS = ["🎮", "⚡", "🎯", "🛡️", "🔥", "❄️", "🐺", "🦊", "🦁", "🤖", "👾", "🌟"];
const GAME_ICONS = {
  "Valorant": "🎯",
  "League of Legends": "🛡️",
  "CS2": "🎯",
  "Dota 2": "🔮",
  "Overwatch 2": "🦾",
  "Rocket League": "🚗",
  "Apex Legends": "🏹",
  "BGMI": "🎮",
  "PUBG Mobile": "🎮",
  "PUBG PC": "🎖️",
  "Mobile Legends: Bang Bang": "⚔️",
  "Free Fire": "🔥",
  "Call of Duty": "🎖️",
  "Fortnite": "🪂",
  "Rainbow Six Siege": "🛡️",
  "Honor of Kings": "👑",
  "Clash Royale": "👑",
  "Brawl Stars": "⭐",
  "StarCraft 2": "🚀",
  "Teamfight Tactics": "♟️",
  "Other": "🎮",
};
const QUICK_PICK_GAMES = ["Valorant", "BGMI", "PUBG Mobile", "Apex Legends"];
const BIO_EXAMPLES = [
  { label: "Friendly", text: "Here to improve, have fun, and find a friendly squad." },
  { label: "Competitive", text: "Focused on ranked games, clear comms, and steady improvement." },
  { label: "Flexible", text: "Happy to fill roles and play a few games when schedules line up." },
];

const THEME_CSS = `[data-theme="solar-flare"] [style*="var(--panel-bg)"] { box-shadow: var(--panel-shadow); }`;

const FORMATS = ["Single elimination", "Double elimination", "Round robin", "Swiss", "Group stage", "Custom room"];

const STATUS_COLORS = {
  upcoming: "var(--text-muted)",
  live: "var(--accent-secondary)",
  closed: "var(--text-dim)",
  completed: "var(--accent)",
};

function isCustomRoomEvent(t) {
  return t?.kind === "custom_room" || t?.format === "Custom room";
}

function approvedCount(requests = []) {
  return requests.filter((request) => request.status === "approved").length;
}

function isTournamentFull(t, requests = []) {
  const max = Number(t?.maxSlots) || 0;
  return max > 0 && approvedCount(requests) >= max;
}

function isReportArchived(report) {
  return report?.status === "closed" || report?.status === "archived";
}

function isTournamentArchived(t) {
  if (t.archived === true || t.status === "completed" || t.status === "closed") return true;
  const date = t.endDate || t.startDate;
  if (!date) return false;
  const cutoff = new Date(`${date}T23:59:59`).getTime() + 7 * 24 * 60 * 60 * 1000;
  return Date.now() > cutoff;
}

function hasPostedResults(t) {
  const results = t?.results;
  if (!results || typeof results !== "object") return false;
  return ["winner", "mvp", "runnerUp", "secondRunnerUp"].some((key) => String(results[key] || "").trim());
}

function managesTournament(t, uid) {
  if (!t || !uid) return false;
  return t.adminUserId === uid || (Array.isArray(t.coAdminUserIds) && t.coAdminUserIds.includes(uid));
}

function DeskFold({ title, defaultOpen = false, children }) {
  return (
    <details open={defaultOpen} style={{ marginTop: 16, background: "var(--panel-bg)", border: "1px solid var(--border)" }}>
      <summary
        style={{
          cursor: "pointer",
          padding: "14px 16px",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 12,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
        }}
      >
        {title}
      </summary>
      <div style={{ padding: "0 16px 16px" }}>{children}</div>
    </details>
  );
}

function fmtDate(d) {
  if (!d) return "TBD";
  try {
    const dt = new Date(d + "T00:00:00");
    return dt.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return d;
  }
}

function kda(k, d, a) {
  const kills = Number(k) || 0;
  const deaths = Number(d) || 0;
  const assists = Number(a) || 0;
  return ((kills + assists) / Math.max(1, deaths)).toFixed(2);
}

// ---------- shared UI atoms ----------

function Eyebrow({ children, color = "var(--accent)" }) {
  return (
    <div
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color,
        fontWeight: 700,
      }}
    >
      {children}
    </div>
  );
}

function GameIcon({ game, size = 30 }) {
  return (
    <span
      aria-hidden="true"
      className="inline-grid shrink-0 overflow-hidden rounded-md border border-white/10"
      style={{ width: size, height: size }}
    >
      <img src={bannerForGame(game)} alt="" className="aspect-square h-full w-full object-cover" />
    </span>
  );
}

function Divider() {
  return <div style={{ height: 1, background: "var(--border)", width: "100%" }} />;
}

function Button({ children, onClick, variant = "primary", type = "button", style, disabled }) {
  const base = {
    fontFamily: "'Inter', sans-serif",
    fontSize: 13,
    fontWeight: 600,
    padding: "10px 18px",
    border: "1px solid transparent",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    letterSpacing: "0.02em",
    transition: "background 120ms ease, border-color 120ms ease, color 120ms ease",
  };
  const variants = {
    primary: { background: "var(--accent)", color: "var(--accent-contrast)", borderColor: "var(--accent)" },
    ghost: { background: "transparent", color: "var(--page-text)", borderColor: "var(--border-strong)" },
    danger: { background: "transparent", color: "var(--danger)", borderColor: "var(--danger-border)" },
  };
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      onFocus={(e) => (e.currentTarget.style.outline = "2px solid var(--accent-secondary)")}
      onBlur={(e) => (e.currentTarget.style.outline = "none")}
      style={{ ...base, ...variants[variant], ...style }}
    >
      {children}
    </button>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, fontFamily: "'Inter', sans-serif" }}>
      <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>{label}</span>
      {children}
    </label>
  );
}

const inputStyle = {
  background: "var(--input-bg)",
  border: "1px solid var(--border-strong)",
  color: "var(--page-text)",
  padding: "10px 12px",
  fontSize: 14,
  fontFamily: "'Inter', sans-serif",
  outline: "none",
};

function TextInput(props) {
  return (
    <input
      {...props}
      style={{ ...inputStyle, ...(props.style || {}) }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = "var(--accent-secondary)";
        props.onFocus && props.onFocus(e);
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = "var(--border-strong)";
        props.onBlur && props.onBlur(e);
      }}
    />
  );
}

function Select(props) {
  return (
    <select
      {...props}
      style={{ ...inputStyle, ...(props.style || {}) }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = "var(--accent-secondary)";
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = "var(--border-strong)";
      }}
    >
      {props.children}
    </select>
  );
}

function EmptyState({ title, body, actionLabel, onAction }) {
  return (
    <div
      style={{
        border: "1px dashed var(--border-strong)",
        padding: "48px 24px",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 14,
      }}
    >
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, color: "var(--page-text)", letterSpacing: "0.02em" }}>
        {title}
      </div>
      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "var(--text-muted)", maxWidth: 380 }}>{body}</div>
      {actionLabel && <Button onClick={onAction}>{actionLabel}</Button>}
    </div>
  );
}

function Toast({ message }) {
  if (!message) return null;
  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        left: "50%",
        transform: "translateX(-50%)",
        background: "var(--panel-raised)",
        border: "1px solid var(--border-strong)",
        color: "var(--page-text)",
        padding: "10px 18px",
        fontSize: 13,
        fontFamily: "'Inter', sans-serif",
        zIndex: 50,
        boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
      }}
    >
      {message}
    </div>
  );
}

// ---------- auth screen ----------

function AuthScreen({ onGoogleSignIn, onEmailAuth, authError, authBusy, onBrowseAsGuest, onClose, requireChoice, knownAccounts = [] }) {
  const [mode, setMode] = useState("signin"); // 'signin' | 'signup'
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const accountChoices = [
    { email: DUMMY_TESTER_EMAIL, label: "Dummybot tester", handle: "dummybot", provider: "password" },
    ...knownAccounts,
  ].filter((item, index, list) => {
    const key = String(item.email || item.handle || "").toLowerCase();
    return key && list.findIndex((other) => String(other.email || other.handle || "").toLowerCase() === key) === index;
  });

  const submit = (e) => {
    e.preventDefault();
    if (mode === "signup" && !isValidPlayerName(name)) return;
    onEmailAuth(mode, { name: playerNameFromInput(name), email: mode === "signup" ? email : identifier, password });
  };

  return (
    <div role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !requireChoice) onClose(); }} style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", justifyContent: requireChoice ? "center" : "flex-end", alignItems: requireChoice ? "center" : "flex-start", padding: requireChoice ? 20 : "82px max(16px, calc((100vw - 980px) / 2)) 16px", background: requireChoice ? "var(--page-bg-solid)" : "transparent", pointerEvents: requireChoice ? "auto" : "none", fontFamily: "'Inter', sans-serif" }}>
      <div role="dialog" aria-modal={requireChoice ? "true" : "false"} aria-label="Sign in to GrindInfo" onMouseDown={(event) => event.stopPropagation()} style={{ width: "min(380px, 100%)", maxHeight: "calc(100vh - 100px)", overflowY: "auto", padding: 20, color: "var(--page-text)", background: "var(--panel-bg)", border: "1px solid var(--border-strong)", boxShadow: "var(--panel-shadow)", pointerEvents: "auto" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: "var(--page-text)", letterSpacing: "0.04em" }}>GRINDINFO</div>
            <Eyebrow color="var(--accent-secondary)">Sign in for player features</Eyebrow>
          </div>
          {!requireChoice && <button type="button" aria-label="Close sign in" onClick={onClose} style={{ background: "none", border: 0, color: "var(--text-muted)", fontSize: 22, cursor: "pointer" }}>×</button>}
        </div>

        <div style={{ color: "var(--text-muted)", fontSize: 12, lineHeight: 1.5, marginBottom: 12 }}>Your main account uses Continue with Google. Dummybot uses email and password. Only one account is signed in at a time.</div>

        {accountChoices.length > 0 && mode === "signin" && (
          <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
            <Eyebrow>Accounts on this device</Eyebrow>
            {accountChoices.map((account) => (
              <Button
                key={account.email || account.handle}
                variant="ghost"
                style={{ width: "100%", textAlign: "left" }}
                onClick={() => {
                  if (account.provider === "google") {
                    onGoogleSignIn();
                    return;
                  }
                  setMode("signin");
                  setIdentifier(account.email || account.handle || "");
                }}
              >
                {account.label || account.handle || account.email}
                <span style={{ display: "block", fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}>{account.provider === "google" ? "Continue with Google" : (account.email || "Email and password")}</span>
              </Button>
            ))}
          </div>
        )}

        <Button variant="ghost" onClick={onBrowseAsGuest} style={{ width: "100%", marginBottom: 12 }}>Browse as guest</Button>

        <button
          onClick={onGoogleSignIn}
          disabled={authBusy}
          style={{
            width: "100%",
            background: "var(--google-bg)",
            color: "var(--google-text)",
            border: "none",
            padding: "12px 16px",
            fontFamily: "'Inter', sans-serif",
            fontWeight: 700,
            fontSize: 14,
            cursor: authBusy ? "not-allowed" : "pointer",
            opacity: authBusy ? 0.6 : 1,
            marginBottom: 8,
          }}
        >
          Continue with Google
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "12px 0" }}>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          <span style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "'JetBrains Mono', monospace" }}>OR</span>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        </div>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {mode === "signup" && (
            <>
            <Field label="Player name">
              <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="ghostpeak" maxLength={16} required />
            </Field>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: -6 }}>3–16 letters, numbers, or underscore. GrindInfo adds a #4-digit code, like ghostpeak#4821.</div>
            {name && !isValidPlayerName(name) && <div role="alert" style={{ fontSize: 12, color: "var(--danger)" }}>Use 3–16 letters, numbers, or underscore. Do not type the #code yourself.</div>}
            </>
          )}
          {mode === "signup" ? (
            <Field label="Email">
              <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
            </Field>
          ) : (
            <>
            <Field label="GrindInfo ID or email">
              <TextInput value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="email or Name#1234" autoComplete="username" required />
            </Field>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: -6 }}>Use your Name#1234 ID and password, or the email you registered.</div>
            </>
          )}
          <Field label="Password">
            <TextInput
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              minLength={6}
              required
            />
          </Field>

          {authError && <div style={{ fontSize: 13, color: "var(--danger)" }}>{authError}</div>}

          <Button type="submit" disabled={authBusy} style={{ marginTop: 4 }}>
            {mode === "signin" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <div style={{ textAlign: "center", marginTop: 14, fontSize: 13, color: "var(--text-muted)" }}>
          {mode === "signin" ? (
            <>
              New here?{" "}
              <button
                onClick={() => setMode("signup")}
                style={{ background: "none", border: "none", color: "var(--accent-secondary)", cursor: "pointer", fontSize: 13 }}
              >
                Create an account
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                onClick={() => setMode("signin")}
                style={{ background: "none", border: "none", color: "var(--accent-secondary)", cursor: "pointer", fontSize: 13 }}
              >
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- player profile ----------

function MultiToggle({ options, selected, onToggle }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 12,
              fontWeight: 600,
              padding: "7px 12px",
              border: `1px solid ${active ? "var(--accent)" : "var(--border-strong)"}`,
              background: active ? "rgba(255,194,46,0.12)" : "transparent",
              color: active ? "var(--accent)" : "var(--text-muted)",
              cursor: "pointer",
            }}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function ProfileModal({ initialProfile, defaultDisplayName, onSave, onSkip, onClose, gamesList = FILTER_GAMES }) {
  const [displayName, setDisplayName] = useState(safeProfileName(initialProfile?.displayName, defaultDisplayName));
  const [games, setGames] = useState(normalizeGameNames(initialProfile?.games || []));
  const [region, setRegion] = useState(initialProfile?.region || "");
  const [language, setLanguage] = useState(initialProfile?.language || "");
  const [style, setStyle] = useState(initialProfile?.style || "");
  const [lookingFor, setLookingFor] = useState(normalizeLookingFor(initialProfile?.lookingFor));
  const [rank, setRank] = useState(normalizeRank(initialProfile?.rank));
  const [bio, setBio] = useState(initialProfile?.bio || "");
  const [avatar, setAvatar] = useState(initialProfile?.avatar || "🎮");
  const [discoverable, setDiscoverable] = useState(initialProfile?.discoverable === true);
  const [error, setError] = useState("");

  const toggleGame = (g) => {
    setGames((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  };

  const submit = () => {
    const name = playerNameFromInput(displayName);
    if (!isValidPlayerName(name) || isEmailLike(name)) {
      setError("Use 3–16 letters, numbers, or underscore. Your public ID is Name#1234.");
      return;
    }
    if (games.length === 0 || !region || !language) {
      setError("Pick at least one game, a region, and a language");
      return;
    }
    onSave({
      displayName: name,
      games,
      region,
      language,
      style,
      lookingFor: normalizeLookingFor(lookingFor),
      rank: normalizeRank(rank),
      bio: bio.trim(),
      avatar,
      discoverable,
    });
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(4,6,8,0.75)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        zIndex: 40,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--panel-bg)",
          border: "1px solid var(--border)",
          padding: 28,
          width: "100%",
          maxWidth: 520,
          maxHeight: "85vh",
          overflowY: "auto",
        }}
      >
        <Eyebrow>Find teammates</Eyebrow>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, margin: "4px 0 6px" }}>
          Set up your player profile
        </div>
        <div style={{ color: "var(--accent-secondary)", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, marginTop: 8 }}>Your GrindInfo ID: {grindHandle(displayName, initialProfile?.playerTag || "••••")}</div>
        <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>
          Your profile stays out of player search unless you choose to be discoverable. Use a gaming name and keep personal contact details private.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ background: "var(--panel-raised)", border: "1px solid var(--border)", padding: 14 }}>
            <Eyebrow>Profile ideas</Eyebrow>
            <div style={{ fontSize: 13, color: "var(--text-muted)", margin: "6px 0 10px" }}>
              Pick a quick avatar and try a starter bio or game. You can change these any time.
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              {PLAYER_AVATARS.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-label={"Choose avatar " + option}
                  aria-pressed={avatar === option}
                  onClick={() => setAvatar(option)}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: "50%",
                    border: avatar === option ? "2px solid var(--accent)" : "1px solid var(--border)",
                    background: avatar === option ? "var(--panel-bg)" : "transparent",
                    color: "var(--page-text)",
                    fontSize: 18,
                    cursor: "pointer",
                  }}
                >
                  {option}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 6 }}>QUICK GAME PICKS</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
              {QUICK_PICK_GAMES.map((game) => (
                <Button
                  key={game}
                  variant={games.includes(game) ? "primary" : "ghost"}
                  style={{ padding: "6px 9px", fontSize: 11 }}
                  onClick={() => toggleGame(game)}
                >
                  {games.includes(game) ? "✓ " : "+ "}{game}
                </Button>
              ))}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 6 }}>BIO STARTERS</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {BIO_EXAMPLES.map((example) => (
                <Button
                  key={example.label}
                  variant="ghost"
                  style={{ padding: "6px 9px", fontSize: 11 }}
                  onClick={() => setBio(example.text)}
                >
                  {example.label}
                </Button>
              ))}
            </div>
          </div>
          <Field label="Player name">
            <TextInput value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={16} placeholder="ghostpeak" />
          </Field>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: -8 }}>3–16 letters, numbers, or underscore. The #4-digit code is assigned after you save.</div>
          <Field label="Games you play">
            <MultiToggle options={gamesList} selected={games} onToggle={toggleGame} />
          </Field>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 150 }}>
              <Field label="Region">
                <Select value={region} onChange={(e) => setRegion(e.target.value)}>
                  <option value="">Select…</option>
                  {REGIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <div style={{ flex: 1, minWidth: 150 }}>
              <Field label="Language">
                <Select value={language} onChange={(e) => setLanguage(e.target.value)}>
                  <option value="">Select…</option>
                  {LANGUAGES.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </div>
          <Field label="Playing style (optional)">
            <Select value={style} onChange={(e) => setStyle(e.target.value)}>
              <option value="">Not specified</option>
              {PLAY_STYLES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Looking for (optional)">
            <MultiToggle options={LOOKING_FOR} selected={lookingFor} onToggle={(want) => setLookingFor((previous) => previous.includes(want) ? previous.filter((item) => item !== want) : [...previous, want])} />
          </Field>
          <Field label="Rank band (optional)">
            <Select value={rank} onChange={(e) => setRank(e.target.value)}>
              <option value="">Not specified</option>
              {RANK_BANDS.map((band) => (
                <option key={band} value={band}>
                  {band}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Bio (optional)">
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 200))}
              maxLength={200}
              rows={3}
              placeholder="What kind of teammate are you looking for?"
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </Field>
          <label style={{ display: "flex", alignItems: "flex-start", gap: 10, color: "var(--page-text)", fontSize: 13 }}>
            <input
              type="checkbox"
              checked={discoverable}
              onChange={(e) => setDiscoverable(e.target.checked)}
              style={{ marginTop: 2, accentColor: "var(--accent-secondary)" }}
            />
            <span>
              <strong>Show me in player search</strong>
              <span style={{ display: "block", color: "var(--text-muted)", marginTop: 3 }}>
                Only turn this on if you want signed-in GrindInfo players to find this profile.
              </span>
            </span>
          </label>
        </div>

        {error && <div style={{ fontSize: 13, color: "var(--danger)", marginTop: 14 }}>{error}</div>}

        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 24 }}>
          <Button variant="ghost" onClick={onSkip}>
            Skip for now
          </Button>
          <Button onClick={submit}>Save profile</Button>
        </div>
      </div>
    </div>
  );
}

function PlayerCard({ player, currentUid, friendRequest, onFriendRequest, onFriendDecision, onReport, matchReasons = [] }) {
  const incoming = friendRequest?.status === "pending" && friendRequest.recipientId === currentUid;
  const sentByMe = friendRequest?.requesterId === currentUid;
  const friendLabel = !friendRequest
    ? "Add friend"
    : friendRequest.status === "accepted"
      ? "Friends"
      : friendRequest.status === "pending"
        ? (sentByMe ? "Request sent" : "Pending")
        : "Request declined";

  return (
    <div className="sl-card" style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", padding: "16px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, letterSpacing: "0.02em" }}>
        <span aria-hidden="true" className="inline-grid h-12 w-12 shrink-0 overflow-hidden rounded-full border border-white/10">
          <img src={avatarForGamer(player)} alt="" className="aspect-square h-full w-full object-cover" />
        </span>
        {player.displayName}
      </div>
      {player.playerTag && <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--accent-secondary)", marginTop: 3 }}>{grindHandle(player.displayName, player.playerTag)}</div>}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "8px 0" }}>
        {normalizeGameNames(player.games || []).map((g) => (
          <span
            key={g}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              padding: "3px 8px",
              border: "1px solid var(--border-strong)",
              color: "var(--accent-secondary)",
            }}
          >
            <GameIcon game={g} size={16} /> {g}
          </span>
        ))}
      </div>
      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "var(--text-muted)" }}>
        {player.region} · {player.language}
        {player.style ? ` · ${player.style}` : ""}
        {player.rank ? ` · ${player.rank}` : ""}
      </div>
      {normalizeLookingFor(player.lookingFor).length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
          {normalizeLookingFor(player.lookingFor).map((want) => (
            <span key={want} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, padding: "3px 8px", border: "1px solid var(--border)", color: "var(--page-text)" }}>{want}</span>
          ))}
        </div>
      )}
      {matchReasons.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
          {matchReasons.map((reason) => (
            <span key={reason} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, padding: "3px 8px", background: "var(--panel-raised)", color: "var(--accent-secondary)" }}>{reason}</span>
          ))}
        </div>
      )}
      {player.bio && <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "var(--page-text)", marginTop: 10 }}>{player.bio}</div>}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
        {incoming ? (
          <>
            <Button onClick={() => onFriendDecision(friendRequest.id, "accepted")}>Accept request</Button>
            <Button variant="danger" onClick={() => onFriendDecision(friendRequest.id, "declined")}>Decline</Button>
          </>
        ) : (
          <Button variant={friendRequest ? "ghost" : "primary"} disabled={Boolean(friendRequest)} onClick={() => onFriendRequest(player)}>
            {friendLabel}
          </Button>
        )}
        <Button variant="ghost" onClick={() => onReport(player)} style={{ padding: "7px 10px", fontSize: 11 }}>Report player</Button>
      </div>
    </div>
  );
}
function emptyPlayerSearch() {
  return { games: [], region: "", language: "", style: "", lookingFor: [], rank: "", name: "" };
}

function playerSearchActive(search) {
  if (!search) return false;
  const tag = extractPlayerTag(search.name);
  return Boolean(
    search.games.length
    || search.region
    || search.language
    || search.style
    || search.lookingFor.length
    || search.rank
    || (search.name.includes("#") && PLAYER_TAG_PATTERN.test(tag))
    || search.name.trim().length >= 2
  );
}

function FindPlayersPage({ currentUid, myProfile, friendRequests = [], onFriendRequest, onFriendDecision, onReport, onEditProfile, embedded = false, gamesList = FILTER_GAMES }) {
  const [draft, setDraft] = useState(emptyPlayerSearch);
  const [applied, setApplied] = useState(null);
  const [players, setPlayers] = useState([]);
  const [playersLoading, setPlayersLoading] = useState(false);
  const [playersError, setPlayersError] = useState("");
  const updateDraft = (patch) => setDraft((current) => ({ ...current, ...patch }));
  const fillFromProfile = () => {
    setDraft({
      games: normalizeGameNames(myProfile?.games || []),
      region: myProfile?.region || "",
      language: myProfile?.language || "",
      style: myProfile?.style || "",
      lookingFor: normalizeLookingFor(myProfile?.lookingFor),
      rank: normalizeRank(myProfile?.rank),
      name: draft.name,
    });
  };
  const runSearch = (event) => {
    event?.preventDefault();
    setApplied({ ...draft, name: draft.name.trim() });
  };
  const appliedTag = extractPlayerTag(applied?.name || "");
  const exactId = Boolean(applied?.name?.includes("#") && PLAYER_TAG_PATTERN.test(appliedTag));
  const hasSearch = playerSearchActive(applied);

  useEffect(() => {
    if (!applied) {
      setPlayers([]);
      setPlayersLoading(false);
      setPlayersError("");
      return undefined;
    }
    setPlayersError("");
    if (applied.name.includes("#") && !PLAYER_TAG_PATTERN.test(appliedTag)) {
      setPlayers([]);
      setPlayersLoading(false);
      return undefined;
    }
    if (!hasSearch) {
      setPlayers([]);
      setPlayersLoading(false);
      return undefined;
    }
    setPlayersLoading(true);
    const filters = [where("discoverable", "==", true)];
    if (exactId) filters.push(where("playerTag", "==", appliedTag));
    else {
      if (applied.games.length) {
        const queryGames = normalizeGameNames(applied.games).flatMap((game) =>
          game === "BGMI and PUBG Mobile" ? [game, "PUBG Mobile (BGMI)"] : [game]
        );
        filters.push(where("games", "array-contains-any", [...new Set(queryGames)].slice(0, 10)));
      }
      if (applied.region) filters.push(where("region", "==", applied.region));
      if (applied.language) filters.push(where("language", "==", applied.language));
    }
    const playersQuery = query(PLAYERS_COLLECTION, ...filters, limit(80));
    return onSnapshot(playersQuery, (snap) => {
      setPlayers(snap.docs.map((d) => ({ uid: d.id, ...d.data() })));
      setPlayersLoading(false);
    }, () => {
      setPlayersError(exactId ? "Couldn't search this GrindInfo ID. Check your connection and try again." : "Couldn't load players. Check your connection or database indexes, then try again.");
      setPlayersLoading(false);
    });
  }, [applied, appliedTag, exactId, hasSearch]);

  const filtered = players
    .filter((p) => p.uid !== currentUid
      && playerMatchesQuery(p, applied?.name || "")
      && (exactId
        || ((!applied?.style || p.style === applied.style)
          && (!applied?.rank || p.rank === applied.rank)
          && (!applied?.lookingFor?.length || normalizeLookingFor(p.lookingFor).some((want) => applied.lookingFor.includes(want))))))
    .map((p) => ({ ...p, ...similarityMatch(myProfile, p) }))
    .sort((a, b) => b.score - a.score || String(a.displayName || "").localeCompare(String(b.displayName || "")));

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          padding: embedded ? "18px 0 12px" : "36px 0 20px",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          {!embedded && <Eyebrow>Squad up</Eyebrow>}
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: embedded ? 28 : 44, margin: "4px 0 0" }}>{embedded ? "Find players" : "Find similar players"}</h1>
        </div>
        {onEditProfile && <Button variant="ghost" onClick={onEditProfile}>{myProfile ? "Edit my profile" : "Set up my profile"}</Button>}
      </div>

      <form onSubmit={runSearch} style={{ marginBottom: 18, padding: 16, background: "var(--panel-bg)", border: "1px solid var(--border)" }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--accent-secondary)", marginBottom: 10 }}>Manual search</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 14 }}>
          <div style={{ flex: "1 1 280px", minWidth: 220 }}>
            <Field label="Player name or GrindInfo ID">
              <TextInput
                value={draft.name}
                onChange={(event) => updateDraft({ name: event.target.value })}
                placeholder="ghostpeak or ghostpeak#1234"
                aria-label="Search players by name or GrindInfo ID"
              />
            </Field>
          </div>
          <Button type="submit">Search players</Button>
        </div>
        <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
          <div style={{ width: "100%" }}>
            <Field label="Games (optional)">
              <MultiToggle
                options={gamesList}
                selected={draft.games}
                onToggle={(game) =>
                  updateDraft({
                    games: draft.games.includes(game)
                      ? draft.games.filter((item) => item !== game)
                      : [...draft.games, game],
                  })
                }
              />
            </Field>
          </div>
          <div style={{ minWidth: 160 }}>
            <Select aria-label="Region" value={draft.region} onChange={(e) => updateDraft({ region: e.target.value })}>
              <option value="">All regions</option>
              {REGIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </Select>
          </div>
          <div style={{ minWidth: 160 }}>
            <Select aria-label="Language" value={draft.language} onChange={(e) => updateDraft({ language: e.target.value })}>
              <option value="">All languages</option>
              {LANGUAGES.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </Select>
          </div>
          <div style={{ minWidth: 190 }}>
            <Select aria-label="Playing style" value={draft.style} onChange={(e) => updateDraft({ style: e.target.value })}>
              <option value="">Any playing style</option>
              {PLAY_STYLES.map((style) => (
                <option key={style} value={style}>{style}</option>
              ))}
            </Select>
          </div>
          <div style={{ minWidth: 180 }}>
            <Select aria-label="Rank band" value={draft.rank} onChange={(e) => updateDraft({ rank: e.target.value })}>
              <option value="">Any rank band</option>
              {RANK_BANDS.map((band) => (
                <option key={band} value={band}>{band}</option>
              ))}
            </Select>
          </div>
          <div style={{ width: "100%" }}>
            <Field label="Looking for (optional)">
              <MultiToggle
                options={LOOKING_FOR}
                selected={draft.lookingFor}
                onToggle={(want) => updateDraft({ lookingFor: draft.lookingFor.includes(want) ? draft.lookingFor.filter((item) => item !== want) : [...draft.lookingFor, want] })}
              />
            </Field>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {myProfile && <Button type="button" variant="ghost" onClick={fillFromProfile}>Fill from my profile</Button>}
          <Button type="button" variant="ghost" onClick={() => { setDraft(emptyPlayerSearch()); setApplied(null); setPlayers([]); }}>Clear</Button>
          <Button type="submit">Search players</Button>
        </div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 10 }}>Set a name, ID, and/or filters, then tap Search. Results only include players who turned on discovery.</div>
      </form>
      {applied?.name?.includes("#") && !PLAYER_TAG_PATTERN.test(appliedTag) && <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>Enter the 4-digit code after # to look up a player.</div>}

      {playersError && <div style={{ fontSize: 13, color: "var(--danger)", marginBottom: 14 }}>{playersError}</div>}
      {!applied ? (
        <EmptyState title="Search when you are ready" body="Type a name or Name#1234, add optional filters, then tap Search players." />
      ) : !hasSearch ? (
        <EmptyState title="Add a search" body="Enter a player name, a GrindInfo ID, or at least one filter, then tap Search players." />
      ) : playersLoading ? (
        <div style={{ color: "var(--text-muted)", fontSize: 13, padding: 20 }}>Searching opted-in players…</div>
      ) : filtered.length === 0 ? (
        <EmptyState title="No similar players yet" body="Try fewer filters, another game, or ask a teammate to turn on player discovery." />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
            {filtered.map((p) => {
              const friendRequest = friendRequests.find((request) =>
                (request.requesterId === currentUid && request.recipientId === p.uid)
                || (request.recipientId === currentUid && request.requesterId === p.uid)
              );
              return (
                <PlayerCard
                  key={p.uid}
                  player={p}
                  currentUid={currentUid}
                  friendRequest={friendRequest}
                  onFriendRequest={onFriendRequest}
                  onFriendDecision={onFriendDecision}
                  onReport={onReport}
                  matchReasons={p.reasons}
                />
              );
            })}
        </div>
      )}
    </div>
  );
}

function ReportModal({ target, onClose, onSubmit }) {
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [details, setDetails] = useState("");
  const [error, setError] = useState("");
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(4,6,8,.72)", display: "grid", placeItems: "center", padding: 18 }} onClick={onClose}>
      <div onClick={(event) => event.stopPropagation()} style={{ width: "100%", maxWidth: 440, padding: 22, background: "var(--panel-bg)", border: "1px solid var(--border)" }}>
        <Eyebrow>Safety report</Eyebrow>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 27, margin: "4px 0 8px" }}>Report {target.type}</h2>
        <div style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 14 }}>{target.name || "This account or tournament"} · Reports are private to GrindInfo's owner and support team.</div>
        <div style={{ display: "grid", gap: 12 }}>
          <Field label="What happened?">
            <Select value={reason} onChange={(event) => setReason(event.target.value)}>{REPORT_REASONS.map((item) => <option key={item}>{item}</option>)}</Select>
          </Field>
          <Field label="Details (optional)">
            <textarea value={details} maxLength={1000} onChange={(event) => setDetails(event.target.value)} rows={4} style={{ ...inputStyle, resize: "vertical" }} placeholder="Share enough context for the safety team to review." />
          </Field>
          {error && <div role="alert" style={{ color: "var(--danger)", fontSize: 13 }}>{error}</div>}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={async () => { const message = await onSubmit({ reason, details: details.trim() }); if (message) setError(message); }}>Send report</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RegistrationPanel({ tournament, requests, currentUserId, currentUserName, isAdmin, onRequest, onDecision, disclaimer, onDisclaimerVisibilityChange, onSignIn }) {
  const [showJoinDisclaimer, setShowJoinDisclaimer] = useState(false);
  const mine = requests.find((request) => request.playerId === currentUserId);
  const pending = requests.filter((request) => request.status === "pending");
  const approved = requests.filter((request) => request.status === "approved");
  const openJoin = tournament.joinMode === "open";
  const full = isTournamentFull(tournament, requests);
  const joiningOpen = tournament.registrationOpen !== false && !isTournamentArchived(tournament) && !full;
  const slotLabel = Number(tournament.maxSlots) > 0 ? `${approved.length}/${tournament.maxSlots} ${isCustomRoomEvent(tournament) ? "players" : "slots"}` : `${approved.length} joined`;
  return (
    <section style={{ marginTop: isAdmin ? 0 : 20, padding: isAdmin ? 0 : 16, background: isAdmin ? "transparent" : "var(--panel-bg)", border: isAdmin ? "none" : "1px solid var(--border)" }}>
      {isAdmin ? (
        <Eyebrow>{openJoin ? "Free join" : "Request to join"} · {slotLabel}</Eyebrow>
      ) : (
        <Eyebrow>{mine ? `Your place · ${mine.status}` : joiningOpen ? "Enter this tournament" : "Registration"}</Eyebrow>
      )}
      <div style={{ fontSize: 13, color: "var(--text-muted)", margin: "8px 0 12px" }}>
        {full ? "This tournament is full." : mine ? `Your request is ${mine.status}.` : currentUserId
          ? (isAdmin
            ? (openJoin ? "Join now. No host approval needed." : "Request a place. The tournament host or co-host must approve it.")
            : "Join if you want a place. The host decides how entries work.")
          : "Sign in to take a place in this tournament."}
      </div>
      {!currentUserId && joiningOpen && <Button onClick={onSignIn}>Sign in to join</Button>}
      {currentUserId && !isAdmin && !mine && joiningOpen && <Button onClick={() => { setShowJoinDisclaimer(true); onDisclaimerVisibilityChange(true); }}>Join</Button>}
      {!isAdmin && !joiningOpen && !mine && <div style={{ color: "var(--text-dim)", fontSize: 12 }}>{full ? "No places left." : "Registration is closed."}</div>}
      {isAdmin && (
        <div style={{ display: "grid", gap: 8 }}>
          {pending.length === 0 ? <div style={{ fontSize: 13, color: "var(--text-dim)" }}>No requests waiting.</div> : pending.map((request) => (
            <div key={request.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", borderTop: "1px solid var(--border)", paddingTop: 9 }}>
              <span>{request.displayName || "Player"}</span>
              <span style={{ display: "flex", gap: 6 }}><Button onClick={() => onDecision(request.id, "approved")}>Approve</Button><Button variant="danger" onClick={() => onDecision(request.id, "declined")}>Decline</Button></span>
            </div>
          ))}
          {approved.length > 0 && <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10, marginTop: 4, fontSize: 12, color: "var(--text-muted)" }}>Approved players: {approved.map((request) => request.displayName || "Player").join(", ")}</div>}
        </div>
      )}
      {showJoinDisclaimer && <div role="dialog" aria-modal="true" aria-labelledby="join-disclaimer-title" style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(0,0,0,.72)", display: "grid", placeItems: "center", padding: 18 }}>
        <section style={{ width: "min(100%, 480px)", padding: 22, background: "var(--panel-bg)", color: "var(--page-text)", border: "1px solid var(--border-strong)", boxShadow: "var(--panel-shadow)" }}>
          <Eyebrow color="var(--danger)">Before you request</Eyebrow>
          <h2 id="join-disclaimer-title" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, margin: "6px 0" }}>{disclaimer?.title || "Tournament safety disclaimer"}</h2>
          <p style={{ color: "var(--text-muted)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{disclaimer?.message || "Join only tournaments hosted by people you trust. Verify the details directly with the host, never send money or account credentials, and report suspicious activity. GrindInfo cannot guarantee a host's conduct."}</p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button variant="ghost" onClick={() => { setShowJoinDisclaimer(false); onDisclaimerVisibilityChange(false); }}>Cancel</Button>
            <Button onClick={() => { setShowJoinDisclaimer(false); onDisclaimerVisibilityChange(false); onRequest({ playerId: currentUserId, displayName: currentUserName }); }}>{openJoin ? "Join this tournament" : "Continue to request"}</Button>
          </div>
        </section>
      </div>}
    </section>
  );
}

function RoomLobbyPanel({ isAdmin, canSee, lobby }) {
  const [copied, setCopied] = useState("");
  const copyValue = async (value, label) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      window.setTimeout(() => setCopied(""), 1600);
    } catch {
      setCopied("");
    }
  };
  const posted = Boolean(lobby?.roomId && lobby?.roomPassword);
  if (isAdmin) return null;
  if (!canSee) return null;
  return (
    <section style={{ marginTop: 16, padding: 16, background: "var(--panel-bg)", border: "1px solid var(--border)" }}>
      <Eyebrow>Custom room</Eyebrow>
      {posted ? (
        <>
          <div style={{ color: "var(--text-muted)", fontSize: 12, margin: "7px 0 12px" }}>Host posted the custom room. Copy these into the game.</div>
          <div style={{ display: "grid", gap: 10, maxWidth: 420 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", padding: 10, background: "var(--panel-raised)", border: "1px solid var(--border)" }}>
              <div><Eyebrow>Room ID</Eyebrow><div style={{ fontFamily: "'JetBrains Mono', monospace", marginTop: 4 }}>{lobby.roomId}</div></div>
              <Button variant="ghost" onClick={() => copyValue(lobby.roomId, "id")}>{copied === "id" ? "Copied" : "Copy"}</Button>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", padding: 10, background: "var(--panel-raised)", border: "1px solid var(--border)" }}>
              <div><Eyebrow>Password</Eyebrow><div style={{ fontFamily: "'JetBrains Mono', monospace", marginTop: 4 }}>{lobby.roomPassword}</div></div>
              <Button variant="ghost" onClick={() => copyValue(lobby.roomPassword, "password")}>{copied === "password" ? "Copied" : "Copy"}</Button>
            </div>
          </div>
        </>
      ) : (
        <div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 7 }}>The host has not posted a room ID and password yet.</div>
      )}
    </section>
  );
}

function CoAdminPanel({ tournament, isOwner, onChange, onAddByPlayerId }) {
  const [playerTag, setPlayerTag] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  if (!isOwner) return null;
  const ids = tournament.coAdminUserIds || [];
  const tags = tournament.coAdminPlayerTags || {};
  const addByTag = async () => {
    setSaving(true); setError("");
    try { await onAddByPlayerId(playerTag); setPlayerTag(""); }
    catch (e) { setError(e?.message || "Couldn't add that co-host. Check the GrindInfo ID and try again."); }
    finally { setSaving(false); }
  };
  return (
    <div>
      <div style={{ color: "var(--text-muted)", fontSize: 12, margin: "0 0 10px" }}>Enter the player's GrindInfo ID (the number after #). The player must have a profile and be visible in player search. Co-hosts can manage registrations and tournament details; only you can transfer ownership or delete the tournament.</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <TextInput aria-label="Co-host GrindInfo ID" value={playerTag} onChange={(event) => setPlayerTag(event.target.value)} placeholder="PlayerName#1234" />
        <Button disabled={!playerTag.trim() || saving} onClick={addByTag}>{saving ? "Checking…" : "Add co-host"}</Button>
      </div>
      {error && <div role="alert" style={{ color: "var(--danger)", fontSize: 12, marginTop: 8 }}>{error}</div>}
      {ids.map((id) => <div key={id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border)", padding: "8px 0", marginTop: 8, fontSize: 12 }}>{tags[id] ? `GrindInfo #${tags[id]}` : "Existing co-host"}<Button variant="danger" onClick={() => onChange(ids.filter((item) => item !== id), Object.fromEntries(Object.entries(tags).filter(([key]) => key !== id)))}>Remove</Button></div>)}
    </div>
  );
}

function FriendRequestCenter({ requests, currentUserId, onDecision }) {
  const incoming = requests.filter((request) => request.recipientId === currentUserId && request.status === "pending");
  const sent = requests.filter((request) => request.requesterId === currentUserId);
  return (
    <div style={{ paddingTop: 34 }}>
      <Eyebrow>Player connections</Eyebrow>
      <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 42, margin: "4px 0 18px" }}>Friend requests</h1>
      {incoming.length === 0 ? <div style={{ color: "var(--text-muted)", marginBottom: 18 }}>No pending requests to review.</div> : <div style={{ display: "grid", gap: 10, marginBottom: 20 }}>{incoming.map((request) => <div key={request.id} style={{ padding: 14, background: "var(--panel-bg)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}><span>{request.requesterName || "Player"} wants to connect</span><span style={{ display: "flex", gap: 6 }}><Button onClick={() => onDecision(request.id, "accepted")}>Accept</Button><Button variant="danger" onClick={() => onDecision(request.id, "declined")}>Decline</Button></span></div>)}</div>}
      {sent.length > 0 && <div><Eyebrow>Requests you sent</Eyebrow><div style={{ display: "grid", gap: 8, marginTop: 10 }}>{sent.map((request) => <div key={request.id} style={{ padding: 12, background: "var(--panel-bg)", border: "1px solid var(--border)", fontSize: 13 }}>Host connection request · {request.status}</div>)}</div></div>}
    </div>
  );
}

function FriendDock({ requests, currentUserId, onOpenChat, onOpenRequests, presenceDb, onFriendOnline, blockedUsers = [], onRemoveFriend, onBlockFriend, onUnblockFriend, mutedIds = new Set(), onToggleMute, onFriendRequest, placement = "dock" }) {
  const [expanded, setExpanded] = useState(false);
  const [blockedOpen, setBlockedOpen] = useState(false);
  const [presence, setPresence] = useState({});
  const [friendSearch, setFriendSearch] = useState("");
  const [foundPlayers, setFoundPlayers] = useState([]);
  const [searchingPlayers, setSearchingPlayers] = useState(false);
  const blockedIds = new Set(blockedUsers.map((item) => item.blockerUid === currentUserId ? item.blockedUid : item.blockerUid));
  const friends = requests.filter((item) => item.status === "accepted").map((item) => ({
    uid: item.requesterId === currentUserId ? item.recipientId : item.requesterId,
    name: item.requesterId === currentUserId ? (item.recipientName || "Player") : (item.requesterName || "Player"),
  })).filter((item, index, all) => !blockedIds.has(item.uid) && all.findIndex((candidate) => candidate.uid === item.uid) === index);
  const visibleFriends = friends.filter((friend) => playerMatchesQuery({ displayName: friend.name, name: friend.name }, friendSearch));
  const friendIds = new Set(friends.map((friend) => friend.uid));
  const myBlocks = blockedUsers.filter((item) => item.blockerUid === currentUserId);
  const friendKey = friends.map((item) => item.uid).sort().join("|");
  const mutedKey = [...mutedIds].sort().join("|");
  useEffect(() => {
    setPresence({});
    if (!presenceDb || !friends.length) { setPresence({}); return undefined; }
    let active = true;
    const stops = friends.map((friend) => {
      let initialized = false;
      let previousOnline = false;
      return onValue(databaseRef(presenceDb, `status/${friend.uid}`), (snapshot) => {
        if (!active) return;
        const online = snapshot.val()?.state === "online";
        setPresence((current) => ({ ...current, [friend.uid]: online ? "online" : (snapshot.val()?.state === "away" ? "away" : "offline") }));
        if (initialized && online && !previousOnline && !mutedIds.has(friend.uid)) onFriendOnline(friend.name);
        previousOnline = online;
        initialized = true;
      }, () => setPresence((current) => ({ ...current, [friend.uid]: "offline" })));
    });
    return () => { active = false; stops.forEach((stop) => stop()); };
  }, [presenceDb, currentUserId, friendKey, onFriendOnline, mutedIds]);
  useEffect(() => {
    const raw = friendSearch.trim();
    const tag = extractPlayerTag(raw);
    const byId = raw.includes("#") && PLAYER_TAG_PATTERN.test(tag);
    const byName = raw.length >= 2;
    if (!byId && !byName) {
      setFoundPlayers([]);
      setSearchingPlayers(false);
      return undefined;
    }
    setSearchingPlayers(true);
    const filters = [where("discoverable", "==", true)];
    if (byId) filters.push(where("playerTag", "==", tag));
    const playersQuery = query(PLAYERS_COLLECTION, ...filters, limit(30));
    return onSnapshot(playersQuery, (snap) => {
      setFoundPlayers(snap.docs.map((d) => ({ uid: d.id, ...d.data() })).filter((player) => player.uid !== currentUserId && !friendIds.has(player.uid) && !blockedIds.has(player.uid) && playerMatchesQuery(player, raw)));
      setSearchingPlayers(false);
    }, () => {
      setFoundPlayers([]);
      setSearchingPlayers(false);
    });
  }, [friendSearch, currentUserId, friendKey]);
  const list = <div style={{ maxHeight: 320, overflowY: "auto", padding: placement === "header" ? 0 : 8 }}>
      <div style={{ padding: "8px 8px 6px" }}>
        <TextInput aria-label="Search friends or players" value={friendSearch} onChange={(event) => setFriendSearch(event.target.value)} placeholder="Search friends or Name#1234" />
      </div>
      <button type="button" onClick={() => { onOpenRequests(); setExpanded(false); }} style={{ width: "100%", textAlign: "left", border: 0, borderBottom: "1px solid var(--border)", padding: 11, background: "transparent", color: "var(--accent-secondary)", cursor: "pointer" }}>Friend requests{requests.filter((item) => item.recipientId === currentUserId && item.status === "pending").length ? ` (${requests.filter((item) => item.recipientId === currentUserId && item.status === "pending").length})` : ""}</button>
      {visibleFriends.map((friend) => <div key={friend.uid} style={{ borderBottom: "1px solid var(--border)", padding: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}><span style={{ display: "flex", alignItems: "center", gap: 8 }}><img src={avatarForGamer({ displayName: friend.name, uid: friend.uid })} alt="" className="aspect-square h-7 w-7 rounded-full object-cover" /><span aria-label={presence[friend.uid] || "offline"} title={presence[friend.uid] || (presenceDb ? "offline" : "Online status needs Realtime Database setup")} style={{ width: 8, height: 8, borderRadius: "50%", background: presence[friend.uid] === "online" ? "var(--success)" : "var(--text-dim)" }} />{friend.name}{mutedIds.has(friend.uid) ? <span style={{ fontSize: 10, color: "var(--text-dim)" }}>muted</span> : null}</span><button type="button" onClick={() => onOpenChat(friend)} style={{ border: 0, background: "transparent", color: "var(--accent-secondary)", cursor: "pointer" }}>Chat</button></div>
        <div style={{ display: "flex", gap: 8, marginTop: 7, flexWrap: "wrap" }}><button type="button" onClick={() => onToggleMute?.(friend.uid)} style={{ border: 0, background: "transparent", color: "var(--text-muted)", cursor: "pointer", fontSize: 11 }}>{mutedIds.has(friend.uid) ? "Unmute" : "Mute"}</button><button type="button" onClick={() => onRemoveFriend(friend)} style={{ border: 0, background: "transparent", color: "var(--text-muted)", cursor: "pointer", fontSize: 11 }}>Remove friend</button><button type="button" onClick={() => onBlockFriend(friend)} style={{ border: 0, background: "transparent", color: "var(--danger)", cursor: "pointer", fontSize: 11 }}>Block</button></div>
      </div>)}
      {!friendSearch.trim() && friends.length === 0 && <div style={{ padding: 12, color: "var(--text-muted)", fontSize: 13 }}>Accepted friends will appear here. Search a name or Name#1234 to find players.</div>}
      {friendSearch.trim() && searchingPlayers && <div style={{ padding: 12, color: "var(--text-muted)", fontSize: 12 }}>Searching players…</div>}
      {friendSearch.trim() && foundPlayers.length > 0 && (
        <section style={{ borderTop: "1px solid var(--border)", paddingTop: 8 }}>
          <div style={{ padding: "4px 10px 8px", fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-dim)" }}>Players</div>
          {foundPlayers.map((player) => {
            const outgoing = requests.find((request) => request.requesterId === currentUserId && request.recipientId === player.uid);
            return (
              <div key={player.uid} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "8px 10px", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                <span>{grindHandle(player.displayName, player.playerTag)}</span>
                {onFriendRequest && (
                  <button type="button" disabled={Boolean(outgoing)} onClick={() => onFriendRequest(player)} style={{ border: 0, background: "transparent", color: "var(--accent-secondary)", cursor: outgoing ? "default" : "pointer", fontSize: 12 }}>
                    {outgoing ? (outgoing.status === "accepted" ? "Friends" : "Requested") : "Add friend"}
                  </button>
                )}
              </div>
            );
          })}
        </section>
      )}
      {friendSearch.trim() && !searchingPlayers && visibleFriends.length === 0 && foundPlayers.length === 0 && <div style={{ padding: 12, color: "var(--text-muted)", fontSize: 13 }}>No friends or discoverable players match that search.</div>}
      <section style={{ borderTop: "1px solid var(--border)", marginTop: 8 }}>
        <button type="button" onClick={() => setBlockedOpen((open) => !open)} aria-expanded={blockedOpen} style={{ width: "100%", display: "flex", justifyContent: "space-between", padding: "10px 8px", border: 0, background: "transparent", color: "var(--text-muted)", cursor: "pointer", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace" }}>
          <span>Blocked ({myBlocks.length})</span>
          <span>{blockedOpen ? "−" : "+"}</span>
        </button>
        {blockedOpen && (myBlocks.length === 0 ? <div style={{ padding: "6px 8px 10px", color: "var(--text-dim)", fontSize: 12 }}>No blocked players.</div> : myBlocks.map((item) => <div key={item.id} style={{ padding: "6px 8px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, fontSize: 12 }}>{item.blockedName || "Player"}<button type="button" onClick={() => onUnblockFriend(item)} style={{ border: 0, background: "transparent", color: "var(--accent-secondary)", cursor: "pointer" }}>Unblock</button></div>))}
      </section>
      {!presenceDb && <div style={{ padding: "8px 10px", color: "var(--text-dim)", fontSize: 11 }}>Live online status needs Realtime Database setup.</div>}
    </div>;
  if (placement === "header") return list;
  return <aside style={{ position: "fixed", right: 14, bottom: 14, zIndex: 55, width: expanded ? "min(330px, calc(100vw - 28px))" : "auto", background: "var(--panel-bg)", border: "1px solid var(--border-strong)", boxShadow: "var(--panel-shadow)" }}>
    <button type="button" onClick={() => setExpanded((open) => !open)} aria-expanded={expanded} style={{ width: "100%", padding: "12px 14px", border: 0, background: "transparent", color: "var(--page-text)", textAlign: "left", cursor: "pointer", fontWeight: 700 }}>Friends <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>({friends.length})</span> <span style={{ float: "right" }}>{expanded ? "−" : "+"}</span></button>
    {expanded && list}
  </aside>;
}

function FriendChat({ currentUser, friend, onClose, muted = false, onToggleMute, onBlock }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const participants = [currentUser.uid, friend.uid].sort();
  const conversationId = `${participants[0]}_${participants[1]}`;
  useEffect(() => {
    let active = true;
    let stopMessages = null;
    setReady(false); setMessages([]); setError("");
    const openConversation = async () => {
      const conversationRef = doc(CHAT_CONVERSATIONS_COLLECTION, conversationId);
      const snapshot = await getDoc(conversationRef);
      if (!snapshot.exists()) {
        try { await setDoc(conversationRef, { participants, createdAt: Date.now() }); }
        catch (writeError) {
          const racedSnapshot = await getDoc(conversationRef);
          if (!racedSnapshot.exists()) throw writeError;
        }
      }
      if (!active) return;
      setReady(true);
      stopMessages = onSnapshot(query(CHAT_MESSAGES_COLLECTION(conversationId), orderBy("createdAt", "desc"), limit(100)), (messageSnapshot) => {
        if (active) setMessages(messageSnapshot.docs.map((item) => ({ id: item.id, ...item.data() })).reverse());
      }, () => { if (active) setError("Couldn't load messages. Confirm the Firestore rules are published and try reopening chat."); });
    };
    openConversation().catch(() => { if (active) setError("Chat is available only after both players are accepted friends. Check the published Firestore rules."); });
    return () => { active = false; stopMessages?.(); };
  }, [conversationId, currentUser.uid, friend.uid]);
  const send = async (event) => {
    event.preventDefault();
    const clean = text.trim().slice(0, 1000);
    if (!ready || !clean) return;
    try { await addDoc(CHAT_MESSAGES_COLLECTION(conversationId), { senderId: currentUser.uid, text: clean, createdAt: Date.now() }); setText(""); setError(""); }
    catch { setError("Message not sent. Confirm you are still friends and try again."); }
  };
  return <section aria-label={`Chat with ${friend.name}`} style={{ position: "fixed", right: 14, bottom: 14, zIndex: 56, width: "min(340px, calc(100vw - 28px))", height: "min(440px, calc(100vh - 110px))", display: "flex", flexDirection: "column", background: "var(--panel-bg)", color: "var(--page-text)", border: "1px solid var(--border-strong)", boxShadow: "var(--panel-shadow)" }}>
    <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: 12, borderBottom: "1px solid var(--border)" }}>
      <strong>{friend.name}{muted ? " · muted" : ""}</strong>
      <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {onToggleMute && <Button variant="ghost" onClick={() => onToggleMute(friend.uid)}>{muted ? "Unmute" : "Mute"}</Button>}
        {onBlock && <Button variant="danger" onClick={() => onBlock(friend)}>Block</Button>}
        <Button variant="ghost" onClick={onClose}>Close</Button>
      </span>
    </header>
    <div aria-live="polite" style={{ flex: 1, overflowY: "auto", padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>{messages.map((message) => <div key={message.id} style={{ alignSelf: message.senderId === currentUser.uid ? "flex-end" : "flex-start", maxWidth: "85%", padding: "8px 10px", background: message.senderId === currentUser.uid ? "var(--panel-raised)" : "transparent", border: "1px solid var(--border)", whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: 13 }}>{message.text}</div>)}{!messages.length && ready && <span style={{ color: "var(--text-muted)", fontSize: 13, padding: 8 }}>Start the conversation.</span>}</div>
    {error && <div role="alert" style={{ color: "var(--danger)", fontSize: 12, padding: "0 10px 8px" }}>{error}</div>}
    <form onSubmit={send} style={{ display: "flex", gap: 6, padding: 10, borderTop: "1px solid var(--border)" }}><TextInput aria-label="Message" value={text} maxLength={1000} onChange={(event) => setText(event.target.value)} placeholder="Write a message" /><Button disabled={!ready || !text.trim()}>Send</Button></form>
  </section>;
}

function ReportCard({ report, archived = false, bans = [], role, onStatusChange, onSetPlayerAccess }) {
  const record = bans.find((item) => item.id === report.targetId);
  const banned = record?.active === true;
  const restricted = !banned && record?.restricted === true;
  return (
    <article style={{ padding: 16, background: "var(--panel-bg)", border: "1px solid var(--border)" }}>
      <Eyebrow>{archived ? "archived" : (report.status || "submitted")} · {report.targetType} · {report.reason}{banned ? " · banned" : restricted ? " · restricted" : ""}</Eyebrow>
      <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", margin: "6px 0", fontSize: 22 }}>{report.targetName || "Reported item"}</h2>
      <p style={{ fontSize: 13, color: "var(--text-muted)", whiteSpace: "pre-wrap" }}>{report.details || "No extra details provided."}</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {!archived && (
          <>
            <Button variant="ghost" onClick={() => onStatusChange(report.id, "reviewing")}>Mark reviewing</Button>
            <Button onClick={() => onStatusChange(report.id, "archived")}>Report considered</Button>
          </>
        )}
        {role === "owner" && report.targetType === "player" && (
          <>
            <Button variant={banned ? "ghost" : "danger"} onClick={() => onSetPlayerAccess(report, banned ? "clear" : "ban")}>{banned ? "Remove ban" : "Ban player"}</Button>
            {!banned && (
              <Button variant={restricted ? "ghost" : "danger"} onClick={() => onSetPlayerAccess(report, restricted ? "clear" : "restrict")}>{restricted ? "Remove restriction" : "Restrict player"}</Button>
            )}
          </>
        )}
      </div>
    </article>
  );
}

function ReportsInbox({ reports, onStatusChange, bans = [], role, onSetPlayerAccess }) {
  const [showArchive, setShowArchive] = useState(false);
  const open = reports.filter((item) => !isReportArchived(item));
  const archived = reports.filter((item) => isReportArchived(item));
  return (
    <div style={{ paddingTop: 34 }}>
      <Eyebrow>Owner and support tools · private</Eyebrow>
      <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 42, margin: "4px 0 18px" }}>Safety reports</h1>
      <p style={{ color: "var(--text-muted)", fontSize: 13, margin: "0 0 14px" }}>After you mark a report considered, ban a player, or restrict a player, it moves into the archive.</p>
      {open.length === 0 ? <EmptyState title="No reports to review" body="New abuse, scam and inappropriate-content reports appear here. Reviewed reports stay in the archive." /> : (
        <div style={{ display: "grid", gap: 10 }}>
          {open.map((report) => (
            <ReportCard key={report.id} report={report} bans={bans} role={role} onStatusChange={onStatusChange} onSetPlayerAccess={onSetPlayerAccess} />
          ))}
        </div>
      )}
      {archived.length > 0 && (
        <div style={{ marginTop: 22 }}>
          <Button variant="ghost" onClick={() => setShowArchive((openArchive) => !openArchive)}>
            {showArchive ? "Hide archived reports" : `Archived reports (${archived.length})`}
          </Button>
          {showArchive && (
            <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
              {archived.map((report) => (
                <ReportCard key={report.id} report={report} archived bans={bans} role={role} onStatusChange={onStatusChange} onSetPlayerAccess={onSetPlayerAccess} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ArchiveSubmissionInbox({ submissions, onDecision }) {
  const pending = submissions.filter((item) => item.status === "pending");
  return <section>
    <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Review community-submitted event records before they go public in The Vault.</p>
    {pending.length === 0 ? <EmptyState title="No Vault requests waiting" body="New event submissions will appear here for review." /> : <div style={{ display: "grid", gap: 10 }}>{pending.map((item) => <article key={item.id} style={{ padding: 14, background: "var(--panel-bg)", border: "1px solid var(--border)" }}><Eyebrow>{item.game} · {item.eventDate} · by {item.submitterName || "Player"}</Eyebrow><h2 style={{ fontFamily: "'Bebas Neue', sans-serif", margin: "6px 0" }}>{item.tournament}</h2><p style={{ margin: "6px 0" }}>Winner: {item.winner}{item.runnerUp ? ` · Runner-up: ${item.runnerUp}` : ""}{item.mvp ? ` · MVP: ${item.mvp}` : ""}</p>{item.source && <a href={item.source} target="_blank" rel="noopener noreferrer">Source</a>}<div style={{ display: "flex", gap: 8, marginTop: 10 }}><Button onClick={() => onDecision(item.id, "approved")}>Approve for The Vault</Button><Button variant="danger" onClick={() => onDecision(item.id, "rejected")}>Decline</Button></div></article>)}</div>}
  </section>;
}

function TournamentMonitor({ tournaments, onOpen }) {
  const ordered = [...tournaments].sort((a, b) => String(b.startDate || "").localeCompare(String(a.startDate || "")));
  return (
    <section>
      <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Watch every live and closed tournament from this desk. Open one to inspect brackets, registrations, and host details.</p>
      {ordered.length === 0 ? <EmptyState title="No tournaments yet" body="New events will appear here as soon as they are created." /> : (
        <div style={{ display: "grid", gap: 10 }}>
          {ordered.map((item) => {
            const archived = isTournamentArchived(item);
            return (
              <article key={item.id} style={{ padding: 14, background: "var(--panel-bg)", border: "1px solid var(--border)", display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <Eyebrow>{archived ? "Closed" : "Active"} · {item.game || "Game TBD"}</Eyebrow>
                  <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", margin: "6px 0 4px", fontSize: 24 }}>{item.name || "Untitled tournament"}</h2>
                  <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{fmtDate(item.startDate)} – {fmtDate(item.endDate)} · Hosted by {item.adminDisplayName || "Tournament host"}{item.registrationOpen !== false ? " · Registration open" : ""}</div>
                </div>
                {onOpen && <Button variant="ghost" onClick={() => onOpen(item.id)}>Open</Button>}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function slidesFromBlogs(posts = []) {
  return posts
    .filter((post) => post.status === "published")
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .map((post) => ({
      slug: `blog-${post.id}`,
      id: post.id,
      title: post.title,
      game: post.game,
      summary: String(post.content || "").slice(0, 400),
      fullContent: post.content,
      authorName: post.authorName,
      source: post.source,
      eventScope: post.eventScope,
      kicker: publicScopeKicker(post) || "Blog",
      poster: bannerForGame(post.game),
      blog: true,
      surface: "blog",
      createdAt: post.createdAt,
    }));
}

function VaultMonitor({ submissions, blogPosts, onDecision, onPromote }) {
  const published = [...blogPosts].filter((post) => post.status === "published").sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return (
    <section style={{ display: "grid", gap: 22 }}>
      <ArchiveSubmissionInbox submissions={submissions} onDecision={onDecision} />
      <BlogArchivePromoter posts={blogPosts} onPromote={onPromote} />
      <div>
        <Eyebrow>Published blogs in The Vault · {published.length}</Eyebrow>
        {published.length === 0 ? <EmptyState title="No published blogs in The Vault yet" body="Publish a recap from the Blogs tab, then it appears here." /> : (
          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            {published.map((post) => (
              <article key={post.id} style={{ padding: 14, background: "var(--panel-bg)", border: "1px solid var(--border)" }}>
                <Eyebrow>{post.game} · {post.status}{post.eventScope ? ` · ${post.eventScope}` : ""}</Eyebrow>
                <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", margin: "4px 0", fontSize: 22 }}>{post.title}</h2>
                <p style={{ whiteSpace: "pre-wrap", color: "var(--text-muted)" }}>{post.content}</p>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function StaffActivityLog({ actions }) {
  const ordered = [...actions].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 100);
  return <section>
    <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Recent owner and support actions. This log is visible to the owner only.</p>
    {ordered.length === 0 ? <EmptyState title="No staff actions recorded yet" body="Report, blog, Vault, popup, and support-access decisions will appear here." /> : <div style={{ display: "grid", gap: 8 }}>{ordered.map((item) => <article key={item.id} style={{ padding: 12, background: "var(--panel-bg)", border: "1px solid var(--border)" }}><Eyebrow>{new Date(item.createdAt || 0).toLocaleString()} · {item.actorName || "Staff"}</Eyebrow><div style={{ marginTop: 5 }}>{item.summary}</div></article>)}</div>}
  </section>;
}

function BlogArchivePromoter({ posts, onPromote }) {
  const candidates = posts.filter((post) => post.status === "published");
  const [postId, setPostId] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [winner, setWinner] = useState("");
  const [runnerUp, setRunnerUp] = useState("");
  const [mvp, setMvp] = useState("");
  const [source, setSource] = useState("");
  const [eventScope, setEventScope] = useState("ewc");
  const [error, setError] = useState("");
  const selected = candidates.find((post) => post.id === postId);
  const choosePost = (id) => {
    const post = candidates.find((item) => item.id === id);
    setPostId(id); setEventDate(""); setWinner(""); setRunnerUp(""); setMvp(""); setSource(post?.source || "");
    setEventScope(post?.eventScope || inferEventScope(`${post?.title || ""} ${post?.game || ""}`)); setError("");
  };
  return <section style={{ maxWidth: 680 }}>
    <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Turn a published recap into The Vault. Mark it EWC related to merge it into that game vault and the shared EWC list.</p>
    {candidates.length === 0 ? <EmptyState title="No published blogs to add" body="Publish a blog first, then you can create a Vault record from it." /> : <>
      <Field label="Published blog"><Select value={postId} onChange={(event) => choosePost(event.target.value)}><option value="">Choose a post…</option>{candidates.map((post) => <option key={post.id} value={post.id}>{post.title} · {post.game}</option>)}</Select></Field>
      {selected && <div style={{ display: "grid", gap: 8, marginTop: 10, padding: 14, background: "var(--panel-bg)", border: "1px solid var(--border)" }}>
        <Field label="Event date"><TextInput maxLength={40} value={eventDate} onChange={(event) => setEventDate(event.target.value)} placeholder="YYYY or YYYY-MM-DD" /></Field>
        <Field label="Winner"><TextInput maxLength={100} value={winner} onChange={(event) => setWinner(event.target.value)} /></Field>
        <Field label="Runner-up (optional)"><TextInput maxLength={100} value={runnerUp} onChange={(event) => setRunnerUp(event.target.value)} /></Field>
        <Field label="MVP (optional)"><TextInput maxLength={100} value={mvp} onChange={(event) => setMvp(event.target.value)} /></Field>
        <Field label="Source link (optional)"><TextInput maxLength={500} value={source} onChange={(event) => setSource(event.target.value)} /></Field>
        <Field label="Event type"><Select value={eventScope} onChange={(event) => setEventScope(event.target.value)}>{EVENT_SCOPES.map((scope) => <option key={scope.id} value={scope.id}>{scope.label}</option>)}</Select></Field>
        {error && <div role="alert" style={{ color: "var(--danger)" }}>{error}</div>}
        <Button onClick={async () => { if (!eventDate.trim() || !winner.trim()) { setError("Add the event date and winner."); return; } try { await onPromote(selected, { eventDate, winner, runnerUp, mvp, source, eventScope }); choosePost(""); } catch { setError("Could not add this record to The Vault."); } }}>Add event to The Vault</Button>
      </div>}
    </>}
  </section>;
}

function ArchiveRequestForm({ user, submissions = [], onSubmit, onSignIn }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ tournament: "", game: "", eventDate: "", winner: "", source: "", eventScope: "random" });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const ownRequests = user ? submissions.filter((item) => item.submitterId === user.uid).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 4) : [];
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async () => {
    if (!form.tournament.trim() || !form.game.trim() || !form.eventDate.trim() || !form.winner.trim()) { setError("Add event, game, date, and winner."); return; }
    if (form.source.trim() && !/^https:\/\//i.test(form.source.trim())) { setError("Source links must start with https://."); return; }
    try { await onSubmit(form); setForm({ tournament: "", game: "", eventDate: "", winner: "", source: "", eventScope: "random" }); setError(""); setMessage("Sent for review."); }
    catch { setError("Could not send this request."); }
  };
  return (
    <div className="relative mb-4 flex justify-end">
      <button type="button" aria-label="Suggest event to Vault" onClick={() => { if (!user) { onSignIn?.(); return; } setOpen((value) => !value); }} className="grid h-9 w-9 place-items-center rounded-full border border-white/20 bg-black/40 font-mono text-lg text-amber-300 hover:border-amber-400">+</button>
      {open && user && (
        <div className="absolute right-0 top-11 z-20 w-[min(100vw-2rem,20rem)] border border-white/10 bg-[#17110f] p-3 shadow-xl">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-stone-400">Suggest event</p>
          <div className="grid gap-2">
            <TextInput maxLength={120} value={form.tournament} onChange={(e) => update("tournament", e.target.value)} placeholder="Tournament" />
            <TextInput maxLength={60} value={form.game} onChange={(e) => update("game", e.target.value)} placeholder="Game" />
            <TextInput maxLength={40} value={form.eventDate} onChange={(e) => update("eventDate", e.target.value)} placeholder="Date" />
            <TextInput maxLength={100} value={form.winner} onChange={(e) => update("winner", e.target.value)} placeholder="Winner" />
            <TextInput maxLength={500} value={form.source} onChange={(e) => update("source", e.target.value)} placeholder="https:// source" />
            <Select value={form.eventScope} onChange={(e) => update("eventScope", e.target.value)} aria-label="Event type">{EVENT_SCOPES.map((scope) => <option key={scope.id} value={scope.id}>{scope.label}</option>)}</Select>
            {error && <div role="alert" className="text-xs text-red-400">{error}</div>}
            {message && <div role="status" className="text-xs text-emerald-400">{message}</div>}
            <Button onClick={submit}>Send</Button>
          </div>
          {ownRequests.length > 0 && <div className="mt-2 border-t border-white/10 pt-2 text-[11px] text-stone-400">{ownRequests.map((item) => <div key={item.id} className="flex justify-between gap-2 py-1"><span>{item.tournament}</span><span>{item.status}</span></div>)}</div>}
        </div>
      )}
    </div>
  );
}

function SitePopup({ popup, onDismiss }) {
  if (!popup) return null;
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="site-popup-title" style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,.66)", display: "grid", placeItems: "center", padding: 18 }}>
      <section style={{ width: "min(100%, 520px)", background: "var(--panel-bg)", color: "var(--page-text)", border: "1px solid var(--border-strong)", boxShadow: "var(--panel-shadow)", padding: 24 }}>
        <Eyebrow color={popup.type === "disclaimer" ? "var(--danger)" : "var(--accent-secondary)"}>{popup.type === "disclaimer" ? "Safety reminder" : "Popup"}</Eyebrow>
        <h2 id="site-popup-title" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 30, margin: "8px 0" }}>{popup.title}</h2>
        <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.6, color: "var(--text-muted)" }}>{popup.message}</p>
        <Button onClick={onDismiss}>{popup.type === "disclaimer" ? "I understand" : "Let's go"}</Button>
      </section>
    </div>
  );
}

function OwnerDashboard({ role, reports, onStatusChange, bans = [], onSetPlayerAccess, popups, onSavePopup, onDeletePopup, staff, onSetSupport, tournaments, archiveEntries = [], blogPosts, onBlogReview, onPromoteBlog, archiveSubmissions = [], onArchiveDecision, auditLog = [], onOpenTournament, initialTab = "overview", circuitRecords = [], onSaveCircuit, onDeleteCircuit, onImportArchive, filterGames = FILTER_GAMES }) {
  const isOwner = role === "owner";
  const [tab, setTab] = useState(initialTab);
  const [editing, setEditing] = useState(null);
  const [staffUid, setStaffUid] = useState("");
  const [popupError, setPopupError] = useState("");
  const [staffError, setStaffError] = useState("");
  const activeReports = reports.filter((item) => !isReportArchived(item)).length;
  const pendingBlogs = blogPosts.filter((post) => post.status === "pending").length;
  const pendingArchiveRequests = archiveSubmissions.filter((item) => item.status === "pending").length;
  const activeTournaments = tournaments.filter((item) => !isTournamentArchived(item)).length;
  const openEditor = (popup = null) => {
    setPopupError("");
    const toLocalInput = (value) => {
      if (!value) return "";
      const date = new Date(Number(value));
      if (!Number.isFinite(date.getTime())) return "";
      date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
      return date.toISOString().slice(0, 16);
    };
    setEditing(popup ? { ...popup, startsAt: toLocalInput(popup.startsAt), endsAt: toLocalInput(popup.endsAt) } : { id: "", title: "", message: "", type: "motivation", enabled: true, frequency: "random", minimumOnline: 10, startsAt: "", endsAt: "" });
  };
  const savePopup = async () => {
    const title = String(editing?.title || "").trim();
    const message = String(editing?.message || "").trim();
    if (!title || !message) { setPopupError("Add both a title and message."); return; }
    if (editing.startsAt && editing.endsAt && new Date(editing.endsAt).getTime() <= new Date(editing.startsAt).getTime()) { setPopupError("The end time must be later than the start time."); return; }
    const payload = {
      title: title.slice(0, 100), message: message.slice(0, 1000),
      type: editing.type === "disclaimer" ? "disclaimer" : "motivation",
      enabled: editing.enabled === true,
      frequency: editing.type === "disclaimer" ? "registration" : (editing.frequency || "random"),
      minimumOnline: editing.frequency === "busy" ? Math.max(2, Math.min(1000000, Number(editing.minimumOnline) || 10)) : 0,
      startsAt: editing.startsAt ? new Date(editing.startsAt).getTime() : 0,
      endsAt: editing.endsAt ? new Date(editing.endsAt).getTime() : 0,
      updatedAt: Date.now(),
    };
    try { await onSavePopup(editing.id || null, payload); setEditing(null); }
    catch { setPopupError("Could not save this popup. Check the published Firebase rules and try again."); }
  };
  const assignSupport = async () => {
    const targetUid = staffUid.trim();
    if (!targetUid || targetUid.length > 128) { setStaffError("Enter a valid Firebase account UID."); return; }
    try { await onSetSupport(targetUid, true); setStaffUid(""); setStaffError(""); }
    catch { setStaffError("Could not update support access. Check the published Firebase rules."); }
  };

  return (
    <div style={{ paddingTop: 34 }}>
      <Eyebrow>{isOwner ? "Owner controls · protected" : "Support workspace · restricted"}</Eyebrow>
      <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 42, margin: "4px 0 18px" }}>{isOwner ? "Owner dashboard" : "Support dashboard"}</h1>
      <div role="tablist" aria-label="Dashboard sections" style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
        {["overview", "tournaments", "vault", "blogs", "reports", ...(isOwner ? ["activity log", "popups", "support access"] : [])].map((name) => <Button key={name} variant={tab === name ? "primary" : "ghost"} onClick={() => setTab(name)}>{name === "vault" ? "The Vault" : name[0].toUpperCase() + name.slice(1)}</Button>)}
      </div>
      {tab === "overview" && <>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 18 }}>
          {[["Open reports", activeReports, "reports"], ["Pending blogs", pendingBlogs, "blogs"], ["Vault requests", pendingArchiveRequests, "vault"], ["Active tournaments", activeTournaments, "tournaments"], ["Vault records", archiveEntries.length, "vault"]].map(([label, value, next]) => <button key={label} type="button" onClick={() => setTab(next)} style={{ padding: 16, background: "var(--panel-bg)", border: "1px solid var(--border)", textAlign: "left", cursor: "pointer", color: "inherit" }}><Eyebrow>{label}</Eyebrow><strong style={{ display: "block", fontSize: 25, marginTop: 8 }}>{value}</strong></button>)}
        </div>
        <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Monitor tournaments, The Vault, and the community blog from the tabs above{isOwner ? ". Owner-only tools for popups and support access stay in this desk." : "."}</p>
      </>}
      {tab === "reports" && <ReportsInbox reports={reports} onStatusChange={onStatusChange} bans={bans} role={role} onSetPlayerAccess={onSetPlayerAccess} />}
      {tab === "tournaments" && <div style={{ display: "grid", gap: 28 }}><CircuitCmsDesk surface="tournament" records={circuitRecords} role={role} onSave={onSaveCircuit} onDelete={onDeleteCircuit} games={filterGames} /><TournamentMonitor tournaments={tournaments} onOpen={onOpenTournament} /></div>}
      {tab === "vault" && <div style={{ display: "grid", gap: 28 }}><VaultResearchDesk records={circuitRecords} role={role} onSave={onSaveCircuit} onDelete={onDeleteCircuit} filterGames={filterGames} /><VaultMonitor submissions={archiveSubmissions} blogPosts={blogPosts} onDecision={onArchiveDecision} onPromote={onPromoteBlog} /></div>}
      {tab === "activity log" && isOwner && <StaffActivityLog actions={auditLog} />}
      {tab === "blogs" && <section><p style={{ color: "var(--text-muted)", fontSize: 13 }}>Watch every community blog from this desk. Publish or decline pending posts, then promote a published story into The Vault from the Vault tab.</p><div style={{ display: "flex", gap: 16, margin: "0 0 14px", fontSize: 13, color: "var(--text-muted)" }}><span>Pending {pendingBlogs}</span><span>Published {blogPosts.filter((post) => post.status === "published").length}</span><span>Total {blogPosts.length}</span></div>{blogPosts.length === 0 ? <EmptyState title="No blog posts yet" body="Community submissions will appear here for preview." /> : <div style={{ display: "grid", gap: 10 }}>{[...blogPosts].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 30).map((post) => <article key={post.id} style={{ padding: 14, background: "var(--panel-bg)", border: "1px solid var(--border)" }}><Eyebrow>{post.game} · {post.status}{post.eventScope ? ` · ${post.eventScope}` : ""} · by {post.authorName || "Player"}</Eyebrow><h2 style={{ fontFamily: "'Bebas Neue', sans-serif", margin: "6px 0" }}>{post.title}</h2><p style={{ whiteSpace: "pre-wrap", color: "var(--text-muted)" }}>{post.content}</p>{post.source && <a href={post.source} target="_blank" rel="noopener noreferrer">Source</a>}{post.status === "pending" && <div style={{ display: "flex", gap: 8, marginTop: 10 }}><Button onClick={() => onBlogReview(post.id, "published")}>Publish</Button><Button variant="danger" onClick={() => onBlogReview(post.id, "rejected")}>Decline</Button></div>}</article>)}</div>}</section>}
      {tab === "popups" && isOwner && <section>
        <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Create plain-text safety reminders or general popups. General popups appear at random intervals of 15 to 30 minutes while someone is actively browsing.</p>
        <Button onClick={() => openEditor()}>Add popup</Button>
        {editing && <div style={{ display: "grid", gap: 10, maxWidth: 620, padding: 16, marginTop: 14, background: "var(--panel-bg)", border: "1px solid var(--border)" }}>
          <Field label="Title"><TextInput value={editing.title} maxLength={100} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></Field>
          <Field label="Message"><textarea value={editing.message} maxLength={1000} rows={4} onChange={(e) => setEditing({ ...editing, message: e.target.value })} style={{ ...inputStyle, resize: "vertical" }} /></Field>
          <Field label="Type"><Select value={editing.type} onChange={(e) => { const type = e.target.value; setEditing({ ...editing, type, frequency: type === "disclaimer" ? "registration" : (editing.frequency === "registration" ? "random" : editing.frequency) }); }}><option value="motivation">Popup</option><option value="disclaimer">Safety disclaimer</option></Select></Field>
          {editing.type === "disclaimer" ? <Field label="Show frequency"><div style={{ padding: 10, border: "1px solid var(--border)", color: "var(--text-muted)", fontSize: 13 }}>Shown automatically before a player sends a tournament registration request.</div></Field> : <>
            <Field label="Show frequency"><Select value={editing.frequency || "random"} onChange={(e) => setEditing({ ...editing, frequency: e.target.value })}><option value="random">Casual — randomly every 15–30 minutes</option><option value="hourly">Every hour</option><option value="session">Once per visit</option><option value="busy">Only during high traffic</option></Select></Field>
            {editing.frequency === "busy" && <><Field label="High traffic means at least this many players online"><TextInput type="number" min="2" max="1000000" value={editing.minimumOnline || 10} onChange={(e) => setEditing({ ...editing, minimumOnline: e.target.value })} /></Field><div style={{ color: "var(--text-dim)", fontSize: 11 }}>High-traffic timing needs Realtime Database and the matching Firebase Functions deployed.</div></>}
          </>}
          <Field label="Start showing (optional)"><TextInput type="datetime-local" value={editing.startsAt || ""} onChange={(e) => setEditing({ ...editing, startsAt: e.target.value })} /></Field>
          <Field label="Stop showing (optional)"><TextInput type="datetime-local" value={editing.endsAt || ""} onChange={(e) => setEditing({ ...editing, endsAt: e.target.value })} /></Field>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}><input type="checkbox" checked={editing.enabled} onChange={(e) => setEditing({ ...editing, enabled: e.target.checked })} /> Enabled</label>
          {popupError && <div role="alert" style={{ color: "var(--danger)" }}>{popupError}</div>}
          <div style={{ display: "flex", gap: 8 }}><Button onClick={savePopup}>Save popup</Button><Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button></div>
        </div>}
        <div style={{ display: "grid", gap: 10, marginTop: 14 }}>{popups.map((popup) => <article key={popup.id} style={{ padding: 14, background: "var(--panel-bg)", border: "1px solid var(--border)" }}><Eyebrow>{popup.enabled ? "Enabled" : "Disabled"} · {popup.type === "motivation" ? "Popup" : "Safety disclaimer"} · {popup.type === "disclaimer" ? "Before registration" : popup.frequency === "hourly" ? "Every hour" : popup.frequency === "session" ? "Once per visit" : popup.frequency === "busy" ? `${popup.minimumOnline || 10}+ online` : "Every 15–30 minutes"}</Eyebrow><h2 style={{ fontFamily: "'Bebas Neue', sans-serif", margin: "5px 0" }}>{popup.title}</h2><p style={{ whiteSpace: "pre-wrap", color: "var(--text-muted)" }}>{popup.message}</p><div style={{ display: "flex", gap: 8 }}><Button variant="ghost" onClick={() => openEditor(popup)}>Edit</Button><Button variant="danger" onClick={() => onDeletePopup(popup.id)}>Delete</Button></div></article>)}</div>
      </section>}
      {tab === "support access" && isOwner && <section style={{ maxWidth: 680 }}>
        <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Support can review reports. Add only trusted people. For now, copy their Firebase Authentication UID from Firebase Console → Authentication → Users.</p>
     
   <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><TextInput aria-label="Support account UID" placeholder="Paste support person's UID" value={staffUid} onChange={(e) => setStaffUid(e.target.value)} /><Button onClick={assignSupport}>Grant support access</Button></div>
        {staffError && <div role="alert" style={{ color: "var(--danger)", marginTop: 8 }}>{staffError}</div>}
        <div style={{ display: "grid", gap: 8, marginTop: 16 }}>{staff.filter((item) => item.role === "support" && item.enabled !== false).map((item) => <article key={item.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", padding: 12, background: "var(--panel-bg)", border: "1px solid var(--border)" }}><code>{item.id}</code><Button variant="danger" onClick={() => onSetSupport(item.id, false)}>Remove access</Button></article>)}</div>
      </section>}
    </div>
  );
}

function normalizeVaultRecords(records, existingEntries) {
  const known = new Set(existingEntries.map((entry) => [entry.tournament, entry.game, entry.eventDate].map((part) => String(part || "").toLowerCase()).join("|")));
  const clean = records.filter((entry) => entry.tournament && entry.game && (entry.eventdate || entry.eventDate) && entry.winner).map((entry) => ({
    tournament: String(entry.tournament).slice(0, 120),
    game: String(entry.game).slice(0, 60),
    eventDate: String(entry.eventdate || entry.eventDate || "").slice(0, 40),
    winner: String(entry.winner).slice(0, 100),
    runnerUp: String(entry.runnerup || entry.runnerUp || "").slice(0, 100),
    mvp: String(entry.mvp || "").slice(0, 100),
    source: String(entry.source || "").trim().slice(0, 500),
    eventScope: ["ewc", "region", "random"].includes(entry.eventScope) ? entry.eventScope : inferEventScope(`${entry.tournament} ${entry.game}`),
  })).filter((entry) => {
    if (entry.source && !/^https:\/\//i.test(entry.source)) throw new Error("Source links must start with https://.");
    const key = [entry.tournament, entry.game, entry.eventDate].map((part) => part.toLowerCase()).join("|");
    if (known.has(key)) return false;
    known.add(key);
    return true;
  });
  if (!clean.length) throw new Error("No new complete records found. Check required fields and duplicates.");
  return clean.slice(0, 200);
}

function parseVaultText(text) {
  const lines = String(text || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) throw new Error("Paste at least one event.");
  const splitLine = (line) => {
    if (line.includes("|")) return line.split("|").map((cell) => cell.trim());
    if (line.includes("\t")) return line.split("\t").map((cell) => cell.trim());
    return line.split(",").map((cell) => cell.trim());
  };
  let rows = lines.map(splitLine);
  const header = rows[0].map((cell) => cell.toLowerCase().replace(/[\s_-]/g, ""));
  const required = ["tournament", "game", "eventdate", "winner"];
  if (required.every((key) => header.includes(key))) {
    rows = rows.slice(1);
    return rows.filter((cells) => cells.some(Boolean)).map((cells) => Object.fromEntries(header.map((key, index) => [key, cells[index] || ""])));
  }
  return rows.filter((cells) => cells.some(Boolean)).map((cells) => ({
    tournament: cells[0] || "",
    game: cells[1] || "",
    eventdate: cells[2] || "",
    winner: cells[3] || "",
    runnerup: cells[4] || "",
    mvp: cells[5] || "",
    source: cells[6] || "",
  }));
}

function parseVaultCsv(text) {
  const rows = []; let row = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"' && quoted && text[i + 1] === '"') { cell += '"'; i++; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { row.push(cell.trim()); cell = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) { if (cell || row.length) { row.push(cell.trim()); rows.push(row); } row = []; cell = ""; if (char === "\r" && text[i + 1] === "\n") i++; }
    else cell += char;
  }
  if (cell || row.length) { row.push(cell.trim()); rows.push(row); }
  if (rows.length < 2) throw new Error("The CSV needs a header and at least one event.");
  const headers = rows.shift().map((header) => header.toLowerCase().replace(/[\s_-]/g, ""));
  const required = ["tournament", "game", "eventdate", "winner"];
  if (required.some((header) => !headers.includes(header))) throw new Error("Required CSV columns: tournament, game, eventDate, winner.");
  return rows.filter((cells) => cells.some(Boolean)).map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] || ""]))).slice(0, 200);
}

function StaffVaultFill({ entries = [], onImport }) {
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState(null);
  const [staffForm, setStaffForm] = useState({ tournament: "", game: "", eventDate: "", winner: "", runnerUp: "", mvp: "", source: "", eventScope: "ewc" });
  const [paste, setPaste] = useState("");
  const stageRecords = (records) => {
    const clean = normalizeVaultRecords(records, entries);
    setPreview(clean);
    setMessage("Review the records below, then publish them to The Vault.");
  };
  const updateStaff = (key, value) => setStaffForm((current) => ({ ...current, [key]: value }));
  if (!onImport) return null;
  return (
    <section style={{ display: "grid", gap: 10, maxWidth: 680, padding: 16, background: "var(--panel-bg)", border: "1px solid var(--border)" }}>
      <Eyebrow>Staff desk · fill The Vault</Eyebrow>
      <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 13 }}>Type one event, or paste a list. Isolated to the staff portal.</p>
      <Field label="Tournament"><TextInput maxLength={120} value={staffForm.tournament} onChange={(event) => updateStaff("tournament", event.target.value)} /></Field>
      <Field label="Game"><TextInput maxLength={60} value={staffForm.game} onChange={(event) => updateStaff("game", event.target.value)} /></Field>
      <Field label="Event date"><TextInput maxLength={40} value={staffForm.eventDate} onChange={(event) => updateStaff("eventDate", event.target.value)} placeholder="YYYY or YYYY-MM-DD" /></Field>
      <Field label="Winner"><TextInput maxLength={100} value={staffForm.winner} onChange={(event) => updateStaff("winner", event.target.value)} /></Field>
      <Field label="Runner-up (optional)"><TextInput maxLength={100} value={staffForm.runnerUp} onChange={(event) => updateStaff("runnerUp", event.target.value)} /></Field>
      <Field label="MVP (optional)"><TextInput maxLength={100} value={staffForm.mvp} onChange={(event) => updateStaff("mvp", event.target.value)} /></Field>
      <Field label="Source link (optional)"><TextInput maxLength={500} value={staffForm.source} onChange={(event) => updateStaff("source", event.target.value)} placeholder="https://" /></Field>
      <Field label="Event type"><Select value={staffForm.eventScope} onChange={(event) => updateStaff("eventScope", event.target.value)}>{EVENT_SCOPES.map((scope) => <option key={scope.id} value={scope.id}>{scope.label}</option>)}</Select></Field>
      <Button onClick={() => { setError(""); setMessage(""); try { stageRecords([{ tournament: staffForm.tournament, game: staffForm.game, eventdate: staffForm.eventDate, winner: staffForm.winner, runnerup: staffForm.runnerUp, mvp: staffForm.mvp, source: staffForm.source, eventScope: staffForm.eventScope }]); setStaffForm({ tournament: "", game: "", eventDate: "", winner: "", runnerUp: "", mvp: "", source: "", eventScope: "ewc" }); } catch (issue) { setError(issue.message || "Could not stage this event."); } }}>Stage this event</Button>
      <Field label="Paste a list of events">
        <textarea value={paste} onChange={(event) => setPaste(event.target.value)} rows={6} placeholder={"IEM Katowice|CS2|2024-02-11|Team Spirit|FaZe|donk|https://example.com"} style={{ ...inputStyle, resize: "vertical", minHeight: 120 }} />
      </Field>
      <Button variant="ghost" onClick={() => { setError(""); setMessage(""); try { stageRecords(parseVaultText(paste)); setPaste(""); } catch (issue) { setError(issue.message || "Could not read that list."); } }}>Stage pasted events</Button>
      <Field label="Or import a CSV (up to 200 rows)">
        <input type="file" accept=".csv,text/csv" onChange={async (event) => {
          setError(""); setMessage("");
          const file = event.target.files?.[0]; if (!file) return;
          if (file.size > 1024 * 1024) { setError("Choose a CSV smaller than 1 MB."); return; }
          try { stageRecords(parseVaultCsv(await file.text())); }
          catch (issue) { setError(issue.message || "Could not read this CSV."); }
          event.target.value = "";
        }} />
      </Field>
      {error && <div role="alert" style={{ color: "var(--danger)", fontSize: 13 }}>{error}</div>}
      {message && <div role="status" style={{ color: "var(--success)", fontSize: 13 }}>{message}</div>}
      {preview && <div>
        <Eyebrow>Import preview · {preview.length} record(s)</Eyebrow>
        <div style={{ display: "grid", gap: 6, margin: "10px 0 14px", fontSize: 12, color: "var(--text-muted)" }}>
          {preview.slice(0, 8).map((entry, index) => <div key={index}>{entry.eventDate} · {entry.game} · {entry.tournament} · Winner: {entry.winner}</div>)}
        </div>
        <div style={{ display: "flex", gap: 8 }}><Button onClick={async () => {
          try { await onImport(preview); setMessage(`Published ${preview.length} event(s) to The Vault.`); setPreview(null); }
          catch (issue) { setError(issue.message || "Could not import these records."); }
        }}>Publish {preview.length} to The Vault</Button><Button variant="ghost" onClick={() => { setPreview(null); setMessage(""); }}>Cancel</Button></div>
      </div>}
    </section>
  );
}

function HistoricalArchive({ entries, user, submissions, onSubmitRequest, onSignIn, embedded = false }) {
  return (
    <div className={embedded ? "pt-2" : "pt-6"}>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <Eyebrow>Past esports results</Eyebrow>
          <h2 className="m-0 font-['Bebas_Neue',sans-serif] text-3xl tracking-wide">Historical archive</h2>
        </div>
        <ArchiveRequestForm user={user} submissions={submissions} onSubmit={onSubmitRequest} onSignIn={onSignIn} />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {entries.length === 0 ? <EmptyState title="The Vault is waiting for results" body="Suggest an event with the + control. Staff publish records from the isolated portal." /> : entries.map((entry) => (
          <article key={entry.id} className="overflow-hidden border border-white/10 bg-black/20">
            <div className="aspect-video overflow-hidden">
              <img src={flyerForEvent(entry)} alt="" className="h-full w-full object-cover" />
            </div>
            <div className="p-4">
              <Eyebrow>{entry.game} · {entry.eventDate}{entry.eventScope ? ` · ${entry.eventScope}` : ""}</Eyebrow>
              <h3 className="my-1 font-['Bebas_Neue',sans-serif] text-2xl">{entry.tournament}</h3>
              <div className="text-sm text-stone-300">Winner {entry.winner}{entry.runnerUp ? ` · Runner-up ${entry.runnerUp}` : ""}{entry.mvp ? ` · MVP ${entry.mvp}` : ""}</div>
              {entry.source && <a href={entry.source} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm text-amber-300">Source</a>}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function LoadingScreen({ label }) {
  return <div role="status" aria-live="polite" style={{ minHeight: "60vh", display: "grid", placeItems: "center", background: "var(--page-bg-solid, #101820)", color: "var(--page-text, #EDF1F4)", fontFamily: "'Inter',sans-serif" }}><div style={{ textAlign: "center" }}><div className="grind-loader" aria-hidden="true"><span>G</span></div><div style={{ marginTop: 16 }}>{label}…</div><style>{`.grind-loader{width:68px;height:68px;margin:auto;border:2px solid var(--border,#314);border-top-color:var(--accent,#08f);border-right-color:var(--accent-secondary,#0dc);border-radius:50%;display:grid;place-items:center;animation:grind-spin 1.2s linear infinite}.grind-loader span{font-family:'Bebas Neue',sans-serif;font-size:30px;animation:grind-spin 1.2s linear infinite reverse}@keyframes grind-spin{to{transform:rotate(360deg)}}@media(prefers-reduced-motion:reduce){.grind-loader,.grind-loader span{animation:none}}`}</style></div></div>;
}

function BlogPage({ posts, user, isModerator, onSubmit, onReview, onEdit, onDelete, onSignIn, embedded = false, manageInDrawer = false }) {
  const [title, setTitle] = useState("");
  const [game, setGame] = useState("");
  const [eventScope, setEventScope] = useState("random");
  const [content, setContent] = useState("");
  const [source, setSource] = useState("");
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState("");
  const [manageOpen, setManageOpen] = useState(false);
  const [draft, setDraft] = useState({ title: "", game: "", content: "", source: "", eventScope: "random" });
  const visible = posts.filter((post) => post.status === "published" || (user && post.authorId === user.uid) || (isModerator && post.status === "pending"));
  const submit = async () => {
    if (!title.trim() || !game.trim() || !content.trim()) { setError("Add a title, game, and post text."); return; }
    if (source.trim() && !/^https:\/\//i.test(source.trim())) { setError("Use a secure https source link."); return; }
    try { await onSubmit({ title: title.trim(), game: game.trim(), content: content.trim(), source: source.trim(), eventScope }); setTitle(""); setGame(""); setEventScope("random"); setContent(""); setSource(""); setError(""); }
    catch { setError("Could not submit this post. Please try again."); }
  };
  const startEdit = (post) => { setEditingId(post.id); setDraft({ title: post.title || "", game: post.game || "", content: post.content || "", source: post.source || "", eventScope: post.eventScope || "random" }); setError(""); };
  const saveEdit = async (post) => {
    if (!draft.title.trim() || !draft.game.trim() || !draft.content.trim()) { setError("Add a title, game, and post text."); return; }
    if (draft.source.trim() && !/^https:\/\//i.test(draft.source.trim())) { setError("Use a secure https source link."); return; }
    try { await onEdit(post, { title: draft.title.trim(), game: draft.game.trim(), content: draft.content.trim(), source: draft.source.trim(), eventScope: draft.eventScope || "random" }); setEditingId(""); setError(""); }
    catch { setError("Could not save this post. Please try again."); }
  };
  const compose = user ? <section style={{ display: "grid", gap: 10, padding: 16, background: "var(--panel-bg)", border: "1px solid var(--border)", maxWidth: 680 }}><p style={{ color: "var(--text-muted)", fontSize: 13, margin: 0 }}>Send a tournament recap or esports story to the GrindInfo owner for review.</p><Field label="Post title"><TextInput value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} /></Field><Field label="Game"><TextInput value={game} maxLength={60} onChange={(e) => setGame(e.target.value)} placeholder="e.g. Valorant" /></Field><Field label="Event type"><Select value={eventScope} onChange={(e) => setEventScope(e.target.value)}>{EVENT_SCOPES.map((scope) => <option key={scope.id} value={scope.id}>{scope.label}</option>)}</Select></Field><Field label="Story or tournament update"><textarea value={content} maxLength={6000} onChange={(e) => setContent(e.target.value)} rows={6} style={{ ...inputStyle, resize: "vertical" }} /></Field><Field label="Source link (optional)"><TextInput value={source} maxLength={500} onChange={(e) => setSource(e.target.value)} placeholder="https://" /></Field>{error && !editingId && <span role="alert" style={{ color: "var(--danger)" }}>{error}</span>}<Button onClick={submit}>Request publication</Button></section> : <section style={{ maxWidth: 680, padding: 16, marginTop: 14, background: "var(--panel-bg)", border: "1px solid var(--border)" }}><div style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 10 }}>Sign in to request that a blog post be published.</div><Button onClick={onSignIn}>Sign in to request a post</Button></section>;
  return <div style={{ paddingTop: embedded ? 16 : 32, paddingBottom: manageInDrawer ? 88 : 0 }}>{!embedded && <><Eyebrow>Community stories</Eyebrow><h1 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 42 }}>Esports blog</h1><p style={{ color: "var(--text-muted)" }}>Read community stories, tournament recaps, and esports updates.</p></>}{embedded && <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, margin: "0 0 12px" }}>Community blog</h2>}{!manageInDrawer && compose}<div style={{ display: "grid", gap: 12, marginTop: 20 }}>{visible.map((post) => <article key={post.id} style={{ padding: 16, background: "var(--panel-bg)", border: "1px solid var(--border)" }}><Eyebrow>{post.game} · {post.status}{post.eventScope ? ` · ${post.eventScope}` : ""}</Eyebrow>{editingId === post.id ? <div style={{ display: "grid", gap: 8, marginTop: 8 }}><Field label="Post title"><TextInput maxLength={120} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></Field><Field label="Game"><TextInput maxLength={60} value={draft.game} onChange={(e) => setDraft({ ...draft, game: e.target.value })} /></Field><Field label="Event type"><Select value={draft.eventScope || "random"} onChange={(e) => setDraft({ ...draft, eventScope: e.target.value })}>{EVENT_SCOPES.map((scope) => <option key={scope.id} value={scope.id}>{scope.label}</option>)}</Select></Field><Field label="Story"><textarea maxLength={6000} rows={6} value={draft.content} onChange={(e) => setDraft({ ...draft, content: e.target.value })} style={{ ...inputStyle, resize: "vertical" }} /></Field><Field label="Source link (optional)"><TextInput maxLength={500} value={draft.source} onChange={(e) => setDraft({ ...draft, source: e.target.value })} /></Field><div style={{ display: "flex", gap: 8 }}><Button onClick={() => saveEdit(post)}>Save changes</Button><Button variant="ghost" onClick={() => setEditingId("")}>Cancel</Button></div></div> : <><h2 style={{ fontFamily: "'Bebas Neue',sans-serif" }}>{post.title}</h2><div style={{ color: "var(--text-muted)", whiteSpace: "pre-wrap" }}>{post.content}</div><div style={{ marginTop: 8, fontSize: 12 }}>By {post.authorName || "Player"}</div>{post.source && <a href={post.source} target="_blank" rel="noopener noreferrer">Source</a>}{isModerator && post.status === "pending" && <div style={{ display: "flex", gap: 8, marginTop: 12 }}><Button onClick={() => onReview(post.id, "published")}>Publish</Button><Button variant="danger" onClick={() => onReview(post.id, "rejected")}>Decline</Button></div>}{(user && post.authorId === user.uid || isModerator) && <div style={{ display: "flex", gap: 8, marginTop: 12 }}><Button variant="ghost" onClick={() => startEdit(post)}>Edit post</Button><Button variant="danger" onClick={() => { if (window.confirm("Delete this blog post? This cannot be undone.")) onDelete(post); }}>Delete post</Button></div>}{user && post.authorId === user.uid && post.status === "published" && <small style={{ display: "block", marginTop: 8, color: "var(--text-muted)" }}>Saving an edit sends the post back for review.</small>}</>}{error && editingId === post.id && <div role="alert" style={{ color: "var(--danger)", marginTop: 8 }}>{error}</div>}</article>)}</div>{manageInDrawer && <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#17110f]/95 backdrop-blur-md"><button type="button" onClick={() => setManageOpen((open) => !open)} className="flex w-full items-center justify-between px-5 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-amber-300"><span>Manage Posts</span><span aria-hidden="true">{manageOpen ? "−" : "+"}</span></button>{manageOpen && <div className="max-h-[48vh] overflow-y-auto border-t border-white/10 px-5 py-4">{compose}</div>}</div>}</div>;
}



export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const windowLocation = useWindowLocation();
  const routePath = windowLocation.pathname || location.pathname;
  const [tournaments, setTournaments] = useState([]);
  const [selectedTeams, setSelectedTeams] = useState([]);
  const [selectedMatches, setSelectedMatches] = useState([]);
  const [selectedStats, setSelectedStats] = useState([]);
  const [selectedRegistrations, setSelectedRegistrations] = useState([]);
  const [selectedLobby, setSelectedLobby] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [view, setView] = useState(() => /^\/tournaments\/[^/]+/.test(window.location.pathname) || new URLSearchParams(window.location.search).has("tournament") ? "detail" : "list");
  const [selectedId, setSelectedId] = useState(() => window.location.pathname.match(/^\/tournaments\/([^/]+)/)?.[1] || new URLSearchParams(window.location.search).get("tournament"));
  const [showNewTournament, setShowNewTournament] = useState(false);
  const [joinDisclaimerOpen, setJoinDisclaimerOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState(null);
  const [isModerator, setIsModerator] = useState(false);
  const [siteRole, setSiteRole] = useState(null);
  const [siteRoleResolved, setSiteRoleResolved] = useState(!auth.currentUser);
  const [friendRequests, setFriendRequests] = useState([]);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [tournamentInvites, setTournamentInvites] = useState([]);
  const [activeChatFriend, setActiveChatFriend] = useState(null);
  const [archiveEntries, setArchiveEntries] = useState([]);
  const [archiveSubmissions, setArchiveSubmissions] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [blogPosts, setBlogPosts] = useState([]);
  const [privateReports, setPrivateReports] = useState([]);
  const [siteBans, setSiteBans] = useState([]);
  const [myAccess, setMyAccess] = useState(null);
  const [activePopups, setActivePopups] = useState([]);
  const [adminPopups, setAdminPopups] = useState([]);
  const [siteStaff, setSiteStaff] = useState([]);
  const [currentPopup, setCurrentPopup] = useState(null);
  const [popupScanTick, setPopupScanTick] = useState(0);
  const [onlinePlayerCount, setOnlinePlayerCount] = useState(null);

  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [guestMode, setGuestMode] = useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [knownAccounts, setKnownAccounts] = useState(() => readKnownAccounts());

  useEffect(() => {
    let unsub = () => {};
    let cancelled = false;
    (async () => {
      try {
        await completeGoogleSignInReturn();
      } catch (e) {
        if (!cancelled) {
          setAuthError(e.code === "auth/unauthorized-domain"
            ? "This site isn't allowed for Google sign-in yet."
            : "Couldn't finish Google sign-in — try email instead.");
        }
      }
      if (cancelled) return;
      unsub = onAuthStateChanged(auth, (u) => {
        setUser(u);
        const returningGuest = !u && sessionStorage.getItem("grindinfo-guest-mode") === "true";
        setGuestMode(returningGuest);
        setAuthDialogOpen(!u && !returningGuest);
        if (!u) {
          setView("list");
          setShowNewTournament(false);
          setReportTarget(null);
        }
        if (u) {
          sessionStorage.removeItem("grindinfo-guest-mode");
          rememberKnownAccount({
            uid: u.uid,
            email: u.email || "",
            handle: u.displayName && String(u.displayName).includes("#") ? String(u.displayName).toLowerCase() : "",
            label: u.displayName || u.email || "Player",
            provider: u.providerData?.some((item) => item.providerId === "google.com") ? "google" : "password",
          });
          setKnownAccounts(readKnownAccounts());
        }
        setAuthLoading(false);
      });
    })();
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  const handleGoogleSignIn = useCallback(async () => {
    setAuthError("");
    setAuthBusy(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      if (e?.code === "auth/popup-closed-by-user" || e?.code === "auth/cancelled-popup-request") {
        setAuthBusy(false);
        return;
      }
      setAuthError(e?.code === "auth/unauthorized-domain"
        ? "This site isn't allowed for Google sign-in yet."
        : "Couldn't finish Google sign-in — use Dummybot email/password, or try Google again.");
      setAuthBusy(false);
    }
  }, []);

  const handleEmailAuth = useCallback(async (mode, { name, email, password }) => {
    setAuthError("");
    setAuthBusy(true);
    try {
      if (mode === "signup") {
        if (!isValidPlayerName(name)) {
          setAuthError("Use 3–16 letters, numbers, or underscore. Your ID will be Name#1234.");
          return;
        }
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: playerNameFromInput(name) });
      } else {
        const identifier = String(email || "").trim();
        const handle = normalizeHandle(identifier);
        let accountEmail = identifier;
        if (handle) {
          try {
            const snapshot = await getDoc(handleDocRef(handle));
            const mapped = snapshot.data()?.email;
            if (snapshot.exists() && mapped) accountEmail = mapped;
            else if (!isEmailLike(identifier)) {
              setAuthError("That GrindInfo ID is not linked yet. Use the email for that account, or Continue with Google for your main login.");
              return;
            }
          } catch {
            if (!isEmailLike(identifier)) {
              setAuthError("Couldn't look up that GrindInfo ID. Use the account email, or Continue with Google.");
              return;
            }
          }
        }
        await signInWithEmailAndPassword(auth, accountEmail, password);
      }
    } catch (e) {
      const messages = {
        "auth/email-already-in-use": "That email is already registered — try signing in instead.",
        "auth/invalid-credential": "Incorrect email or password. Your original GrindInfo account is usually Google — use Continue with Google. Dummybot uses its email and password.",
        "auth/wrong-password": "Incorrect password. Google accounts do not use this password box.",
        "auth/user-not-found": "No email/password account matches that. Try Continue with Google.",
        "auth/too-many-requests": "Too many attempts. Wait a minute, then try again.",
        "auth/network-request-failed": "Network error. Check your connection and try again.",
        "auth/user-disabled": "This account is disabled.",
        "auth/weak-password": "Password should be at least 6 characters.",
        "auth/invalid-email": "That email address doesn't look right.",
      };
      setAuthError(messages[e.code] || "Something went wrong — try again.");
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const handleSignOut = useCallback(() => {
    sessionStorage.removeItem("grindinfo-guest-mode");
    signOut(auth);
  }, []);

  const handleSwitchAccount = useCallback(() => {
    sessionStorage.removeItem("grindinfo-guest-mode");
    setGuestMode(false);
    setAuthDialogOpen(true);
    setAuthError("");
    signOut(auth);
  }, []);

  const browseAsGuest = useCallback(() => {
    sessionStorage.setItem("grindinfo-guest-mode", "true");
    setGuestMode(true);
    setAuthDialogOpen(false);
    setAuthError("");
  }, []);

  // ---- player profiles ----
  const [dashTabHint, setDashTabHint] = useState(() => new URLSearchParams(window.location.search).get("tab") || "overview");
  const [showFriendRequests, setShowFriendRequests] = useState(false);
  const [mutedFriendIds, setMutedFriendIds] = useState([]);
  const [showArchivedTournaments, setShowArchivedTournaments] = useState(false);
  const circuitCms = useCircuitCms({ canWrite: Boolean(siteRole) });
  const liveEsportsBanners = useEsportsMedia();
  const blogSlides = useMemo(() => slidesFromBlogs(blogPosts), [blogPosts]);
  const ewcWindows = useMemo(() => ewcFloatingSlides(circuitCms.researchSlides), [circuitCms.researchSlides]);
  const vaultSlides = useMemo(() => {
    const seen = new Set();
    return mergeVaultMedia([...ewcWindows, ...circuitCms.researchSlides, ...blogSlides], liveEsportsBanners).filter((slide) => {
      const key = slide.slug || slide.id;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [ewcWindows, circuitCms.researchSlides, blogSlides, liveEsportsBanners]);
  const homeSlides = useMemo(
    () => [...ewcWindows, ...blogSlides].sort((a, b) => (Number(b.floatingPriority) || 0) - (Number(a.floatingPriority) || 0)),
    [ewcWindows, blogSlides],
  );
  const [myProfile, setMyProfile] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  useEffect(() => {
    if (!user) {
      setMyProfile(null);
      return;
    }
    const unsub = onSnapshot(playerDocRef(user.uid), (snap) => {
      const profile = snap.exists() ? snap.data() : null;
      setMyProfile(profile);
      rememberKnownAccount({
        uid: user.uid,
        email: user.email || "",
        handle: profile?.handle || "",
        label: grindHandle(safeProfileName(profile?.displayName, user.displayName), profile?.playerTag),
        provider: user.providerData?.some((item) => item.providerId === "google.com") ? "google" : "password",
      });
      const dismissed = localStorage.getItem(`profilePromptDismissed_${user.uid}`);
      if (!profile && !dismissed) {
        setShowProfileModal(true);
      }
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user) { setIsModerator(false); setSiteRole(null); setSiteRoleResolved(true); return undefined; }
    setSiteRoleResolved(false);
    const stopRole = onSnapshot(doc(SITE_ROLES_COLLECTION, user.uid), (snapshot) => {
      const data = snapshot.exists() ? snapshot.data() : null;
      setSiteRole(data?.enabled !== false && ["owner", "support"].includes(data?.role) ? data.role : null);
      setSiteRoleResolved(true);
    }, () => { setSiteRole(null); setSiteRoleResolved(true); });
    const stopModerator = onSnapshot(doc(db, "moderators", user.uid), (snapshot) => {
      setIsModerator(snapshot.exists() && snapshot.data().enabled === true);
    }, () => setIsModerator(false));
    return () => { stopRole(); stopModerator(); };
  }, [user]);

  useEffect(() => {
    if (!user) return undefined;
    return onSnapshot(doc(SITE_BANS_COLLECTION, user.uid), (snapshot) => {
      if (snapshot.exists() && snapshot.data()?.active === true) signOut(auth);
    }, () => {});
  }, [user]);

  useEffect(() => {
    if (!user || !realtimeDb) return undefined;
    const statusRef = databaseRef(realtimeDb, `status/${user.uid}`);
    const connectionRef = databaseRef(realtimeDb, ".info/connected");
    const updatePresence = () => setDatabaseValue(statusRef, {
      state: document.visibilityState === "visible" ? "online" : "away",
      lastChanged: serverTimestamp(),
    }).catch(() => {});
    const stopConnection = onValue(connectionRef, (snapshot) => {
      if (snapshot.val() !== true) return;
      onDisconnect(statusRef).set({ state: "offline", lastChanged: serverTimestamp() }).then(updatePresence).catch(() => {});
    });
    document.addEventListener("visibilitychange", updatePresence);
    return () => {
      document.removeEventListener("visibilitychange", updatePresence);
      stopConnection();
      setDatabaseValue(statusRef, { state: "offline", lastChanged: serverTimestamp() }).catch(() => {});
    };
  }, [user]);

  const blockedIds = new Set(blockedUsers.map((item) => item.blockerUid === user?.uid ? item.blockedUid : item.blockerUid));
  const acceptedFriendUids = [...new Set(friendRequests.filter((item) => item.status === "accepted").map((item) => item.requesterId === user?.uid ? item.recipientId : item.requesterId).filter((uid) => !blockedIds.has(uid)))];
  const acceptedFriends = [...new Map(friendRequests.filter((item) => item.status === "accepted").map((item) => {
    const outgoing = item.requesterId === user?.uid;
    const uid = outgoing ? item.recipientId : item.requesterId;
    return [uid, { uid, name: outgoing ? (item.recipientName || "Player") : (item.requesterName || "Player") }];
  }).filter(([uid]) => !blockedIds.has(uid))).values()];
  const acceptedFriendKey = acceptedFriendUids.slice().sort().join("|");
  useEffect(() => {
    if (!user || !realtimeDb || !acceptedFriendUids.length) return;
    httpsCallable(getFunctions(), "syncMyFriendPresenceLinks")({ friendUids: acceptedFriendUids }).catch(() => {});
  }, [user, acceptedFriendKey]);

  useEffect(() => {
    if (!user) { setFriendRequests([]); return undefined; }
    let incoming = [], outgoing = [];
    const publish = () => setFriendRequests([...incoming, ...outgoing.filter((out) => !incoming.some((inbox) => inbox.id === out.id))]);
    const stopIncoming = onSnapshot(query(FRIEND_REQUESTS_COLLECTION, where("recipientId", "==", user.uid)), (snapshot) => {
      incoming = snapshot.docs.map((item) => ({ id: item.id, ...item.data() })); publish();
    }, () => { incoming = []; publish(); });
    const stopOutgoing = onSnapshot(query(FRIEND_REQUESTS_COLLECTION, where("requesterId", "==", user.uid)), (snapshot) => {
      outgoing = snapshot.docs.map((item) => ({ id: item.id, ...item.data() })); publish();
    }, () => { outgoing = []; publish(); });
    return () => { stopIncoming(); stopOutgoing(); };
  }, [user]);

  useEffect(() => {
    if (!user) { setBlockedUsers([]); return undefined; }
    let blocking = [], blockedBy = [];
    const publish = () => setBlockedUsers([...new Map([...blocking, ...blockedBy].map((item) => [item.id, item])).values()]);
    const stopBlocking = onSnapshot(query(collection(db, "userBlocks"), where("blockerUid", "==", user.uid)), (snapshot) => { blocking = snapshot.docs.map((item) => ({ id: item.id, ...item.data() })); publish(); }, () => { blocking = []; publish(); });
    const stopBlockedBy = onSnapshot(query(collection(db, "userBlocks"), where("blockedUid", "==", user.uid)), (snapshot) => { blockedBy = snapshot.docs.map((item) => ({ id: item.id, ...item.data() })); publish(); }, () => { blockedBy = []; publish(); });
    return () => { stopBlocking(); stopBlockedBy(); };
  }, [user]);

  useEffect(() => {
    if (!user) { setTournamentInvites([]); return undefined; }
    let incoming = [], outgoing = [];
    const publish = () => setTournamentInvites([...new Map([...incoming, ...outgoing].map((item) => [item.id, item])).values()]);
    const stops = [
      onSnapshot(query(TOURNAMENT_INVITES_COLLECTION, where("inviteeUid", "==", user.uid), where("status", "==", "pending")), (snapshot) => { incoming = snapshot.docs.map((item) => ({ id: item.id, ...item.data() })); publish(); }, () => { incoming = []; publish(); }),
      onSnapshot(query(TOURNAMENT_INVITES_COLLECTION, where("invitedBy", "==", user.uid)), (snapshot) => { outgoing = snapshot.docs.map((item) => ({ id: item.id, ...item.data() })); publish(); }, () => { outgoing = []; publish(); }),
    ];
    return () => stops.forEach((stop) => stop());
  }, [user]);

  useEffect(() => {
    if (!user || !myProfile || (myProfile.playerTag && myProfile.handle)) return undefined;
    let active = true;
    claimUniqueHandle(user, myProfile.displayName, myProfile.playerTag || "")
      .then(async (claimed) => {
        if (!active) return;
        await setDoc(playerDocRef(user.uid), { playerTag: claimed.tag, handle: claimed.handle, updatedAt: Date.now() }, { merge: true });
        try { await updateProfile(user, { displayName: grindHandle(myProfile.displayName, claimed.tag) }); } catch { /* keep the existing Auth name */ }
      })
      .catch(() => {});
    return () => { active = false; };
  }, [user, myProfile?.displayName, myProfile?.playerTag, myProfile?.handle]);

  useEffect(() => {
    let publicPosts = [], ownPosts = [], pendingPosts = [];
    const publish = () => setBlogPosts([...new Map([...publicPosts, ...ownPosts, ...pendingPosts].map((post) => [post.id, post])).values()]);
    const stops = [onSnapshot(query(BLOG_POSTS_COLLECTION, where("status", "==", "published")), (snap) => { publicPosts = snap.docs.map((d) => ({ id: d.id, ...d.data() })); publish(); }, () => { publicPosts = []; publish(); })];
    if (user) stops.push(onSnapshot(query(BLOG_POSTS_COLLECTION, where("authorId", "==", user.uid)), (snap) => { ownPosts = snap.docs.map((d) => ({ id: d.id, ...d.data() })); publish(); }, () => { ownPosts = []; publish(); }));
    if (isModerator || siteRole === "owner" || siteRole === "support") stops.push(onSnapshot(query(BLOG_POSTS_COLLECTION, where("status", "==", "pending")), (snap) => { pendingPosts = snap.docs.map((d) => ({ id: d.id, ...d.data() })); publish(); }, () => { pendingPosts = []; publish(); }));
    return () => stops.forEach((stop) => stop());
  }, [user, isModerator, siteRole]);

  useEffect(() => onSnapshot(ARCHIVE_COLLECTION, (snapshot) => {
    setArchiveEntries(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
  }, () => setArchiveEntries([])), []);

  useEffect(() => {
    if (!user) { setArchiveSubmissions([]); return undefined; }
    let own = [], staff = [];
    const publish = () => setArchiveSubmissions([...new Map([...own, ...staff].map((item) => [item.id, item])).values()]);
    const stops = [onSnapshot(query(ARCHIVE_SUBMISSIONS_COLLECTION, where("submitterId", "==", user.uid)), (snapshot) => { own = snapshot.docs.map((item) => ({ id: item.id, ...item.data() })); publish(); }, () => { own = []; publish(); })];
    if (siteRole === "owner" || siteRole === "support") stops.push(onSnapshot(ARCHIVE_SUBMISSIONS_COLLECTION, (snapshot) => { staff = snapshot.docs.map((item) => ({ id: item.id, ...item.data() })); publish(); }, () => { staff = []; publish(); }));
    return () => stops.forEach((stop) => stop());
  }, [user, siteRole]);

  useEffect(() => {
    if (siteRole !== "owner") { setAuditLog([]); return undefined; }
    return onSnapshot(query(STAFF_ACTIONS_COLLECTION, orderBy("createdAt", "desc"), limit(100)), (snapshot) => setAuditLog(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))), () => setAuditLog([]));
  }, [siteRole]);

  useEffect(() => {
    const hasBusyPopup = activePopups.some((popup) => popup.enabled === true && popup.type === "motivation" && popup.frequency === "busy");
    if (!user || !hasBusyPopup) { setOnlinePlayerCount(null); return undefined; }
    let active = true;
    const refreshCount = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const result = await httpsCallable(getFunctions(), "getOnlinePlayerCount")();
        if (active) setOnlinePlayerCount(Number(result.data?.count) || 0);
      } catch { if (active) setOnlinePlayerCount(null); }
    };
    refreshCount();
    const timer = window.setInterval(refreshCount, 60 * 1000);
    document.addEventListener("visibilitychange", refreshCount);
    return () => { active = false; window.clearInterval(timer); document.removeEventListener("visibilitychange", refreshCount); };
  }, [user, activePopups]);

  useEffect(() => {
    if (siteRole !== "owner" && siteRole !== "support") { setPrivateReports([]); return undefined; }
    return onSnapshot(REPORTS_COLLECTION, (snapshot) => {
      setPrivateReports(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
    }, () => setPrivateReports([]));
  }, [isModerator, siteRole]);

  useEffect(() => {
    if (siteRole !== "owner" && siteRole !== "support") { setSiteBans([]); return undefined; }
    return onSnapshot(SITE_BANS_COLLECTION, (snapshot) => setSiteBans(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))), () => setSiteBans([]));
  }, [siteRole]);

  useEffect(() => {
    if (!user) { setMyAccess(null); return undefined; }
    return onSnapshot(doc(db, "siteBans", user.uid), (snapshot) => setMyAccess(snapshot.exists() ? snapshot.data() : null), () => setMyAccess(null));
  }, [user]);

  useEffect(() => {
    if (!user) { setActivePopups([]); return undefined; }
    return onSnapshot(query(SITE_POPUPS_COLLECTION, where("enabled", "==", true)), (snapshot) => {
      setActivePopups(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
    }, () => setActivePopups([]));
  }, [user]);

  useEffect(() => {
    if (siteRole !== "owner") { setAdminPopups([]); setSiteStaff([]); return undefined; }
    const stopPopups = onSnapshot(SITE_POPUPS_COLLECTION, (snapshot) => setAdminPopups(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))), () => setAdminPopups([]));
    const stopStaff = onSnapshot(SITE_ROLES_COLLECTION, (snapshot) => setSiteStaff(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))), () => setSiteStaff([]));
    return () => { stopPopups(); stopStaff(); };
  }, [siteRole]);

  useEffect(() => {
    if (!user) return;
    const getKeys = (popup) => ({
      next: `grindinfo-popup-next:${user.uid}:${popup.id}:${popup.frequency || "random"}`,
      session: `grindinfo-popup-session:${user.uid}:${popup.id}`,
    });
    const scheduleNext = (popup, now = Date.now()) => {
      const { next } = getKeys(popup);
      const delay = popup.frequency === "hourly" ? 60 * 60 * 1000 : (15 + Math.random() * 15) * 60 * 1000;
      const nextAt = now + delay;
      localStorage.setItem(next, String(nextAt));
      return nextAt;
    };
    const candidates = activePopups.filter((popup) => popup.enabled === true && popup.type === "motivation");
    candidates.forEach((popup) => {
      const { next } = getKeys(popup);
      if (!localStorage.getItem(next)) scheduleNext(popup);
    });
    let timer;
    const scan = () => {
      window.clearTimeout(timer);
      const paused = document.visibilityState !== "visible" || showProfileModal || showNewTournament || reportTarget || joinDisclaimerOpen || currentPopup;
      if (paused) return;
      const now = Date.now();
      const activeCandidates = candidates.filter((popup) => (!popup.startsAt || popup.startsAt <= now) && (!popup.endsAt || popup.endsAt >= now));
      const eligible = activeCandidates.filter((popup) => {
        if (popup.frequency === "busy" && onlinePlayerCount < Math.max(2, Number(popup.minimumOnline) || 10)) return false;
        const { next, session } = getKeys(popup);
        if (popup.frequency === "session" && sessionStorage.getItem(session)) return false;
        const nextAt = Number(localStorage.getItem(next));
        return Number.isFinite(nextAt) && nextAt <= now;
      });
      if (eligible.length) {
        const popup = eligible[Math.floor(Math.random() * eligible.length)];
        const { session } = getKeys(popup);
        if (popup.frequency === "session") sessionStorage.setItem(session, "shown");
        else scheduleNext(popup, now);
        setCurrentPopup(popup);
        return;
      }
      const upcoming = activeCandidates.map((popup) => Number(localStorage.getItem(getKeys(popup).next))).filter((at) => Number.isFinite(at) && at > now);
      timer = window.setTimeout(scan, Math.min(upcoming.length ? Math.min(...upcoming) - now : 60 * 1000, 2147483000));
    };
    const onVisibility = () => scan();
    document.addEventListener("visibilitychange", onVisibility);
    scan();
    return () => { window.clearTimeout(timer); document.removeEventListener("visibilitychange", onVisibility); };
  }, [activePopups, onlinePlayerCount, user, showProfileModal, showNewTournament, reportTarget, joinDisclaimerOpen, currentPopup, popupScanTick]);

  const skipProfile = useCallback(() => {
    if (user) localStorage.setItem(`profilePromptDismissed_${user.uid}`, "1");
    setShowProfileModal(false);
  }, [user]);

  useEffect(() => {
    ensureFonts();
    localStorage.removeItem("grindinfo-theme");
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      TOURNAMENTS_COLLECTION,
      (snap) => {
        setTournaments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsubscribe();
  }, []);

  // Sub-collections for whichever tournament is currently open
  useEffect(() => {
    if (!selectedId) {
      setSelectedTeams([]);
      setSelectedMatches([]);
      setSelectedStats([]);
      setSelectedLobby(null);
      return;
    }
    const unsubs = [
      onSnapshot(teamsCollectionRef(selectedId), (snap) =>
        setSelectedTeams(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      ),
      onSnapshot(matchesCollectionRef(selectedId), (snap) =>
        setSelectedMatches(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      ),
      onSnapshot(statsCollectionRef(selectedId), (snap) =>
        setSelectedStats(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      ),
    ];
    return () => unsubs.forEach((u) => u());
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId || !user) { setSelectedRegistrations([]); return undefined; }
    const tournament = tournaments.find((item) => item.id === selectedId);
    const canReview = tournament && (tournament.adminUserId === user.uid || tournament.coAdminUserIds?.includes(user.uid));
    const requests = registrationsCollectionRef(selectedId);
    const registrationQuery = canReview ? requests : query(requests, where("playerId", "==", user.uid));
    return onSnapshot(registrationQuery, (snapshot) => {
      setSelectedRegistrations(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
    }, () => setSelectedRegistrations([]));
  }, [selectedId, user, tournaments]);

  useEffect(() => {
    if (!selectedId || !user) { setSelectedLobby(null); return undefined; }
    return onSnapshot(lobbyCredentialsRef(selectedId), (snapshot) => {
      setSelectedLobby(snapshot.exists() ? snapshot.data() : null);
    }, () => setSelectedLobby(null));
  }, [selectedId, user]);

  const showToast = useCallback((msg) => {
    setToast(msg);
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(""), 2200);
  }, []);
  const notifyFriendOnline = useCallback((name) => showToast(`${name} is online`), [showToast]);
  useEffect(() => {
    if (!user) { setMutedFriendIds([]); return; }
    try { setMutedFriendIds(JSON.parse(localStorage.getItem(`grindinfo-muted-chats:${user.uid}`) || "[]")); }
    catch { setMutedFriendIds([]); }
  }, [user]);
  const mutedFriendSet = useMemo(() => new Set(mutedFriendIds), [mutedFriendIds]);
  const toggleMuteFriend = useCallback((friendUid) => {
    if (!friendUid) return;
    setMutedFriendIds((current) => {
      const next = current.includes(friendUid) ? current.filter((id) => id !== friendUid) : [...current, friendUid];
      if (user) localStorage.setItem(`grindinfo-muted-chats:${user.uid}`, JSON.stringify(next));
      return next;
    });
  }, [user]);

  const saveProfile = useCallback(
    async (fields) => {
      if (!user) return;
      const displayName = playerNameFromInput(fields.displayName) || safeProfileName(fields.displayName, user.displayName);
      const profileBody = {
        ...fields,
        displayName,
        lookingFor: normalizeLookingFor(fields.lookingFor),
        rank: normalizeRank(fields.rank),
        bio: String(fields.bio || "").slice(0, 200),
        discoverable: fields.discoverable === true,
        updatedAt: Date.now(),
      };
      try {
        if (!myProfile?.playerTag) {
          await setDoc(playerDocRef(user.uid), profileBody, { merge: true });
        }
        const claimed = await claimUniqueHandle(user, displayName, myProfile?.playerTag || "");
        await setDoc(playerDocRef(user.uid), { ...profileBody, playerTag: claimed.tag, handle: claimed.handle }, { merge: true });
        if (myProfile?.handle && myProfile.handle !== claimed.handle) {
          try { await deleteDoc(handleDocRef(myProfile.handle)); } catch { /* previous ID mapping can stay until overwritten */ }
        }
        try { await updateProfile(user, { displayName: grindHandle(displayName, claimed.tag) }); } catch { /* Auth display name stays as the player name if this fails */ }
        showToast(`Profile saved · ${grindHandle(displayName, claimed.tag)}`);
      } catch (e) {
        showToast(e?.message || "Couldn't save profile — try again");
        return;
      }
      setShowProfileModal(false);
    },
    [user, myProfile, showToast]
  );

  // ---- mutations (now writing to the tournaments collection + sub-collections) ----
  const addTournament = async (t) => {
    if (!user) return;
    if (myAccess?.restricted) { showToast("This account is restricted from hosting tournaments."); return; }
    setSaving(true);
    try {
      const { roomId, roomPassword, ...event } = t;
      const created = await addDoc(TOURNAMENTS_COLLECTION, {
        ...event,
        prizeAmount: Number(event.prizeAmount) || 0,
        prizeCurrency: event.prizeCurrency || "INR",
        registrationOpen: true,
        adminUserId: user.uid,
        adminDisplayName: grindHandle(safeProfileName(myProfile?.displayName, user.displayName), myProfile?.playerTag),
        coAdminUserIds: [],
        coAdminPlayerTags: {},
        status: event.status || "upcoming",
        kind: event.kind || (event.format === "Custom room" ? "custom_room" : "bracket"),
        joinMode: event.joinMode === "open" ? "open" : "request",
        maxSlots: Math.max(0, Math.min(256, Math.trunc(Number(event.maxSlots) || 0))),
        blurb: String(event.blurb || "").slice(0, 400),
        posterUrl: String(event.posterUrl || "").slice(0, 500),
        isLegacyImport: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      const nextRoom = String(roomId || "").trim();
      const nextPassword = String(roomPassword || "").trim();
      if (nextRoom && nextPassword) {
        await setDoc(lobbyCredentialsRef(created.id), { roomId: nextRoom.slice(0, 40), roomPassword: nextPassword.slice(0, 40), updatedAt: Date.now() });
      }
      showToast("Tournament created");
      setShowNewTournament(false);
    } catch (e) {
      showToast(e?.message || "Couldn't create tournament — try again");
    } finally {
      setSaving(false);
    }
  };

  const saveTournamentResults = async (id, results) => {
    setSaving(true);
    try {
      await updateDoc(tournamentDocRef(id), {
        results, status: "completed", registrationOpen: false, archived: true,
        archivedAt: Date.now(), updatedAt: Date.now(),
      });
      showToast("Tournament results posted");
    } catch (e) {
      showToast("Couldn't post tournament results — try again");
    } finally {
      setSaving(false);
    }
  };

  const deleteTournament = async (id) => {
    setSaving(true);
    try {
      await Promise.all([
        ...selectedTeams.map((t) => deleteDoc(doc(teamsCollectionRef(id), t.id))),
        ...selectedMatches.map((m) => deleteDoc(doc(matchesCollectionRef(id), m.id))),
        ...selectedStats.map((s) => deleteDoc(doc(statsCollectionRef(id), s.id))),
        ...selectedRegistrations.map((request) => deleteDoc(doc(registrationsCollectionRef(id), request.id))),
      ]);
      await deleteDoc(tournamentDocRef(id));
      showToast("Tournament deleted");
      navigate("/tournaments");
    } catch (e) {
      showToast("Couldn't delete tournament — try again");
    } finally {
      setSaving(false);
    }
  };

  const addTeam = async (tournamentId, team) => {
    try {
      await addDoc(teamsCollectionRef(tournamentId), team);
      showToast("Team added");
    } catch (e) {
      showToast("Couldn't add team — try again");
    }
  };

  const deleteTeam = async (tournamentId, teamId) => {
    try {
      await deleteDoc(doc(teamsCollectionRef(tournamentId), teamId));
      showToast("Team removed");
    } catch (e) {
      showToast("Couldn't remove team — try again");
    }
  };

  const addMatch = async (tournamentId, match) => {
    try {
      await addDoc(matchesCollectionRef(tournamentId), match);
      showToast("Match added");
    } catch (e) {
      showToast("Couldn't add match — try again");
    }
  };

  const updateMatch = async (tournamentId, matchId, patch) => {
    try {
      await updateDoc(doc(matchesCollectionRef(tournamentId), matchId), patch);
    } catch (e) {
      showToast("Couldn't update match — try again");
    }
  };

  const deleteMatch = async (tournamentId, matchId) => {
    try {
      const relatedStats = selectedStats.filter((s) => s.matchId === matchId);
      await Promise.all(relatedStats.map((s) => deleteDoc(doc(statsCollectionRef(tournamentId), s.id))));
      await deleteDoc(doc(matchesCollectionRef(tournamentId), matchId));
      showToast("Match deleted");
    } catch (e) {
      showToast("Couldn't delete match — try again");
    }
  };

  const addStat = async (tournamentId, stat) => {
    try {
      await addDoc(statsCollectionRef(tournamentId), stat);
      showToast("Stat line added");
    } catch (e) {
      showToast("Couldn't add stat — try again");
    }
  };

  const deleteStat = async (tournamentId, statId) => {
    try {
      await deleteDoc(doc(statsCollectionRef(tournamentId), statId));
    } catch (e) {
      showToast("Couldn't delete stat — try again");
    }
  };

  const requestRegistration = async (tournamentId, player) => {
    if (!user) return;
    const event = tournaments.find((item) => item.id === tournamentId);
    if (isTournamentFull(event, selectedRegistrations)) {
      showToast("This tournament is full.");
      return;
    }
    const openJoin = event?.joinMode === "open";
    try {
      await setDoc(doc(registrationsCollectionRef(tournamentId), user.uid), {
        playerId: user.uid, displayName: safeProfileName(player.displayName),
        status: openJoin ? "approved" : "pending", requestedAt: Date.now(),
      });
      showToast(openJoin ? "You're in. Room details appear if the host posted them." : "Join request sent to the tournament host");
    } catch (e) {
      showToast(e?.code === "permission-denied"
        ? "Firebase blocked the join request. The Firestore rules may need to be published."
        : "Couldn't send the join request. Check whether one is already pending.");
    }
  };

  const decideRegistration = async (tournamentId, requestId, status) => {
    const event = tournaments.find((item) => item.id === tournamentId);
    if (status === "approved" && isTournamentFull(event, selectedRegistrations)) {
      showToast("This tournament is full.");
      return;
    }
    try {
      await updateDoc(doc(registrationsCollectionRef(tournamentId), requestId), { status, reviewedAt: Date.now(), reviewedBy: user.uid });
      showToast(status === "approved" ? "Player approved" : "Request declined");
    } catch (e) {
      showToast(e?.code === "permission-denied"
        ? "Firebase blocked this decision. The Firestore rules may need to be published."
        : "Couldn't update the registration request.");
    }
  };

  const closeTournament = async (tournamentId) => {
    try { await updateDoc(tournamentDocRef(tournamentId), { registrationOpen: false, status: "closed", archived: true, archivedAt: Date.now(), updatedAt: Date.now() }); showToast("Tournament closed and moved to archive"); }
    catch (e) { showToast("Couldn\u2019t close tournament. Check Firestore rules."); }
  };

  const updateTournamentSettings = async (tournamentId, patch) => {
    try {
      const next = { ...patch, updatedAt: Date.now() };
      if (next.maxSlots != null) next.maxSlots = Math.max(0, Math.min(256, Math.trunc(Number(next.maxSlots) || 0)));
      await updateDoc(tournamentDocRef(tournamentId), next);
      showToast("Tournament settings saved");
    } catch (e) {
      showToast("Couldn't update tournament settings. Check Firestore rules.");
    }
  };

  const submitBlogPost = async (post) => {
    try { await addDoc(BLOG_POSTS_COLLECTION, { ...post, eventScope: post.eventScope || "random", authorId: user.uid, authorName: safeProfileName(myProfile?.displayName, user.displayName), status: "pending", createdAt: Date.now() }); showToast("Blog request sent for review"); }
    catch (e) { showToast("Couldn\u2019t submit blog request. Firestore rules may need to be published."); }
  };

  const appendStaffAction = (batch, action, targetType, targetId, summary) => {
    if (!user || (!isSiteStaff && !isModerator)) return;
    batch.set(doc(STAFF_ACTIONS_COLLECTION), {
      action: String(action).slice(0, 40),
      targetType: String(targetType).slice(0, 40),
      targetId: String(targetId).slice(0, 128),
      targetLabel: String(summary).slice(0, 120),
      actorUid: user.uid,
      actorName: safeProfileName(myProfile?.displayName, user.displayName),
      summary: String(summary).slice(0, 240),
      createdAt: Date.now(),
    });
  };

  const reviewBlogPost = async (postId, status) => {
    try { const batch = writeBatch(db); batch.update(doc(BLOG_POSTS_COLLECTION, postId), { status, reviewedAt: Date.now(), reviewedBy: user.uid }); appendStaffAction(batch, status === "published" ? "blog_published" : "blog_declined", "blog", postId, `Blog ${status === "published" ? "published" : "declined"}: ${postId}`); await batch.commit(); showToast(status === "published" ? "Blog post published" : "Blog request declined"); }
    catch (e) { showToast("Couldn\u2019t update blog request"); }
  };

  const editBlogPost = async (post, fields) => {
    if (!user || (post.authorId !== user.uid && !isSiteStaff && !isModerator)) throw new Error("You cannot edit this post");
    const batch = writeBatch(db);
    batch.update(doc(BLOG_POSTS_COLLECTION, post.id), { ...fields, status: "pending", reviewedAt: 0, reviewedBy: "", updatedAt: Date.now() });
    appendStaffAction(batch, "blog_edited", "blog", post.id, `Blog returned for review: ${post.title}`);
    await batch.commit();
    showToast("Changes saved and sent for review");
  };

  const deleteBlogPost = async (post) => {
    if (!user || (post.authorId !== user.uid && !isSiteStaff && !isModerator)) throw new Error("You cannot delete this post");
    const batch = writeBatch(db);
    batch.delete(doc(BLOG_POSTS_COLLECTION, post.id));
    appendStaffAction(batch, "blog_deleted", "blog", post.id, `Blog deleted: ${post.title}`);
    await batch.commit();
    showToast("Blog post deleted");
  };

  const updateCoAdmins = async (tournamentId, ids, tags) => {
    try { await updateDoc(tournamentDocRef(tournamentId), { coAdminUserIds: ids, coAdminPlayerTags: tags || selected?.coAdminPlayerTags || {}, updatedAt: Date.now() }); showToast("Co-host access updated"); }
    catch (e) { showToast("Couldn't update co-host access"); }
  };

  const saveTournamentLobby = async (tournamentId, credentials) => {
    await setDoc(lobbyCredentialsRef(tournamentId), {
      roomId: String(credentials.roomId || "").trim().slice(0, 40),
      roomPassword: String(credentials.roomPassword || "").trim().slice(0, 40),
      updatedAt: Date.now(),
    });
    showToast("Room details shared with approved players");
  };

  const addCoAdminByPlayerTag = async (tournament, input) => {
    const playerTag = extractPlayerTag(input);
    if (!PLAYER_TAG_PATTERN.test(playerTag)) throw new Error("Enter the 4-digit code from the player's GrindInfo ID.");
    const results = await getDocs(query(PLAYERS_COLLECTION, where("playerTag", "==", playerTag), where("discoverable", "==", true)));
    const target = results.docs[0];
    if (!target) throw new Error("No visible player has that GrindInfo ID. Ask them to enable player discovery.");
    if (target.id === user.uid) throw new Error("You are already the tournament host.");
    const ids = tournament.coAdminUserIds || [];
    if (ids.includes(target.id)) throw new Error("That player is already a co-host.");
    const tags = { ...(tournament.coAdminPlayerTags || {}), [target.id]: playerTag };
    await updateDoc(tournamentDocRef(tournament.id), { coAdminUserIds: [...ids, target.id], coAdminPlayerTags: tags, updatedAt: Date.now() });
    showToast(`Co-host #${playerTag} added`);
  };

  const inviteFriendToTournament = async (tournament, friend) => {
    if (!user || !friend?.uid || !tournament?.id) return;
    const inviteRef = doc(TOURNAMENT_INVITES_COLLECTION, `${tournament.id}_${friend.uid}`);
    try {
      await setDoc(inviteRef, {
        tournamentId: tournament.id,
        tournamentName: String(tournament.name || "Tournament").slice(0, 120),
        game: String(tournament.game || "").slice(0, 60),
        invitedBy: user.uid,
        inviterName: safeProfileName(myProfile?.displayName, user.displayName),
        inviteeUid: friend.uid,
        inviteeName: safeProfileName(friend.name),
        status: "pending",
        createdAt: Date.now(),
      });
      showToast(`Invitation sent to ${safeProfileName(friend.name)}`);
    } catch (error) {
      showToast(error?.code === "permission-denied" ? "Invite blocked. Confirm the latest Firestore rules are published and you are friends." : "An invite is already waiting or could not be sent.");
    }
  };

  const decideTournamentInvite = async (inviteId, status) => {
    try {
      await updateDoc(doc(TOURNAMENT_INVITES_COLLECTION, inviteId), { status, respondedAt: Date.now() });
      showToast(status === "accepted" ? "Invite accepted. Open the tournament and send your join request." : "Invite declined");
    } catch { showToast("Couldn't update the tournament invite. Check that the Firestore rules are published."); }
  };

  const shareTournament = async (tournament) => {
    const url = `${window.location.origin}/tournaments/${tournament.id}`;
    try { await navigator.clipboard.writeText(url); showToast("Tournament link copied"); }
    catch (e) { window.prompt("Copy this tournament link", url); }
  };

  const requestFriend = async (recipientId, recipientName = "Player") => {
    if (!user || !recipientId || recipientId === user.uid) return;
    if (myAccess?.restricted) { showToast("This account is restricted from sending friend requests."); return; }
    try {
      await setDoc(doc(FRIEND_REQUESTS_COLLECTION, `${user.uid}_${recipientId}`), {
        requesterId: user.uid,
        requesterName: safeProfileName(myProfile?.displayName, user.displayName),
        recipientId,
        recipientName: safeProfileName(recipientName),
        status: "pending",
        createdAt: Date.now(),
      });
      showToast("Friend request sent");
    } catch (e) {
      showToast(e?.code === "permission-denied"
        ? "Firebase blocked the friend request. The Firestore rules may need to be published."
        : "Couldn't send the friend request. A request may already exist.");
    }
  };

  const requestHostFriend = async (tournament) => {
    await requestFriend(tournament.adminUserId, tournament.adminDisplayName || "Tournament host");
  };

  const setPlayerAccess = async (report, mode) => {
    if (siteRole !== "owner" || report?.targetType !== "player") return;
    const prompts = {
      ban: `Ban ${report.targetName || "this player"} and disable their GrindInfo account? The report will be archived. You can remove the ban later.`,
      restrict: `Restrict ${report.targetName || "this player"} from hosting tournaments, player discovery, and new friend requests? The report will be archived. They can still sign in.`,
      clear: `Restore full GrindInfo access for ${report.targetName || "this player"}?`,
    };
    if (!window.confirm(prompts[mode] || prompts.clear)) return;
    try {
      await httpsCallable(getFunctions(), "setPlayerBan")({
        targetUid: report.targetId,
        active: mode === "ban",
        mode,
        reportId: report.id,
        note: `${report.reason}${report.details ? `: ${report.details}` : ""}`.slice(0, 500),
      });
      await updateReportStatus(report.id, "archived");
      showToast(mode === "ban" ? "Player banned and report archived" : mode === "restrict" ? "Player restricted and report archived" : "Player access restored");
    } catch (error) {
      showToast(error?.code === "functions/permission-denied"
        ? "Only the site owner can ban or restrict players."
        : "Could not change player access. The Firebase ban function must be deployed.");
    }
  };

  const decideFriendRequest = async (requestId, status) => {
    try {
      await updateDoc(doc(FRIEND_REQUESTS_COLLECTION, requestId), { status, reviewedAt: Date.now() });
      showToast(status === "accepted" ? "Friend request accepted" : "Friend request declined");
    } catch (e) {
      showToast(e?.code === "permission-denied"
        ? "Firebase blocked this decision. The Firestore rules may need to be published."
        : "Couldn't update the friend request.");
    }
  };

  const removeFriend = async (friend) => {
    if (!user || !window.confirm(`Remove ${friend.name} from your friends?`)) return;
    const relation = friendRequests.find((item) => item.status === "accepted" && [item.requesterId, item.recipientId].includes(user.uid) && [item.requesterId, item.recipientId].includes(friend.uid));
    if (!relation) return;
    try { await updateDoc(doc(FRIEND_REQUESTS_COLLECTION, relation.id), { status: "removed", reviewedAt: Date.now() }); showToast(`${friend.name} removed from friends`); }
    catch { showToast("Couldn't remove this friend. Check that the latest Firestore rules are published."); }
  };

  const blockFriend = async (friend) => {
    if (!user || !friend?.uid || !window.confirm(`Block ${friend.name}? They will be removed from your friends, and friend requests, chat messages, and tournament invites between you will be stopped. Existing chat history is kept private.`)) return;
    const relation = friendRequests.find((item) => item.status === "accepted" && [item.requesterId, item.recipientId].includes(user.uid) && [item.requesterId, item.recipientId].includes(friend.uid));
    const batch = writeBatch(db);
    batch.set(doc(db, "userBlocks", `${user.uid}_${friend.uid}`), { blockerUid: user.uid, blockedUid: friend.uid, blockedName: String(friend.name || "Player").slice(0, 40), createdAt: Date.now() });
    if (relation) batch.update(doc(FRIEND_REQUESTS_COLLECTION, relation.id), { status: "removed", reviewedAt: Date.now() });
    try { await batch.commit(); setActiveChatFriend((active) => active?.uid === friend.uid ? null : active); showToast(`${friend.name} blocked`); }
    catch { showToast("Couldn't block this player. Check that the latest Firestore rules are published."); }
  };

  const unblockFriend = async (block) => {
    if (!user || block?.blockerUid !== user.uid) return;
    try { await deleteDoc(doc(db, "userBlocks", block.id)); showToast(`${block.blockedName || "Player"} unblocked`); }
    catch { showToast("Couldn't unblock this player."); }
  };

  const submitReport = async ({ reason, details }) => {
    if (!reportTarget || !user) return "Sign in again to submit this report.";
    const reportId = `${user.uid}_${reportTarget.type}_${reportTarget.id}`;
    try {
      await setDoc(doc(REPORTS_COLLECTION, reportId), {
        reporterId: user.uid, targetType: reportTarget.type, targetId: reportTarget.id,
        targetName: String(reportTarget.name || "").slice(0, 120), reason,
        details: String(details || "").slice(0, 1000), status: "submitted", createdAt: Date.now(),
      });
      setReportTarget(null); showToast("Report sent privately to GrindInfo's safety team"); return "";
    } catch (e) { return "This report could not be sent. You may already have reported this item."; }
  };

  const importArchiveEntries = async (records) => {
    const batch = writeBatch(db);
    records.forEach((entry) => batch.set(doc(ARCHIVE_COLLECTION), { ...entry, createdAt: Date.now(), createdBy: user.uid }));
    appendStaffAction(batch, "archive_imported", "archive", "csv-import", `Imported ${records.length} Vault record(s)`);
    await batch.commit();
    const merged = new Map();
    records.filter((entry) => entry.eventScope === "ewc" || entry.eventScope === "region").forEach((entry) => {
      const current = merged.get(normalizeGameKey(entry.game)) || findGameVault(circuitCms.records, entry.game);
      merged.set(normalizeGameKey(entry.game), applyEventToVault(current, entry));
    });
    for (const next of merged.values()) await circuitCms.upsert(next);
  };

  const submitArchiveRequest = async (fields) => {
    const clean = {
      tournament: String(fields.tournament || "").trim().slice(0, 120),
      game: String(fields.game || "").trim().slice(0, 60),
      eventDate: String(fields.eventDate || "").trim().slice(0, 40),
      winner: String(fields.winner || "").trim().slice(0, 100),
      runnerUp: String(fields.runnerUp || "").trim().slice(0, 100),
      mvp: String(fields.mvp || "").trim().slice(0, 100),
      source: String(fields.source || "").trim().slice(0, 500),
      eventScope: ["ewc", "region", "random"].includes(fields.eventScope) ? fields.eventScope : "random",
    };
    if (clean.source && !/^https:\/\//i.test(clean.source)) throw new Error("Use a secure https source link.");
    await addDoc(ARCHIVE_SUBMISSIONS_COLLECTION, { ...clean, submitterId: user.uid, submitterName: safeProfileName(myProfile?.displayName, user.displayName), status: "pending", createdAt: Date.now() });
    showToast("Vault request sent for review");
  };

  const decideArchiveSubmission = async (requestId, status) => {
    if (!isSiteStaff || !["approved", "rejected"].includes(status)) return;
    try {
      const submission = archiveSubmissions.find((item) => item.id === requestId);
      if (!submission || submission.status !== "pending") { showToast("This Vault request was already reviewed"); return; }
      const batch = writeBatch(db);
      const requestRef = doc(ARCHIVE_SUBMISSIONS_COLLECTION, requestId);
      if (status === "approved") {
        const entryRef = doc(ARCHIVE_COLLECTION);
        batch.set(entryRef, { tournament: submission.tournament, game: submission.game, eventDate: submission.eventDate, winner: submission.winner, runnerUp: submission.runnerUp || "", mvp: submission.mvp || "", source: submission.source || "", eventScope: submission.eventScope || "random", createdAt: Date.now(), createdBy: user.uid, submissionId: requestId });
        batch.update(requestRef, { status, reviewedAt: Date.now(), reviewedBy: user.uid, archiveEntryId: entryRef.id });
        appendStaffAction(batch, "archive_request_approved", "archiveSubmission", requestId, `Vault request approved: ${submission.tournament}`);
      } else {
        batch.update(requestRef, { status, reviewedAt: Date.now(), reviewedBy: user.uid });
        appendStaffAction(batch, "archive_request_rejected", "archiveSubmission", requestId, `Vault request declined: ${submission.tournament}`);
      }
      await batch.commit();
      if (status === "approved" && (submission.eventScope === "ewc" || submission.eventScope === "region")) {
        const next = applyEventToVault(findGameVault(circuitCms.records, submission.game), submission);
        await circuitCms.upsert(next);
      }
      showToast(status === "approved" ? "Event added to The Vault" : "Vault request declined");
    } catch (error) {
      console.error("Could not review archive submission", error);
      showToast("Couldn't review this Vault request. Check the published Firebase rules and try again.");
    }
  };

  const promoteBlogToArchive = async (post, fields) => {
    if (!isSiteStaff || post.status !== "published") throw new Error("Only staff can promote published posts");
    const source = String(fields.source || "").trim().slice(0, 500);
    if (source && !/^https:\/\//i.test(source)) throw new Error("Use a secure https source link.");
    const eventScope = ["ewc", "region", "random"].includes(fields.eventScope) ? fields.eventScope : inferEventScope(`${post.title} ${post.game}`);
    const batch = writeBatch(db);
    const archiveRef = doc(ARCHIVE_COLLECTION);
    batch.set(archiveRef, {
      tournament: String(post.title || "").trim().slice(0, 120),
      game: String(post.game || "").trim().slice(0, 60),
      eventDate: String(fields.eventDate || "").trim().slice(0, 40),
      winner: String(fields.winner || "").trim().slice(0, 100),
      runnerUp: String(fields.runnerUp || "").trim().slice(0, 100),
      mvp: String(fields.mvp || "").trim().slice(0, 100),
      source, eventScope, createdAt: Date.now(), createdBy: user.uid, blogPostId: post.id,
    });
    appendStaffAction(batch, "blog_added_to_archive", "archiveEntry", archiveRef.id, `Blog added to The Vault: ${post.title}`);
    await batch.commit();
    if (eventScope === "ewc" || eventScope === "region") {
      const next = applyEventToVault(findGameVault(circuitCms.records, post.game), {
        game: post.game,
        tournament: post.title,
        eventDate: fields.eventDate,
        winner: fields.winner,
        runnerUp: fields.runnerUp,
        mvp: fields.mvp,
        eventScope,
        blogPostId: post.id,
        content: post.content,
      });
      await circuitCms.upsert(next);
    }
    showToast(eventScope === "ewc" ? "Merged into that game vault and the EWC list" : "Structured event added to The Vault");
  };

  const updateReportStatus = async (reportId, status) => {
    const writeStatus = async (next) => {
      const batch = writeBatch(db);
      batch.update(doc(REPORTS_COLLECTION, reportId), { status: next, reviewedAt: Date.now() });
      appendStaffAction(batch, "report_reviewed", "report", reportId, `Safety report marked ${next === "archived" ? "archived" : next}`);
      await batch.commit();
    };
    try {
      await writeStatus(status);
    } catch (e) {
      if (status === "archived") {
        try { await writeStatus("closed"); return; } catch { /* fall through */ }
      }
      showToast("Couldn't update report status");
    }
  };

  const saveSitePopup = async (popupId, fields) => {
    if (siteRole !== "owner") throw new Error("Owner access required");
    const ref = popupId ? doc(SITE_POPUPS_COLLECTION, popupId) : doc(SITE_POPUPS_COLLECTION);
    const batch = writeBatch(db);
    if (popupId) batch.update(ref, fields);
    else batch.set(ref, { ...fields, createdAt: Date.now() });
    appendStaffAction(batch, "popup_saved", "popup", popupId || ref.id, `${popupId ? "Popup updated" : "Popup created"}: ${fields.title}`);
    await batch.commit();
    showToast("Popup saved");
  };

  const deleteSitePopup = async (popupId) => {
    if (siteRole !== "owner") return;
    try { const batch = writeBatch(db); batch.delete(doc(SITE_POPUPS_COLLECTION, popupId)); appendStaffAction(batch, "popup_deleted", "popup", popupId, `Popup deleted: ${popupId}`); await batch.commit(); showToast("Popup deleted"); }
    catch { showToast("Couldn't delete popup"); }
  };

  const setSupportAccess = async (targetUid, enabled) => {
    if (siteRole !== "owner" || targetUid === user?.uid) throw new Error("Owner access required");
    const ref = doc(SITE_ROLES_COLLECTION, targetUid);
    const batch = writeBatch(db);
    if (enabled) batch.set(ref, { role: "support", enabled: true, updatedAt: Date.now() });
    else batch.update(ref, { enabled: false, updatedAt: Date.now() });
    appendStaffAction(batch, enabled ? "support_granted" : "support_revoked", "support", targetUid, `${enabled ? "Support access granted" : "Support access removed"} for ${targetUid}`);
    await batch.commit();
    showToast(enabled ? "Support access granted" : "Support access removed");
  };

  const dismissSitePopup = () => {
    if (!currentPopup) return;
    setCurrentPopup(null);
    setPopupScanTick((tick) => tick + 1);
  };

  const selected = tournaments.find((t) => t.id === selectedId) || null;
  const isOwner = !!(selected && user && selected.adminUserId === user.uid);
  const isAdmin = !!(selected && user && (isOwner || selected.coAdminUserIds?.includes(user.uid)));
  const isSiteStaff = siteRole === "owner" || siteRole === "support";
  const dashboardRole = isSiteStaff ? siteRole : null;

  useEffect(() => {
    const legacyId = new URLSearchParams(windowLocation.search || location.search).get("tournament");
    if (legacyId && !routePath.startsWith("/tournaments/")) {
      navigate(`/tournaments/${legacyId}`, { replace: true });
    }
  }, [windowLocation.search, location.search, routePath, navigate]);

  useEffect(() => {
    const tournamentMatch = routePath.match(/^\/tournaments\/([^/]+)/);
    if (tournamentMatch) {
      setSelectedId(tournamentMatch[1]);
      setView("detail");
      return;
    }
    if (routePath === "/tournaments") {
      setSelectedId(null);
      setView("list");
    }
  }, [routePath]);

  useEffect(() => {
    if (authLoading || !routePath.startsWith("/admin")) return;
    if (!user || (siteRoleResolved && !isSiteStaff)) navigate("/", { replace: true });
  }, [authLoading, isSiteStaff, routePath, navigate, siteRoleResolved, user]);

  useEffect(() => {
    const tab = new URLSearchParams(location.search).get("tab");
    if (tab) setDashTabHint(tab);
  }, [location.search]);

  const vaultEditId = routePath.match(/^\/admin\/portal\/vault\/([^/]+)/)?.[1];
  const needsAuthChoice = !user && !guestMode;

  if (authLoading) {
    return (
      <div style={shellStyle} data-theme="solar-flare">
        <div style={{ color: "var(--text-muted)", fontFamily: "'Inter', sans-serif", padding: 40, textAlign: "center" }}>
          <LoadingScreen label="Loading GrindInfo" />
        </div>
      </div>
    );
  }

  return (
    <div style={shellStyle} data-theme="solar-flare">
      <style>{THEME_CSS}</style>
      <style>{`
        * { box-sizing: border-box; }
        ::selection { background: var(--accent); color: var(--accent-contrast); }
        button:active { transform: scale(0.98); }
        @media (prefers-reduced-motion: reduce) {
          * { transition: none !important; animation: none !important; }
        }
        .sl-card { animation: sl-fade 260ms ease both; }
        @keyframes sl-fade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
      `}</style>

        {!needsAuthChoice && routePath.startsWith("/admin") && (
          user && !siteRoleResolved ? (
            <div className="px-5 py-16 text-center text-stone-400"><LoadingScreen label="Opening staff portal" /></div>
          ) : dashboardRole ? (
            <div>
              <header className="border-b border-white/10">
                <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
                  <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-amber-300">Staff portal</span>
                  <Link to="/" className="font-mono text-xs uppercase tracking-wider text-stone-400 hover:text-white">Leave portal</Link>
                </div>
              </header>
              <div className="mx-auto max-w-6xl px-5 pb-24">
                {vaultEditId ? (
                  <VaultResearchDesk
                    focusId={decodeURIComponent(vaultEditId)}
                    records={circuitCms.records}
                    role={siteRole || "support"}
                    onSave={circuitCms.upsert}
                    onDelete={circuitCms.remove}
                    filterGames={circuitCms.filterGames}
                  />
                ) : (
                <OwnerDashboard
                  key={dashTabHint}
                  initialTab={dashTabHint}
                  circuitRecords={circuitCms.records}
                  onSaveCircuit={circuitCms.upsert}
                  onDeleteCircuit={circuitCms.remove}
                  role={siteRole || "support"}
                  reports={privateReports}
                  onStatusChange={updateReportStatus}
                  bans={siteBans}
                  onSetPlayerAccess={setPlayerAccess}
                  popups={adminPopups}
                  onSavePopup={saveSitePopup}
                  onDeletePopup={deleteSitePopup}
                  staff={siteStaff}
                  onSetSupport={setSupportAccess}
                  tournaments={tournaments}
                  archiveEntries={archiveEntries}
                  blogPosts={blogPosts}
                  onBlogReview={reviewBlogPost}
                  onPromoteBlog={promoteBlogToArchive}
                  archiveSubmissions={archiveSubmissions}
                  onArchiveDecision={decideArchiveSubmission}
                  auditLog={auditLog}
                  onOpenTournament={(id) => navigate(`/tournaments/${id}`)}
                  onImportArchive={importArchiveEntries}
                  filterGames={circuitCms.filterGames}
                />
                )}
              </div>
            </div>
          ) : <Navigate to="/" replace />
        )}

        {!needsAuthChoice && !routePath.startsWith("/admin") && (
          <>
            <Header
              saving={saving}
              user={user}
              guestMode={guestMode}
              onSignInClick={() => { setKnownAccounts(readKnownAccounts()); setAuthDialogOpen((open) => !open); }}
              onSignOut={handleSignOut}
              onSwitchAccount={handleSwitchAccount}
              onEditProfile={() => setShowProfileModal(true)}
              dashboardRole={dashboardRole}
              playerTag={myProfile?.playerTag}
              friendsPanel={user ? (
                <FriendDock
                  placement="header"
                  requests={friendRequests}
                  currentUserId={user.uid}
                  onOpenChat={(friend) => { setActiveChatFriend(friend); }}
                  onOpenRequests={() => setShowFriendRequests(true)}
                  presenceDb={realtimeDb}
                  onFriendOnline={notifyFriendOnline}
                  blockedUsers={blockedUsers}
                  onRemoveFriend={removeFriend}
                  onBlockFriend={blockFriend}
                  onUnblockFriend={unblockFriend}
                  mutedIds={mutedFriendSet}
                  onToggleMute={toggleMuteFriend}
                  onFriendRequest={(player) => requestFriend(player.uid, player.displayName)}
                />
              ) : null}
            />
            <PublicNav pathname={routePath} />
            <div className={`mx-auto px-5 pb-24 ${routePath === "/" || routePath.startsWith("/vault") ? "max-w-6xl" : "max-w-5xl"}`}>
              <Routes location={windowLocation}>
                <Route path="/" element={(
                  <PlatformHome slides={homeSlides}>
                    <HubSections />
                  </PlatformHome>
                )} />
                <Route path="/vault" element={<VaultLibraryPage slides={vaultSlides} />} />
                <Route path="/vault/ewc" element={<EwcDirectoryPage slides={vaultSlides} liveEntries={archiveEntries} />} />
                <Route path="/vault/:slug" element={<VaultDetailPage slides={vaultSlides} slug={routePath.replace(/^\/vault\//, "").split("/")[0]} liveEntries={archiveEntries} />} />
                <Route path="/tournaments" element={(
                  <>
                    <TournamentOpsRail
                      signedIn={!!user}
                      onNew={() => {
                        if (!user) { setAuthDialogOpen(true); return; }
                        if (myAccess?.restricted) { showToast("This account is restricted from hosting tournaments."); return; }
                        setShowNewTournament(true);
                      }}
                      onSignIn={() => setAuthDialogOpen(true)}
                      onShowActive={() => setShowArchivedTournaments(false)}
                      onShowArchive={() => setShowArchivedTournaments(true)}
                      showingArchive={showArchivedTournaments}
                    />
                    <TournamentList
                      hideCreate
                      archivedView={showArchivedTournaments}
                      onArchivedView={setShowArchivedTournaments}
                      tournaments={tournaments}
                      currentUserId={user?.uid || null}
                      currentUserName={grindHandle(safeProfileName(myProfile?.displayName, user?.displayName), myProfile?.playerTag)}
                      pendingInvites={user ? tournamentInvites.filter((item) => item.inviteeUid === user.uid && item.status === "pending") : []}
                      onInviteDecision={decideTournamentInvite}
                      onOpen={(id) => navigate(`/tournaments/${id}`)}
                      onNew={() => {
                        if (!user) { setAuthDialogOpen(true); return; }
                        if (myAccess?.restricted) { showToast("This account is restricted from hosting tournaments."); return; }
                        setShowNewTournament(true);
                      }}
                      onSignIn={() => setAuthDialogOpen(true)}
                    />
                  </>
                )} />
                <Route path="/tournaments/:id" element={selected ? (
                  <TournamentDetail
                    tournament={selected}
                    teams={selectedTeams}
                    matches={selectedMatches}
                    stats={selectedStats}
                    isAdmin={isAdmin}
                    isOwner={isOwner}
                    currentUserId={user?.uid || null}
                    currentUserName={grindHandle(safeProfileName(myProfile?.displayName, user?.displayName), myProfile?.playerTag)}
                    registrations={selectedRegistrations}
                    lobby={selectedLobby}
                    onSaveLobby={(credentials) => saveTournamentLobby(selected.id, credentials)}
                    friends={acceptedFriends}
                    tournamentInvites={tournamentInvites}
                    onInviteFriend={inviteFriendToTournament}
                    onAddCoAdmin={addCoAdminByPlayerTag}
                    registrationDisclaimer={[...activePopups].filter((popup) => popup.type === "disclaimer" && popup.enabled === true && (!popup.startsAt || popup.startsAt <= Date.now()) && (!popup.endsAt || popup.endsAt >= Date.now())).sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0))[0]}
                    onJoinDisclaimerVisibilityChange={setJoinDisclaimerOpen}
                    onSaveResults={(results) => saveTournamentResults(selected.id, results)}
                    onCloseTournament={() => closeTournament(selected.id)}
                    onUpdateSettings={(patch) => updateTournamentSettings(selected.id, patch)}
                    onBack={() => navigate("/tournaments")}
                    onShare={() => shareTournament(selected)}
                    onRequestFriend={() => requestHostFriend(selected)}
                    onRequestRegistration={(player) => requestRegistration(selected.id, player)}
                    onSignIn={() => setAuthDialogOpen(true)}
                    onRegistrationDecision={(requestId, status) => decideRegistration(selected.id, requestId, status)}
                    onCoAdminsChange={(ids, tags) => updateCoAdmins(selected.id, ids, tags)}
                    onReport={() => setReportTarget({ type: "tournament", id: selected.id, name: selected.name })}
                    onDelete={() => deleteTournament(selected.id)}
                    onAddTeam={(team) => addTeam(selected.id, team)}
                    onDeleteTeam={(teamId) => deleteTeam(selected.id, teamId)}
                    onAddMatch={(m) => addMatch(selected.id, m)}
                    onUpdateMatch={(matchId, patch) => updateMatch(selected.id, matchId, patch)}
                    onDeleteMatch={(matchId) => deleteMatch(selected.id, matchId)}
                    onAddStat={(s) => addStat(selected.id, s)}
                    onDeleteStat={(statId) => deleteStat(selected.id, statId)}
                  />
                ) : <EmptyState title="Tournament not found" body="This event is missing or was removed." actionLabel="Back to tournaments" onAction={() => navigate("/tournaments")} />} />
                <Route path="/find-players" element={user ? (
                  <FindPlayersPage gamesList={circuitCms.filterGames} currentUid={user.uid} myProfile={myProfile} friendRequests={friendRequests} onFriendRequest={(player) => requestFriend(player.uid, player.displayName)} onFriendDecision={decideFriendRequest} onReport={(player) => setReportTarget({ type: "player", id: player.uid, name: player.displayName })} onEditProfile={() => setShowProfileModal(true)} />
                ) : (
                  <div className="pt-8">
                    <h1 className="m-0 font-['Bebas_Neue',sans-serif] text-5xl">Find players</h1>
                    <p className="mb-4 mt-2 text-sm text-stone-400">Sign in to search similar players and send a connect request.</p>
                    <Button onClick={() => setAuthDialogOpen(true)}>Sign in to find players</Button>
                  </div>
                )} />
                <Route path="/blog" element={<BlogPage manageInDrawer posts={blogPosts} user={user} isModerator={isSiteStaff || isModerator} onSubmit={submitBlogPost} onReview={reviewBlogPost} onEdit={editBlogPost} onDelete={deleteBlogPost} onSignIn={() => setAuthDialogOpen(true)} />} />
                <Route path="*" element={
                  <div className="pt-10">
                    <h1 className="m-0 font-['Bebas_Neue',sans-serif] text-5xl">Page not found</h1>
                    <p className="mt-2 text-sm text-stone-400">That link is not a GrindInfo page.</p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Link to="/" className="font-mono text-xs uppercase tracking-wider text-amber-300">Home</Link>
                      <Link to="/find-players" className="font-mono text-xs uppercase tracking-wider text-amber-300">Find players</Link>
                      <Link to="/tournaments" className="font-mono text-xs uppercase tracking-wider text-amber-300">Tournaments</Link>
                      <Link to="/blog" className="font-mono text-xs uppercase tracking-wider text-amber-300">Community blog</Link>
                    </div>
                  </div>
                } />
              </Routes>
            </div>
          </>
        )}

      {user && showNewTournament && (
        <NewTournamentModal slides={vaultSlides} gamesList={circuitCms.filterGames} onClose={() => setShowNewTournament(false)} onCreate={addTournament} />
      )}

      {showProfileModal && (
        <ProfileModal
          initialProfile={myProfile}
          defaultDisplayName={user.displayName}
          gamesList={circuitCms.filterGames}
          onSave={saveProfile}
          onSkip={skipProfile}
          onClose={() => setShowProfileModal(false)}
        />
      )}

      {user && reportTarget && <ReportModal target={reportTarget} onClose={() => setReportTarget(null)} onSubmit={submitReport} />}
      {user && showFriendRequests && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-black/70 p-4">
          <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto border border-white/10 bg-[#17110f] p-4">
            <div className="mb-3 flex justify-end"><Button variant="ghost" onClick={() => setShowFriendRequests(false)}>Close</Button></div>
            <FriendRequestCenter requests={friendRequests} currentUserId={user.uid} onDecision={decideFriendRequest} />
          </div>
        </div>
      )}
      {user && activeChatFriend && <FriendChat currentUser={user} friend={activeChatFriend} onClose={() => setActiveChatFriend(null)} muted={mutedFriendSet.has(activeChatFriend.uid)} onToggleMute={toggleMuteFriend} onBlock={(friend) => { blockFriend(friend); setActiveChatFriend(null); }} />}
      {!user && authDialogOpen && <AuthScreen onGoogleSignIn={handleGoogleSignIn} onEmailAuth={handleEmailAuth} authError={authError} authBusy={authBusy} onBrowseAsGuest={browseAsGuest} onClose={() => setAuthDialogOpen(false)} requireChoice={!guestMode} knownAccounts={knownAccounts} />}
      <SitePopup popup={currentPopup} onDismiss={dismissSitePopup} />
      <Toast message={toast} />
    </div>
  );
}

const shellStyle = {
  minHeight: "100vh",
  background: "var(--page-bg)",
  color: "var(--page-text)",
  fontFamily: "'Inter', sans-serif",
};

function Header({ saving, user, guestMode, onSignInClick, onSignOut, onSwitchAccount, onEditProfile, dashboardRole, friendsPanel = null, playerTag = "" }) {
  const displayName = grindHandle(safeProfileName(user?.displayName), playerTag);
  const initials = (playerNameFromInput(safeProfileName(user?.displayName)).slice(0, 1) || "P").toUpperCase();

  return (
    <div style={{ borderBottom: "1px solid var(--border)" }}>
      <div style={{ maxWidth: 1152, margin: "0 auto", padding: "20px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", textDecoration: "none", color: "inherit" }}>
          <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, letterSpacing: "0.04em", color: "var(--page-text)" }}>
            GRINDINFO
          </span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--accent-secondary)", letterSpacing: "0.1em" }}>
            TOURNAMENT OPS
          </span>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span aria-live="polite" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: saving ? "var(--accent)" : "var(--text-muted)", minWidth: 70, textAlign: "right" }}>
            {saving ? "SAVING…" : "SAVED"}
          </span>
          {!user ? <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {guestMode && <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--text-muted)" }}>GUEST</span>}
            <Button variant="ghost" onClick={onSignInClick}>Sign in / join</Button>
          </div> : (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {friendsPanel ? (
                <details style={{ position: "relative" }}>
                  <summary
                    aria-label="Friends"
                    style={{ listStyle: "none", cursor: "pointer", color: "var(--page-text)", border: "1px solid var(--border)", background: "var(--panel-bg)", padding: "8px 12px", fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase" }}
                  >
                    Friends
                  </summary>
                  <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 65, width: 300, maxHeight: "70vh", overflow: "auto", background: "var(--panel-bg)", border: "1px solid var(--border)", boxShadow: "var(--panel-shadow)", padding: 8 }}>
                    {friendsPanel}
                  </div>
                </details>
              ) : null}
              <details style={{ position: "relative" }}>
                <summary
                  aria-label="Account menu"
                  style={{ listStyle: "none", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: "var(--page-text)", border: "1px solid var(--border)", background: "var(--panel-bg)", padding: "6px 9px", fontFamily: "'Inter', sans-serif", fontSize: 12 }}
                >
                  {user?.photoURL ? (
                    <img src={avatarForGamer({ photoURL: user.photoURL, displayName })} alt="" className="aspect-square h-[30px] w-[30px] rounded-full object-cover" />
                  ) : (
                    <span aria-hidden="true" style={{ width: 30, height: 30, borderRadius: "50%", display: "grid", placeItems: "center", background: "var(--accent)", color: "var(--accent-contrast)", fontWeight: 700 }}>
                      {initials}
                    </span>
                  )}
                  <span style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayName}</span>
                  <span aria-hidden="true" style={{ color: "var(--text-muted)" }}>⌄</span>
                </summary>
                <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 60, width: 280 }}>
                  <div style={{ padding: 14, background: "var(--panel-bg)", border: "1px solid var(--border)", boxShadow: "var(--panel-shadow)" }}>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>{displayName}</div>
                    <Button variant="ghost" style={{ width: "100%", marginBottom: 12 }} onClick={(event) => { onEditProfile(); event.currentTarget.closest("details")?.removeAttribute("open"); }}>Edit my profile</Button>
                    {dashboardRole && <Link to="/admin/portal" style={{ display: "block", width: "100%", marginBottom: 12, textDecoration: "none" }}><Button variant="ghost" style={{ width: "100%" }}>{dashboardRole === "owner" ? "Owner dashboard" : "Support dashboard"}</Button></Link>}
                    {onSwitchAccount && <Button variant="ghost" style={{ width: "100%", marginBottom: 12 }} onClick={onSwitchAccount}>Switch account</Button>}
                    <Button variant="ghost" style={{ width: "100%" }} onClick={onSignOut}>
                      Sign out
                    </Button>
                  </div>
                </div>
              </details>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
function TournamentList({ tournaments, currentUserId, currentUserName, onOpen, onNew, onSignIn, pendingInvites = [], onInviteDecision, embedded = false, hideCreate = false, archivedView, onArchivedView }) {
  const [localArchived, setLocalArchived] = useState(false);
  const showArchived = archivedView ?? localArchived;
  const setShowArchived = onArchivedView ?? setLocalArchived;
  const visibleTournaments = tournaments.filter((t) => isTournamentArchived(t) === showArchived);
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          padding: embedded ? "18px 0 12px" : "36px 0 20px",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          {!embedded && <Eyebrow>Live standings desk</Eyebrow>}
          <h1
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: embedded ? 28 : 44,
              margin: "4px 0 0",
              letterSpacing: "0.01em",
            }}
          >
            Tournaments
          </h1>
        </div>
        {currentUserId && !hideCreate && <Button onClick={onNew}>+ New tournament</Button>}
      </div>

      {!hideCreate && <div style={{ display: "flex", gap: 8, marginBottom: 14 }}><Button variant={showArchived ? "ghost" : "primary"} onClick={() => setShowArchived(false)}>Active</Button><Button variant={showArchived ? "primary" : "ghost"} onClick={() => setShowArchived(true)}>Archive</Button></div>}
      {!showArchived && pendingInvites.length > 0 && <section style={{ display: "grid", gap: 8, marginBottom: 18 }}><Eyebrow>Tournament invites</Eyebrow>{pendingInvites.map((invite) => <article key={invite.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, padding: 12, background: "var(--panel-bg)", border: "1px solid var(--border)" }}><span>{invite.inviterName || "A friend"} invited you to <strong>{invite.tournamentName}</strong> · {invite.game}</span><span style={{ display: "flex", gap: 6 }}><Button onClick={() => onOpen(invite.tournamentId)}>View tournament</Button><Button variant="ghost" onClick={() => onInviteDecision(invite.id, "accepted")}>Accept</Button><Button variant="danger" onClick={() => onInviteDecision(invite.id, "declined")}>Decline</Button></span></article>)}</section>}
      {visibleTournaments.length === 0 ? (
        <EmptyState
          title={showArchived ? "No archived tournaments" : "No active tournaments"}
          body={showArchived ? "Completed or older tournaments will appear here with their results." : currentUserId ? "Create your first tournament to start tracking teams, matches, and player stats." : "Public tournaments and their details will appear here."}
          actionLabel={!hideCreate && currentUserId ? "+ New tournament" : undefined}
          onAction={!hideCreate ? onNew : undefined}
        />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 14,
          }}
        >
          {visibleTournaments.map((t, i) => {
            return (
              <Link
                key={t.id}
                to={`/tournaments/${t.id}`}
                className="sl-card"
                onClick={() => onOpen(t.id)}
                style={{
                  textAlign: "left",
                  background: "var(--panel-bg)",
                  border: "1px solid var(--border)",
                  padding: "18px 18px 16px",
                  cursor: "pointer",
                  color: "inherit",
                  textDecoration: "none",
                  display: "block",
                  animationDelay: `${i * 30}ms`,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent-secondary)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                onFocus={(e) => (e.currentTarget.style.outline = "2px solid var(--accent-secondary)")}
                onBlur={(e) => (e.currentTarget.style.outline = "none")}
              >
                <Eyebrow color="var(--text-dim)">
                  Hosted by {t.adminDisplayName || (t.adminUserId === currentUserId ? currentUserName : "Tournament host")}
                </Eyebrow>
                <div className="aspect-video my-3 overflow-hidden border border-white/10">
                  <img src={flyerForEvent(t)} alt="" className="h-full w-full object-cover" />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 0 8px" }}>
                  <GameIcon game={t.game} size={32} />
                  <Eyebrow color="var(--text-muted)">{t.game || "Game TBD"}</Eyebrow>
                </div>
                <div
                  style={{
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: 24,
                    margin: "4px 0 10px",
                    lineHeight: 1.1,
                  }}
                >
                  {t.name}
                </div>
                {t.isLegacyImport && (
                  <div
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 10,
                      color: "var(--text-dim)",
                      marginBottom: 6,
                    }}
                  >
                    LEGACY IMPORT
                  </div>
                )}
                <div style={{ marginTop: 12, fontSize: 12, color: "var(--text-dim)" }}>
                  {(t.status || "upcoming").toUpperCase()}
                  {managesTournament(t, currentUserId) ? ` · ${t.joinMode === "open" ? "Free join" : "Request to join"}${Number(t.maxSlots) > 0 ? ` · ${t.maxSlots} slots` : ""}` : ""}
                </div>
                <div style={{ marginTop: 6, fontSize: 12, color: "var(--text-dim)" }}>
                  {fmtDate(t.startDate)} {t.endDate ? `– ${fmtDate(t.endDate)}` : ""}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NewTournamentModal({ onClose, onCreate, slides = [], gamesList = FILTER_GAMES }) {
  const [name, setName] = useState("");
  const [game, setGame] = useState(gamesList[0]);
  const [kind, setKind] = useState("bracket");
  const [format, setFormat] = useState(FORMATS[0]);
  const [joinMode, setJoinMode] = useState("open");
  const [maxSlots, setMaxSlots] = useState("16");
  const [blurb, setBlurb] = useState("");
  const [roomId, setRoomId] = useState("");
  const [roomPassword, setRoomPassword] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [posterUrl, setPosterUrl] = useState("");
  const [prizeAmount, setPrizeAmount] = useState("0");
  const [customPrize, setCustomPrize] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const fromVault = slides.find((slide) => String(slide.game || "").toLowerCase() === game.toLowerCase())?.poster;
    setPosterUrl(fromVault || bannerForGame(game));
    let active = true;
    fetchGamePoster(game).then((url) => { if (active && url) setPosterUrl(url); });
    return () => { active = false; };
  }, [game, slides]);

  const submit = () => {
    if (!name.trim()) {
      setError("Enter a tournament name first");
      return;
    }
    if ((roomId.trim() && !roomPassword.trim()) || (!roomId.trim() && roomPassword.trim())) {
      setError("Add both room ID and password, or leave both blank.");
      return;
    }
    const amount = prizeAmount === "custom" ? Number(customPrize) : Number(prizeAmount);
    if (!Number.isFinite(amount) || amount < 0 || amount > 100000000) { setError("Enter a valid prize information amount."); return; }
    const slots = Math.max(0, Math.min(256, Number(maxSlots) || 0));
    const nextKind = kind === "custom_room" ? "custom_room" : "bracket";
    onCreate({
      name: name.trim(),
      game,
      kind: nextKind,
      format: nextKind === "custom_room" ? "Custom room" : format,
      joinMode,
      maxSlots: slots,
      blurb: blurb.trim().slice(0, 400),
      posterUrl,
      roomId: roomId.trim(),
      roomPassword: roomPassword.trim(),
      startDate,
      endDate,
      prizeAmount: amount,
      prizeCurrency: "INR",
      status: "upcoming",
      registrationOpen: true,
    });
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(4,6,8,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        zIndex: 85,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--panel-bg)",
          border: "1px solid var(--border)",
          padding: 28,
          width: "100%",
          maxWidth: 520,
          maxHeight: "88vh",
          overflowY: "auto",
        }}
      >
        <Eyebrow>New entry</Eyebrow>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, margin: "4px 0 8px" }}>
          Create tournament
        </div>
        <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--text-muted)" }}>No flyer upload. Set join type, team cap, and optional room codes here. Card art comes from the game.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label="Tournament name">
            <TextInput
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError("");
              }}
              placeholder="Winter Invitational 2026"
              autoFocus
            />
          </Field>
          {error && <div style={{ fontSize: 13, color: "var(--danger)" }}>{error}</div>}
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <Field label="Game">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <GameIcon game={game} size={38} />
                  <Select value={game} onChange={(e) => setGame(e.target.value)} style={{ flex: 1 }}>
                    {gamesList.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </Select>
                </div>
              </Field>
            </div>
            <div style={{ flex: 1 }}>
              <Field label="Type">
                <Select value={kind} onChange={(e) => setKind(e.target.value)}>
                  <option value="bracket">Full tournament</option>
                  <option value="custom_room">Custom room only</option>
                </Select>
              </Field>
            </div>
          </div>
          {kind === "bracket" && (
            <Field label="Format">
              <Select value={format} onChange={(e) => setFormat(e.target.value)}>
                {FORMATS.filter((item) => item !== "Custom room").map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </Select>
            </Field>
          )}
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.08em", color: "var(--accent-secondary)", textTransform: "uppercase" }}>Host setup</div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 150 }}>
              <Field label="Who can enter">
                <Select value={joinMode} onChange={(e) => setJoinMode(e.target.value)}>
                  <option value="open">Free join — anyone signed in can enter</option>
                  <option value="request">Request to join — host approves each player</option>
                </Select>
              </Field>
            </div>
            <div style={{ flex: 1, minWidth: 150 }}>
              <Field label={kind === "custom_room" ? "Max players (0 = unlimited)" : "Max teams (0 = unlimited)"}>
                <TextInput type="number" min="0" max="256" value={maxSlots} onChange={(e) => setMaxSlots(e.target.value)} />
              </Field>
            </div>
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            <Field label="Room ID (optional)">
              <TextInput value={roomId} onChange={(e) => setRoomId(e.target.value)} maxLength={40} placeholder="In-game room ID" />
            </Field>
            <Field label="Room password (optional)">
              <TextInput value={roomPassword} onChange={(e) => setRoomPassword(e.target.value)} maxLength={40} placeholder="In-game password" />
            </Field>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Only approved or free-joined players will see these. You can add them later if you skip now.</div>
          </div>
          <Field label="Basic info for players">
            <textarea value={blurb} maxLength={400} rows={3} onChange={(e) => setBlurb(e.target.value)} style={{ ...inputStyle, resize: "vertical" }} placeholder="Server region, start time, rules, or what to bring." />
          </Field>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <Field label="Start date">
                <TextInput type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </Field>
            </div>
            <div style={{ flex: 1 }}>
              <Field label="End date">
                <TextInput type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </Field>
            </div>
          </div>
          <Field label="Prize information (INR · no payment collection)">
            <Select value={prizeAmount} onChange={(event) => setPrizeAmount(event.target.value)}>
              {PRIZE_PRESETS.map((amount) => <option key={amount} value={String(amount)}>{amount === 0 ? "No prize listed" : `₹${amount.toLocaleString()}`}</option>)}
              <option value="custom">Custom amount</option>
            </Select>
          </Field>
          {prizeAmount === "custom" && <Field label="Custom prize information amount (₹)"><TextInput type="number" min="0" max="100000000" value={customPrize} onChange={(event) => setCustomPrize(event.target.value)} placeholder="Enter amount" /></Field>}
          <div style={{ fontSize: 11, color: "var(--text-dim)" }}>Registration is free in GrindInfo. Prize amounts are informational only; payments are not processed here.</div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 }}>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit}>Create tournament</Button>
        </div>
      </div>
    </div>
  );
}

function TournamentResults({ results, isAdmin, onSave }) {
  const [winner, setWinner] = useState(results?.winner || "");
  const [mvp, setMvp] = useState(results?.mvp || "");
  const [runnerUp, setRunnerUp] = useState(results?.runnerUp || "");
  const [secondRunnerUp, setSecondRunnerUp] = useState(results?.secondRunnerUp || "");
  const [error, setError] = useState("");

  useEffect(() => {
    setWinner(results?.winner || "");
    setMvp(results?.mvp || "");
    setRunnerUp(results?.runnerUp || "");
    setSecondRunnerUp(results?.secondRunnerUp || "");
  }, [results?.winner, results?.mvp, results?.runnerUp, results?.secondRunnerUp]);

  const hasResults = hasPostedResults({ results });
  if (!isAdmin && !hasResults) return null;

  const submit = () => {
    const nextResults = {
      winner: winner.trim(),
      mvp: mvp.trim(),
      runnerUp: runnerUp.trim(),
      secondRunnerUp: secondRunnerUp.trim(),
    };
    if (Object.values(nextResults).some((value) => !value)) {
      setError("Fill in all four result names before posting.");
      return;
    }
    setError("");
    onSave(nextResults);
  };

  return (
    <section
      aria-label="Tournament results"
      style={{
        marginTop: isAdmin ? 0 : 24,
        padding: isAdmin ? 0 : 18,
        border: isAdmin ? "none" : "1px solid var(--border)",
        background: isAdmin ? "transparent" : "var(--panel-bg)",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div>
        <Eyebrow>Final results</Eyebrow>
        <div style={{ marginTop: 5, color: "var(--text-muted)", fontSize: 13 }}>
          {isAdmin ? "Post the tournament placements and MVP." : hasResults ? "Tournament placements and MVP." : "Results have not been posted yet."}
        </div>
      </div>
      {isAdmin ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <Field label="Winner">
              <TextInput value={winner} onChange={(e) => setWinner(e.target.value)} placeholder="Winning player or team" maxLength={80} />
            </Field>
            <Field label="MVP">
              <TextInput value={mvp} onChange={(e) => setMvp(e.target.value)} placeholder="Most valuable player" maxLength={80} />
            </Field>
            <Field label="Runner-up">
              <TextInput value={runnerUp} onChange={(e) => setRunnerUp(e.target.value)} placeholder="Second place" maxLength={80} />
            </Field>
            <Field label="2nd Runner-up">
              <TextInput value={secondRunnerUp} onChange={(e) => setSecondRunnerUp(e.target.value)} placeholder="Third place" maxLength={80} />
            </Field>
          </div>
          {error && <div role="alert" style={{ color: "var(--danger)", fontSize: 13 }}>{error}</div>}
          <div>
            <Button onClick={submit}>Post results</Button>
          </div>
        </>
      ) : hasResults ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
          {[
            ["Winner", results?.winner],
            ["MVP", results?.mvp],
            ["Runner-up", results?.runnerUp],
            ["2nd Runner-up", results?.secondRunnerUp],
          ].filter(([, value]) => value).map(([label, value]) => (
            <div key={label} style={{ padding: 12, background: "var(--panel-raised)", border: "1px solid var(--border)" }}>
              <Eyebrow color="var(--text-dim)">{label}</Eyebrow>
              <div style={{ marginTop: 5, fontWeight: 600 }}>{value}</div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function TournamentInvitePanel({ tournament, friends, invites, onInvite }) {
  const [friendUid, setFriendUid] = useState("");
  const selectedFriend = friends.find((friend) => friend.uid === friendUid);
  const existing = invites.find((invite) => invite.tournamentId === tournament.id && invite.inviteeUid === friendUid);
  if (tournament.registrationOpen === false || isTournamentArchived(tournament)) return <section style={{ marginTop: 16, padding: 16, background: "var(--panel-bg)", border: "1px solid var(--border)" }}><Eyebrow>Invite a friend</Eyebrow><div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 7 }}>Invites are closed for this tournament.</div></section>;
  return <section style={{ marginTop: 16, padding: 16, background: "var(--panel-bg)", border: "1px solid var(--border)" }}>
    <Eyebrow>Invite a friend</Eyebrow>
    <div style={{ color: "var(--text-muted)", fontSize: 12, margin: "7px 0 10px" }}>Invite an accepted friend to view this tournament. They will still need to send a join request, with the safety disclaimer shown first.</div>
    {friends.length === 0 ? <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Add a friend first, then you can invite them here.</div> : <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <Select aria-label="Choose friend to invite" value={friendUid} onChange={(event) => setFriendUid(event.target.value)}><option value="">Choose a friend</option>{friends.map((friend) => <option key={friend.uid} value={friend.uid}>{friend.name}{friend.playerTag ? ` · #${friend.playerTag}` : ""}</option>)}</Select>
      <Button disabled={!selectedFriend || existing?.status === "pending" || existing?.status === "accepted"} onClick={() => selectedFriend && onInvite(selectedFriend)}>{existing?.status === "pending" ? "Invite pending" : existing?.status === "accepted" ? "Invite accepted" : existing?.status === "declined" ? "Send invite again" : "Send tournament invite"}</Button>
    </div>}
  </section>;
}

function HostControls({ tournament, requests, lobby, onUpdateSettings, onCloseTournament, onSaveLobby }) {
  const [joinMode, setJoinMode] = useState(tournament.joinMode === "open" ? "open" : "request");
  const [maxSlots, setMaxSlots] = useState(String(tournament.maxSlots ?? 0));
  const [blurb, setBlurb] = useState(tournament.blurb || "");
  const [kind, setKind] = useState(isCustomRoomEvent(tournament) ? "custom_room" : "bracket");
  const [roomId, setRoomId] = useState(lobby?.roomId || "");
  const [roomPassword, setRoomPassword] = useState(lobby?.roomPassword || "");
  const [roomError, setRoomError] = useState("");
  const [roomBusy, setRoomBusy] = useState(false);
  useEffect(() => {
    setJoinMode(tournament.joinMode === "open" ? "open" : "request");
    setMaxSlots(String(tournament.maxSlots ?? 0));
    setBlurb(tournament.blurb || "");
    setKind(isCustomRoomEvent(tournament) ? "custom_room" : "bracket");
  }, [tournament.joinMode, tournament.maxSlots, tournament.blurb, tournament.kind, tournament.format]);
  useEffect(() => {
    setRoomId(lobby?.roomId || "");
    setRoomPassword(lobby?.roomPassword || "");
  }, [lobby?.roomId, lobby?.roomPassword]);
  const save = () => onUpdateSettings({
    joinMode,
    maxSlots: Math.max(0, Math.min(256, Math.trunc(Number(maxSlots) || 0))),
    blurb: blurb.trim().slice(0, 400),
    kind,
    format: kind === "custom_room" ? "Custom room" : (tournament.format === "Custom room" ? FORMATS[0] : tournament.format),
    registrationOpen: tournament.registrationOpen !== false,
  });
  const saveRoom = async () => {
    const nextId = roomId.trim();
    const nextPassword = roomPassword.trim();
    if (!nextId || !nextPassword) { setRoomError("Enter both the room ID and password."); return; }
    setRoomBusy(true); setRoomError("");
    try { await onSaveLobby({ roomId: nextId, roomPassword: nextPassword }); }
    catch { setRoomError("Couldn't share room details. Try again."); }
    finally { setRoomBusy(false); }
  };
  const postedRoom = Boolean(lobby?.roomId && lobby?.roomPassword);
  const setLive = () => onUpdateSettings({ status: "live", archived: false, registrationOpen: true });
  const setUpcoming = () => onUpdateSettings({ status: "upcoming", archived: false });
  return (
    <div>
      <div style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 12px" }}>Join type, team cap, live/closed, and room codes live here. Visitors only see what you post.</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <Button variant={tournament.status === "upcoming" ? "primary" : "ghost"} onClick={setUpcoming}>Upcoming</Button>
        <Button variant={tournament.status === "live" ? "primary" : "ghost"} onClick={setLive}>Live</Button>
        <Button variant="ghost" onClick={onCloseTournament}>Closed</Button>
        <Button variant={tournament.registrationOpen === false ? "ghost" : "primary"} onClick={() => onUpdateSettings({ registrationOpen: tournament.registrationOpen === false })}>
          {tournament.registrationOpen === false ? "Open registration" : "Stop registration"}
        </Button>
      </div>
      <div style={{ display: "grid", gap: 10, maxWidth: 520 }}>
        <Field label="Event type">
          <Select value={kind} onChange={(event) => setKind(event.target.value)}>
            <option value="bracket">Full tournament</option>
            <option value="custom_room">Custom room only</option>
          </Select>
        </Field>
        <Field label="Who can enter">
          <Select value={joinMode} onChange={(event) => setJoinMode(event.target.value)}>
            <option value="open">Free join — anyone signed in can enter</option>
            <option value="request">Request to join — host approves each player</option>
          </Select>
        </Field>
        <Field label="Max teams / players (0 = unlimited)">
          <TextInput type="number" min="0" max="256" value={maxSlots} onChange={(event) => setMaxSlots(event.target.value)} />
        </Field>
        <Field label="Basic info">
          <textarea value={blurb} maxLength={400} rows={3} onChange={(event) => setBlurb(event.target.value)} style={{ ...inputStyle, resize: "vertical" }} />
        </Field>
        <Field label="Room ID">
          <TextInput value={roomId} onChange={(event) => setRoomId(event.target.value)} maxLength={40} placeholder="In-game room ID" />
        </Field>
        <Field label="Room password">
          <TextInput value={roomPassword} onChange={(event) => setRoomPassword(event.target.value)} maxLength={40} placeholder="In-game password" />
        </Field>
      </div>
      {roomError && <div role="alert" style={{ color: "var(--danger)", fontSize: 13, marginTop: 8 }}>{roomError}</div>}
      <div style={{ marginTop: 12, fontSize: 12, color: "var(--text-dim)" }}>{approvedCount(requests)} currently approved. Room codes stay hidden until you post them and a player is approved.</div>
      <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Button onClick={save}>Save host settings</Button>
        <Button variant="ghost" disabled={roomBusy} onClick={saveRoom}>{roomBusy ? "Sharing…" : postedRoom ? "Update room codes" : "Post room codes"}</Button>
      </div>
    </div>
  );
}

function TournamentDetail(props) {
  const {
    tournament,
    teams,
    matches,
    stats,
    isAdmin,
    isOwner,
    currentUserId,
    currentUserName,
    registrations,
    lobby = null,
    onSaveLobby,
    friends = [],
    tournamentInvites = [],
    onInviteFriend,
    onAddCoAdmin,
    onSaveResults,
    onBack,
    onShare,
    onRequestFriend,
    onRequestRegistration,
    onRegistrationDecision,
    onSignIn,
    onCoAdminsChange,
    onReport,
    onDelete,
    onCloseTournament,
    onUpdateSettings,
    onAddTeam,
    onDeleteTeam,
    onAddMatch,
    onUpdateMatch,
    onDeleteMatch,
    onAddStat,
    onDeleteStat,
  } = props;

  return (
    <div style={{ paddingTop: 24 }}>
      <button
        onClick={onBack}
        style={{
          display: "inline-flex",
          alignItems: "center",
          alignSelf: "flex-start",
          textAlign: "left",
          background: "var(--panel-bg)",
          border: "1px solid var(--border)",
          color: "var(--text-muted)",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 12,
          cursor: "pointer",
          padding: "9px 12px",
          marginBottom: 18,
        }}
      >
        ← Back to all tournaments
      </button>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div>
          <Eyebrow color="var(--text-dim)">
            Hosted by {tournament.adminDisplayName || (tournament.adminUserId === currentUserId ? currentUserName : "Tournament host")}
          </Eyebrow>
          <div className="mb-3 aspect-video max-w-sm overflow-hidden rounded-xl border border-white/10">
            <img src={flyerForEvent(tournament)} alt="" className="h-full w-full object-cover" />
          </div>
          <Eyebrow color="var(--text-muted)">
            {tournament.game} · {tournament.format} · {tournament.status || "upcoming"}
          </Eyebrow>
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 38, margin: "4px 0 6px" }}>
            {tournament.name}
          </h1>
          <div style={{ fontSize: 13, color: "var(--text-dim)" }}>
            {fmtDate(tournament.startDate)} {tournament.endDate ? `– ${fmtDate(tournament.endDate)}` : ""}
          </div>
          <div style={{ fontSize: 13, color: "var(--accent-secondary)", marginTop: 7 }}>
            {Number(tournament.prizeAmount) > 0 ? `Prize information: ${tournament.prizeCurrency || "INR"} ${Number(tournament.prizeAmount).toLocaleString()}` : "Free tournament"}
          </div>
          {isAdmin && (
            <div
              style={{
                display: "inline-block",
                marginTop: 10,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                letterSpacing: "0.1em",
                color: "var(--accent-contrast)",
                background: "var(--accent)",
                padding: "4px 10px",
              }}
            >
              {isOwner ? "HOST · You manage this tournament" : "CO-HOST · You manage this tournament"}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {isAdmin && !isTournamentArchived(tournament) && <Button variant="ghost" onClick={onCloseTournament}>Close tournament</Button>}
          {currentUserId && <Button variant="ghost" onClick={onShare}>Share tournament</Button>}
          {currentUserId ? <Button variant="danger" onClick={onReport}>Report tournament</Button> : <Button variant="ghost" onClick={onSignIn}>Sign in to report</Button>}
          {currentUserId && !isOwner && <Button variant="ghost" onClick={onRequestFriend}>Request host as friend</Button>}
        {isOwner && (
          <Button
            variant="danger"
            onClick={() => {
              if (window.confirm(`Delete "${tournament.name}" and all its teams, matches, and stats?`)) onDelete();
            }}
          >
            Delete tournament
          </Button>
        )}
        </div>
      </div>

      {tournament.blurb && <p style={{ marginTop: 14, color: "var(--text-muted)", whiteSpace: "pre-wrap", maxWidth: 680 }}>{tournament.blurb}</p>}
      {isAdmin && (
        <DeskFold title="Host desk · join type, cap, room codes" defaultOpen>
          <HostControls tournament={tournament} requests={registrations || []} lobby={lobby} onUpdateSettings={onUpdateSettings} onCloseTournament={onCloseTournament} onSaveLobby={onSaveLobby} />
          <div style={{ marginTop: 18 }}>
            <RegistrationPanel tournament={tournament} requests={registrations || []} currentUserId={currentUserId} currentUserName={currentUserName} isAdmin={isAdmin} onRequest={onRequestRegistration} onDecision={onRegistrationDecision} disclaimer={props.registrationDisclaimer} onDisclaimerVisibilityChange={props.onJoinDisclaimerVisibilityChange} onSignIn={onSignIn} />
          </div>
        </DeskFold>
      )}
      {!isAdmin && (
        <RegistrationPanel tournament={tournament} requests={registrations || []} currentUserId={currentUserId} currentUserName={currentUserName} isAdmin={isAdmin} onRequest={onRequestRegistration} onDecision={onRegistrationDecision} disclaimer={props.registrationDisclaimer} onDisclaimerVisibilityChange={props.onJoinDisclaimerVisibilityChange} onSignIn={onSignIn} />
      )}
      <RoomLobbyPanel isAdmin={isAdmin} canSee={!isAdmin && (registrations || []).some((request) => request.playerId === currentUserId && request.status === "approved")} lobby={lobby} />
      {currentUserId && <TournamentInvitePanel tournament={tournament} friends={friends} invites={tournamentInvites} onInvite={(friend) => onInviteFriend(tournament, friend)} />}
      {isOwner && (
        <DeskFold title="Co-host">
          <CoAdminPanel tournament={tournament} isOwner={isOwner} onChange={(ids, tags) => onCoAdminsChange(ids, tags)} onAddByPlayerId={(playerTag) => onAddCoAdmin(tournament, playerTag)} />
        </DeskFold>
      )}
      {!isCustomRoomEvent(tournament) && (isAdmin || hasPostedResults(tournament)) && (
        isAdmin ? (
          <DeskFold title="Final results">
            <TournamentResults results={tournament.results} isAdmin={isAdmin} onSave={onSaveResults} />
          </DeskFold>
        ) : (
          <TournamentResults results={tournament.results} isAdmin={isAdmin} onSave={onSaveResults} />
        )
      )}

      {!isCustomRoomEvent(tournament) && (isAdmin || teams.length > 0 || matches.length > 0 || stats.length > 0) && (
        isAdmin ? (
          <>
            <DeskFold title={`Teams (${teams.length})`}>
              <TeamsPanel teams={teams} isAdmin={isAdmin} onAdd={onAddTeam} onDelete={onDeleteTeam} />
            </DeskFold>
            <DeskFold title={`Matches (${matches.length})`}>
              <MatchesPanel teams={teams} matches={matches} isAdmin={isAdmin} onAdd={onAddMatch} onUpdate={onUpdateMatch} onDelete={onDeleteMatch} />
            </DeskFold>
            <DeskFold title={`Player stats (${stats.length})`}>
              <StatsPanel teams={teams} matches={matches} stats={stats} isAdmin={isAdmin} onAdd={onAddStat} onDelete={onDeleteStat} />
            </DeskFold>
            <DeskFold title="Leaderboard">
              <LeaderboardPanel teams={teams} stats={stats} />
            </DeskFold>
          </>
        ) : (
          <>
            {teams.length > 0 && (
              <DeskFold title={`Teams (${teams.length})`} defaultOpen>
                <TeamsPanel teams={teams} isAdmin={false} onAdd={onAddTeam} onDelete={onDeleteTeam} />
              </DeskFold>
            )}
            {matches.length > 0 && (
              <DeskFold title={`Matches (${matches.length})`} defaultOpen>
                <MatchesPanel teams={teams} matches={matches} isAdmin={false} onAdd={onAddMatch} onUpdate={onUpdateMatch} onDelete={onDeleteMatch} />
              </DeskFold>
            )}
            {stats.length > 0 && (
              <DeskFold title={`Player stats (${stats.length})`} defaultOpen>
                <StatsPanel teams={teams} matches={matches} stats={stats} isAdmin={false} onAdd={onAddStat} onDelete={onDeleteStat} />
              </DeskFold>
            )}
            {stats.length > 0 && (
              <DeskFold title="Leaderboard">
                <LeaderboardPanel teams={teams} stats={stats} />
              </DeskFold>
            )}
          </>
        )
      )}
    </div>
  );
}

function TeamsPanel({ teams, isAdmin, onAdd, onDelete }) {
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    if (!name.trim()) {
      setError("Enter a team name first");
      return;
    }
    onAdd({ name: name.trim(), tag: tag.trim().toUpperCase().slice(0, 5) });
    setName("");
    setTag("");
  };

  return (
    <div>
      {isAdmin && (
        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ minWidth: 200 }}>
            <Field label="Team name">
              <TextInput
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError("");
                }}
                placeholder="Nova Esports"
                onKeyDown={(e) => e.key === "Enter" && submit()}
              />
            </Field>
          </div>
          <div style={{ width: 110 }}>
            <Field label="Tag">
              <TextInput
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder="NOVA"
                onKeyDown={(e) => e.key === "Enter" && submit()}
              />
            </Field>
          </div>
          <Button onClick={submit}>Add team</Button>
        </div>
      )}
      {error && <div style={{ fontSize: 13, color: "var(--danger)", marginBottom: 14 }}>{error}</div>}

      {teams.length === 0 ? (
        <EmptyState title="No teams yet" body="Add the teams competing in this tournament." />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
          {teams.map((t) => (
            <div
              key={t.id}
              style={{
                background: "var(--panel-bg)",
                border: "1px solid var(--border)",
                padding: "14px 16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, letterSpacing: "0.02em" }}>
                  {t.name}
                </div>
                {t.tag && (
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--accent-secondary)" }}>
                    {t.tag}
                  </div>
                )}
              </div>
              {isAdmin && (
                <button
                  onClick={() => onDelete(t.id)}
                  aria-label={`Remove ${t.name}`}
                  style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: 16 }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MatchesPanel({ teams, matches, isAdmin, onAdd, onUpdate, onDelete }) {
  const [teamA, setTeamA] = useState("");
  const [teamB, setTeamB] = useState("");
  const [round, setRound] = useState("");
  const [date, setDate] = useState("");
  const [error, setError] = useState("");

  const teamName = (id) => teams.find((t) => t.id === id)?.name || "TBD";
  const teamTag = (id) => teams.find((t) => t.id === id)?.tag || "";

  const submit = () => {
    if (teams.length < 2) {
      setError("Add at least two teams first");
      return;
    }
    if (!teamA || !teamB) {
      setError("Choose both teams");
      return;
    }
    if (teamA === teamB) {
      setError("Choose two different teams");
      return;
    }
    onAdd({
      teamAId: teamA,
      teamBId: teamB,
      round: round.trim() || "Round 1",
      date,
      scoreA: 0,
      scoreB: 0,
      status: "upcoming",
    });
    setRound("");
  };

  const grouped = useMemo(() => {
    const g = {};
    matches.forEach((m) => {
      const key = m.round || "Round 1";
      g[key] = g[key] || [];
      g[key].push(m);
    });
    return g;
  }, [matches]);

  return (
    <div>
      {!isAdmin ? null : teams.length < 2 ? (
        <EmptyState title="Add teams first" body="You need at least two teams before scheduling a match." />
      ) : (
        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ minWidth: 160 }}>
            <Field label="Team A">
              <Select value={teamA} onChange={(e) => setTeamA(e.target.value)}>
                <option value="">Select…</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div style={{ minWidth: 160 }}>
            <Field label="Team B">
              <Select value={teamB} onChange={(e) => setTeamB(e.target.value)}>
                <option value="">Select…</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div style={{ width: 140 }}>
            <Field label="Round / stage">
              <TextInput value={round} onChange={(e) => setRound(e.target.value)} placeholder="Semifinal" />
            </Field>
          </div>
          <div style={{ width: 150 }}>
            <Field label="Date">
              <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
          </div>
          <Button onClick={submit}>Schedule match</Button>
        </div>
      )}
      {error && <div style={{ fontSize: 13, color: "var(--danger)", marginBottom: 14 }}>{error}</div>}

      {matches.length === 0 ? (
        <EmptyState title="No matches scheduled" body="Schedule a match between two teams to start tracking results." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {Object.entries(grouped).map(([roundName, roundMatches]) => (
            <div key={roundName}>
              <Eyebrow>{roundName}</Eyebrow>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                {roundMatches.map((m) => (
                  <MatchRow
                    key={m.id}
                    match={m}
                    teamAName={teamName(m.teamAId)}
                    teamBName={teamName(m.teamBId)}
                    teamATag={teamTag(m.teamAId)}
                    teamBTag={teamTag(m.teamBId)}
                    isAdmin={isAdmin}
                    onUpdate={(patch) => onUpdate(m.id, patch)}
                    onDelete={() => onDelete(m.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MatchRow({ match, teamAName, teamBName, teamATag, teamBTag, isAdmin, onUpdate, onDelete }) {
  const [scoreA, setScoreA] = useState(match.scoreA ?? 0);
  const [scoreB, setScoreB] = useState(match.scoreB ?? 0);

  useEffect(() => {
    setScoreA(match.scoreA ?? 0);
    setScoreB(match.scoreB ?? 0);
  }, [match.scoreA, match.scoreB]);

  const commitScores = () => {
    onUpdate({ scoreA: Number(scoreA) || 0, scoreB: Number(scoreB) || 0 });
  };

  const aWins = match.status === "completed" && Number(match.scoreA) > Number(match.scoreB);
  const bWins = match.status === "completed" && Number(match.scoreB) > Number(match.scoreA);

  return (
    <div
      style={{
        background: "var(--panel-bg)",
        border: "1px solid var(--border)",
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        gap: 14,
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 260 }}>
        <span
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 14,
            fontWeight: aWins ? 700 : 400,
            color: aWins ? "var(--accent)" : "var(--page-text)",
            flex: 1,
            textAlign: "right",
          }}
        >
          {teamAName} {teamATag && <span style={{ color: "var(--text-dim)", fontSize: 11 }}>({teamATag})</span>}
        </span>
        {isAdmin ? (
          <input
            type="number"
            value={scoreA}
            onChange={(e) => setScoreA(e.target.value)}
            onBlur={commitScores}
            style={{
              ...inputStyle,
              width: 48,
              textAlign: "center",
              fontFamily: "'JetBrains Mono', monospace",
              padding: "6px 4px",
            }}
          />
        ) : (
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 700 }}>{scoreA}</span>
        )}
        <span style={{ color: "var(--text-dim)", fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>–</span>
        {isAdmin ? (
          <input
            type="number"
            value={scoreB}
            onChange={(e) => setScoreB(e.target.value)}
            onBlur={commitScores}
            style={{
              ...inputStyle,
              width: 48,
              textAlign: "center",
              fontFamily: "'JetBrains Mono', monospace",
              padding: "6px 4px",
            }}
          />
        ) : (
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 700 }}>{scoreB}</span>
        )}
        <span
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 14,
            fontWeight: bWins ? 700 : 400,
            color: bWins ? "var(--accent)" : "var(--page-text)",
            flex: 1,
          }}
        >
          {teamBName} {teamBTag && <span style={{ color: "var(--text-dim)", fontSize: 11 }}>({teamBTag})</span>}
        </span>
      </div>

      {isAdmin ? (
        <Select value={match.status} onChange={(e) => onUpdate({ status: e.target.value })} style={{ width: 130 }}>
          <option value="upcoming">Upcoming</option>
          <option value="live">Live</option>
          <option value="completed">Completed</option>
        </Select>
      ) : (
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)" }}>
          {match.status}
        </span>
      )}
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: STATUS_COLORS[match.status] || "var(--text-muted)",
          flexShrink: 0,
        }}
      />
      <span style={{ fontSize: 12, color: "var(--text-dim)", fontFamily: "'JetBrains Mono', monospace", minWidth: 80 }}>
        {fmtDate(match.date)}
      </span>
      {isAdmin && (
        <button
          onClick={onDelete}
          aria-label="Delete match"
          style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: 16 }}
        >
          ×
        </button>
      )}
    </div>
  );
}

function StatsPanel({ teams, matches, stats, isAdmin, onAdd, onDelete }) {
  const [player, setPlayer] = useState("");
  const [teamId, setTeamId] = useState("");
  const [matchId, setMatchId] = useState("");
  const [kills, setKills] = useState("");
  const [deaths, setDeaths] = useState("");
  const [assists, setAssists] = useState("");
  const [score, setScore] = useState("");
  const [error, setError] = useState("");

  const teamName = (id) => teams.find((t) => t.id === id)?.name || "—";
  const matchLabel = (id) => {
    const m = matches.find((x) => x.id === id);
    if (!m) return "No match linked";
    return `${teamName(m.teamAId)} vs ${teamName(m.teamBId)} (${m.round})`;
  };

  const submit = () => {
    if (!player.trim()) {
      setError("Enter a player name first");
      return;
    }
    onAdd({
      player: player.trim(),
      teamId: teamId || null,
      matchId: matchId || null,
      kills: Number(kills) || 0,
      deaths: Number(deaths) || 0,
      assists: Number(assists) || 0,
      score: Number(score) || 0,
    });
    setPlayer("");
    setKills("");
    setDeaths("");
    setAssists("");
    setScore("");
  };

  return (
    <div>
      {isAdmin && teams.length === 0 && (
        <EmptyState title="Add teams first" body="Player stats attach to a team, so add teams before logging stats." />
      )}
      {isAdmin && teams.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: 10,
            marginBottom: 12,
          }}
        >
          <Field label="Player name">
            <TextInput value={player} onChange={(e) => { setPlayer(e.target.value); if (error) setError(""); }} placeholder="ghostpeak" />
          </Field>
          <Field label="Team">
            <Select value={teamId} onChange={(e) => setTeamId(e.target.value)}>
              <option value="">No team</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Match (optional)">
            <Select value={matchId} onChange={(e) => setMatchId(e.target.value)}>
              <option value="">No match linked</option>
              {matches.map((m) => (
                <option key={m.id} value={m.id}>
                  {teamName(m.teamAId)} vs {teamName(m.teamBId)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Kills">
            <TextInput type="number" value={kills} onChange={(e) => setKills(e.target.value)} placeholder="0" />
          </Field>
          <Field label="Deaths">
            <TextInput type="number" value={deaths} onChange={(e) => setDeaths(e.target.value)} placeholder="0" />
          </Field>
          <Field label="Assists">
            <TextInput type="number" value={assists} onChange={(e) => setAssists(e.target.value)} placeholder="0" />
          </Field>
          <Field label="Score">
            <TextInput type="number" value={score} onChange={(e) => setScore(e.target.value)} placeholder="0" />
          </Field>
        </div>
      )}
      {isAdmin && teams.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <Button onClick={submit}>Log stat line</Button>
        </div>
      )}
      {error && <div style={{ fontSize: 13, color: "var(--danger)", marginBottom: 14 }}>{error}</div>}

      {stats.length === 0 ? (
        <EmptyState title="No stats logged" body="Log kills, deaths, assists, and score per player to build the leaderboard." />
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-muted)", textAlign: "left" }}>
                <th style={{ padding: "8px 10px", fontWeight: 600 }}>Player</th>
                <th style={{ padding: "8px 10px", fontWeight: 600 }}>Team</th>
                <th style={{ padding: "8px 10px", fontWeight: 600 }}>Match</th>
                <th style={{ padding: "8px 10px", fontWeight: 600, textAlign: "right" }}>K</th>
                <th style={{ padding: "8px 10px", fontWeight: 600, textAlign: "right" }}>D</th>
                <th style={{ padding: "8px 10px", fontWeight: 600, textAlign: "right" }}>A</th>
                <th style={{ padding: "8px 10px", fontWeight: 600, textAlign: "right" }}>Score</th>
                <th style={{ padding: "8px 10px" }} />
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => (
                <tr key={s.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "8px 10px", fontFamily: "'Inter', sans-serif" }}>{s.player}</td>
                  <td style={{ padding: "8px 10px", color: "var(--text-muted)" }}>{teamName(s.teamId)}</td>
                  <td style={{ padding: "8px 10px", color: "var(--text-dim)", fontSize: 12 }}>{matchLabel(s.matchId)}</td>
                  <td style={{ padding: "8px 10px", textAlign: "right" }}>{s.kills}</td>
                  <td style={{ padding: "8px 10px", textAlign: "right" }}>{s.deaths}</td>
                  <td style={{ padding: "8px 10px", textAlign: "right" }}>{s.assists}</td>
                  <td style={{ padding: "8px 10px", textAlign: "right", color: "var(--accent)" }}>{s.score}</td>
                  <td style={{ padding: "8px 10px", textAlign: "right" }}>
                    {isAdmin && (
                      <button
                        onClick={() => onDelete(s.id)}
                        aria-label={`Delete stat line for ${s.player}`}
                        style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: 15 }}
                      >
                        ×
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function LeaderboardPanel({ teams, stats }) {
  const teamName = (id) => teams.find((t) => t.id === id)?.name || "—";

  const rows = useMemo(() => {
    const byPlayer = {};
    stats.forEach((s) => {
      const key = s.player.toLowerCase();
      if (!byPlayer[key]) {
        byPlayer[key] = {
          player: s.player,
          teamId: s.teamId,
          kills: 0,
          deaths: 0,
          assists: 0,
          score: 0,
          matches: 0,
        };
      }
      byPlayer[key].kills += Number(s.kills) || 0;
      byPlayer[key].deaths += Number(s.deaths) || 0;
      byPlayer[key].assists += Number(s.assists) || 0;
      byPlayer[key].score += Number(s.score) || 0;
      byPlayer[key].matches += 1;
    });
    return Object.values(byPlayer).sort((a, b) => b.score - a.score || b.kills - a.kills);
  }, [stats]);

  if (rows.length === 0) {
    return <EmptyState title="Nothing to rank yet" body="Log player stats to see the leaderboard fill in." />;
  }

  const rankColor = (i) => (i === 0 ? "var(--accent)" : i === 1 ? "var(--rank-second)" : i === 2 ? "var(--rank-third)" : "var(--text-dim)");

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "44px 1.6fr 1fr 60px 60px 60px 70px 70px",
          padding: "0 14px 8px",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          color: "var(--text-muted)",
          letterSpacing: "0.05em",
        }}
      >
        <span>RK</span>
        <span>PLAYER</span>
        <span>TEAM</span>
        <span style={{ textAlign: "right" }}>K</span>
        <span style={{ textAlign: "right" }}>D</span>
        <span style={{ textAlign: "right" }}>A</span>
        <span style={{ textAlign: "right" }}>KDA</span>
        <span style={{ textAlign: "right" }}>SCORE</span>
      </div>
      <Divider />
      {rows.map((r, i) => (
        <div
          key={r.player + i}
          style={{
            display: "grid",
            gridTemplateColumns: "44px 1.6fr 1fr 60px 60px 60px 70px 70px",
            alignItems: "center",
            padding: "12px 14px",
            background: i < 3 ? "var(--panel-raised)" : "transparent",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 18,
              fontWeight: 700,
              color: rankColor(i),
            }}
          >
            {String(i + 1).padStart(2, "0")}
          </span>
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 600 }}>{r.player}</span>
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "var(--text-muted)" }}>
            {teamName(r.teamId)}
          </span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, textAlign: "right" }}>
            {r.kills}
          </span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, textAlign: "right" }}>
            {r.deaths}
          </span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, textAlign: "right" }}>
            {r.assists}
          </span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, textAlign: "right", color: "var(--accent-secondary)" }}>
            {kda(r.kills, r.deaths, r.assists)}
          </span>
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 13,
              textAlign: "right",
              color: "var(--accent)",
              fontWeight: 700,
            }}
          >
            {r.score}
          </span>
        </div>
      ))}
    </div>
  );
}

