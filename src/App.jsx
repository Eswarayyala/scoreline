import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
import { db, auth, realtimeDb, signInWithGoogle, completeGoogleSignInReturn, signInWithGrindInfoId, syncPrivateHandleLookup } from "./firebase";
import PlatformHome from "./components/layout/PlatformHome";
import HubSections from "./components/layout/HubSections";
import PublicNav from "./components/layout/PublicNav";
import SectionBackHome from "./components/layout/SectionBackHome";
import TournamentOpsRail from "./components/layout/TournamentOpsRail";
import VaultDetailPage from "./components/vault/VaultDetailPage";
import VaultLibraryPage from "./components/vault/VaultLibraryPage";
import TournamentWindowCard from "./components/vault/TournamentWindowCard";
import CompetitorDossierPage from "./components/vault/CompetitorDossierPage";
import CompetitorDirectoryPage from "./components/vault/CompetitorDirectoryPage";
import EwcDirectoryPage from "./components/vault/EwcDirectoryPage";
import PreEwcHistoryPage from "./components/vault/PreEwcHistoryPage";
import { useVaultBookmarks } from "./hooks/useVaultBookmarks";
import VaultResearchDesk from "./components/cms/VaultResearchDesk";
import { avatarForGamer, bannerForGame, flyerForEvent, flyersForGame, isStockBannerUrl } from "./data/platformShowcase";
import { readImageFile } from "./lib/readImageFile";
import CircuitCmsDesk from "./components/cms/CircuitCmsDesk";
import FloatingWindowsDesk from "./components/cms/FloatingWindowsDesk";
import SupportChangeQueue from "./components/cms/SupportChangeQueue";
import SupportAccessDesk from "./components/cms/SupportAccessDesk";
import StaffDeskGate from "./components/cms/StaffDeskGate";
import { useCircuitCms } from "./hooks/useCircuitCms";
import { useStaffChangeRequests } from "./hooks/useStaffChangeRequests";
import { deskGateDocPath, hashDeskPassword, hashFieldForRole } from "./lib/deskGate";
import { assembleFloatingSlides, buildFeaturedWindows, floatingPolicyFromRecords, mergeEwcWindows } from "./data/floatingWindows";
import { useEsportsMedia } from "./hooks/useEsportsMedia";
import { fetchGamePoster, mergeVaultMedia } from "./services/esportsMedia";
import { FILTER_GAMES, PUBG_FAMILY_LABEL, canonicalFilterGame, filterGameAliases, gameMatchesFilter, isPubgFamily } from "./data/gameCatalog";
import {
  canSeeScrimInList,
  canViewScrimRoom,
  canViewScrimStats,
  isApprovedRegistrant,
  isInviteOnlyScrim,
  isPublicScrim,
  scrimAccessLabel,
  scrimFlyerBadges,
} from "./data/scrimAccess";
import { buildScrimAnnouncement, DEFAULT_SCRIM_ALERTS, normalizeScrimAlerts } from "./data/scrimAlerts";
import { attendanceCounts, registrationAttendance, scrimRequiresCheckIn } from "./data/scrimAttendance";
import { normalizeSavedSquad, savedSquadReady } from "./data/savedSquad";
import { normalizeNotifyPrefs } from "./data/notifyPrefs";
import ScrimBell from "./components/scrims/ScrimBell";
import ScrimAlertPrefs from "./components/scrims/ScrimAlertPrefs";
import PageNotifyToggle from "./components/prefs/PageNotifyToggle";
import RoomStagesPanel from "./components/scrims/RoomStagesPanel";
import InvitePlayersPanel from "./components/scrims/InvitePlayersPanel";
import HostOrgPanel from "./components/scrims/HostOrgPanel";
import HostProfilePage from "./components/scrims/HostProfilePage";
import PlayerScrimHistory from "./components/scrims/PlayerScrimHistory";
import SpectatorPage from "./components/scrims/SpectatorPage";
import ScrimWindowsGrid from "./components/scrims/ScrimWindowsGrid";
import ScrimTodayStrip from "./components/scrims/ScrimTodayStrip";
import HostVerifyPrompt from "./components/scrims/HostVerifyPrompt";
import {
  buildInternationalTrack,
  evaluateHostVerification,
  hostVerificationRequestMeta,
  hostVerifyGamesNeedingNotify,
} from "./data/hostVerification";
import CommunityDesk from "./components/community/CommunityDesk";
import PageEnter from "./components/motion/PageEnter";
import GamesDirectoryPage from "./components/games/GamesDirectoryPage";
import GameDeskPage from "./components/games/GameDeskPage";
import { buildScrimHistoryEntry } from "./data/scrimHistory";
import { useGameBanner, useMediaArt } from "./hooks/useMediaLibrary";
import BlogGameCover from "./components/blog/BlogGameCover";
import BlogOverlay from "./components/blog/BlogOverlay";
import CollectionPicker from "./components/cms/CollectionPicker";
import AvatarRosterPicker from "./components/cms/AvatarRosterPicker";
import MediaLibraryDesk from "./components/cms/MediaLibraryDesk";
import LiveMatrixDesk from "./components/cms/LiveMatrixDesk";
import LfgNoticeBoard from "./components/ecosystem/LfgNoticeBoard";
import Countdown from "./components/shared/Countdown";
import DynamicPointsTable from "./components/shared/DynamicPointsTable";
import AchievementBadges from "./components/shared/AchievementBadges";
import { BLOG_ANALYSIS_TYPES, analysisTypeLabel, excerptWords, isHttpsUrl } from "./data/blogAnalysis";
import ExpandableBlogBody from "./components/blog/ExpandableBlogBody";
import { POSTER_PRESETS } from "./data/posterPresets";
import { ewcFloatingSlides } from "./data/esportsResearch";
import { EVENT_SCOPES, applyEventToVault, findGameVault, inferEventScope, normalizeGameKey, publicScopeKicker } from "./data/eventScope";
import {
  canManageMediaLibrary,
  isAllowedSupportAction,
  normalizeSupportPermissions,
  supportCanDirectAction,
  supportHas,
} from "./lib/staffAccess";
import { getFunctions, httpsCallable } from "firebase/functions";
import { onValue, ref as databaseRef, onDisconnect, serverTimestamp, set as setDatabaseValue } from "firebase/database";

const ID_SIGN_IN_ENABLED = Boolean(import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY);
const PLAYERS_COLLECTION = collection(db, "players");
const playerDocRef = (uid) => doc(db, "players", uid);
const scrimHistoryDocRef = (uid, tournamentId) => doc(db, "players", uid, "scrimHistory", tournamentId);
const scrimHistoryCollectionRef = (uid) => collection(db, "players", uid, "scrimHistory");

const TOURNAMENTS_COLLECTION = collection(db, "tournaments");
const tournamentDocRef = (id) => doc(db, "tournaments", id);
const teamsCollectionRef = (tid) => collection(db, "tournaments", tid, "teams");
const matchesCollectionRef = (tid) => collection(db, "tournaments", tid, "matches");
const statsCollectionRef = (tid) => collection(db, "tournaments", tid, "stats");
const registrationsCollectionRef = (tid) => collection(db, "tournaments", tid, "registrations");
const lobbyCredentialsRef = (tid) => doc(db, "tournaments", tid, "lobby", "credentials");
const roomsCollectionRef = (tid) => collection(db, "tournaments", tid, "rooms");
const promotionsCollectionRef = (tid) => collection(db, "tournaments", tid, "promotions");
const SCRIM_ANNOUNCEMENTS_COLLECTION = collection(db, "scrimAnnouncements");
const OFFICIAL_HOSTS_COLLECTION = collection(db, "officialHosts");
const HOST_REQUESTS_COLLECTION = collection(db, "hostRequests");
const userPrefsDocRef = (uid) => doc(db, "userPrefs", uid);
const REPORTS_COLLECTION = collection(db, "reports");
const FRIEND_REQUESTS_COLLECTION = collection(db, "friendRequests");
const TOURNAMENT_INVITES_COLLECTION = collection(db, "tournamentInvites");
const CHAT_CONVERSATIONS_COLLECTION = collection(db, "conversations");
const CHAT_MESSAGES_COLLECTION = (conversationId) => collection(db, "conversations", conversationId, "messages");
const CHAT_SEEN_KEY = "grindinfo-chat-seen";

function chatConversationId(uidA, uidB) {
  return [uidA, uidB].sort().join("_");
}

function readChatSeenMap() {
  try {
    const raw = JSON.parse(localStorage.getItem(CHAT_SEEN_KEY) || "{}");
    return raw && typeof raw === "object" ? raw : {};
  } catch {
    return {};
  }
}

function markChatConversationSeen(conversationId, at = Date.now()) {
  if (!conversationId) return readChatSeenMap();
  const prev = readChatSeenMap();
  const next = { ...prev, [conversationId]: Math.max(Number(prev[conversationId]) || 0, Number(at) || Date.now()) };
  try {
    localStorage.setItem(CHAT_SEEN_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
  return next;
}

/** Notification badges — blue fill, orange edge (not site pink). */
const NOTICE_BADGE_STYLE = {
  background: "var(--accent-secondary)",
  color: "#ffffff",
  boxShadow: "0 0 0 2px var(--rank-third)",
};
const ARCHIVE_COLLECTION = collection(db, "esportsArchive");
const BLOG_POSTS_COLLECTION = collection(db, "blogPosts");
const BLOG_PRIVATE_COLLECTION = collection(db, "blogPrivate");
const blogPrivateDocRef = (postId) => doc(db, "blogPrivate", postId);

function blogCreditPublic(post) {
  if (post?.anonymous) return "Anonymous";
  return post?.authorName || "Player";
}

function blogCreditStaff(post, privateMeta) {
  const requester = privateMeta?.requesterName || post?.requesterName || "";
  if (post?.anonymous || privateMeta?.anonymous) {
    return requester ? `Anonymous · requested by ${requester}` : "Anonymous";
  }
  return post?.authorName || requester || "Player";
}
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

function isDummybotAccount(item) {
  const blob = [item?.email, item?.handle, item?.label, item?.displayName, item?.name]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return blob.includes("dummybot");
}

function readKnownAccounts() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KNOWN_ACCOUNTS_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    const cleaned = parsed
      .filter((item) => item && (item.email || item.handle) && !isDummybotAccount(item))
      .slice(0, 8);
    if (cleaned.length !== parsed.length) {
      localStorage.setItem(KNOWN_ACCOUNTS_KEY, JSON.stringify(cleaned));
    }
    return cleaned;
  } catch {
    return [];
  }
}

function rememberKnownAccount(entry) {
  if (!entry?.uid && !entry?.email) return;
  if (isDummybotAccount(entry)) return;
  const current = readKnownAccounts().filter((item) => item.uid !== entry.uid && item.email !== entry.email);
  localStorage.setItem(KNOWN_ACCOUNTS_KEY, JSON.stringify([{ ...entry, seenAt: Date.now() }, ...current].slice(0, 8)));
}

function randomPlayerTag() {
  return String(Math.floor(Math.random() * 10000)).padStart(4, "0");
}

function normalizePlayerTagInput(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 8);
  if (digits.length === 8 && PLAYER_TAG_PATTERN.test(digits)) return digits;
  if (digits.length >= 4) {
    const four = digits.slice(0, 4);
    return PLAYER_TAG_PATTERN.test(four) ? four : "";
  }
  if (digits.length > 0) return digits.padStart(4, "0");
  return "";
}

async function claimUniqueHandle(user, displayName, currentTag = "", preferredTag = "") {
  const name = playerNameFromInput(displayName);
  if (!user?.uid || !isValidPlayerName(name)) throw new Error("Choose a valid player name first.");
  const tryClaim = async (tag) => {
    const handle = `${name.toLowerCase()}#${tag}`;
    // Do not store email on public handle docs (prevents ID→email scraping).
    await setDoc(handleDocRef(handle), { uid: user.uid, handle, createdAt: Date.now() });
    return { tag, handle };
  };
  const claimOrOwn = async (tag) => {
    if (!PLAYER_TAG_PATTERN.test(tag)) throw new Error("Use a 4-digit #code like #0000.");
    const handle = `${name.toLowerCase()}#${tag}`;
    const existing = await getDoc(handleDocRef(handle));
    if (!existing.exists()) return tryClaim(tag);
    if (existing.data()?.uid === user.uid) return { tag, handle };
    throw new Error("That name#code is already taken. Change the digits or the name.");
  };

  const wanted = normalizePlayerTagInput(preferredTag);
  if (wanted && PLAYER_TAG_PATTERN.test(wanted)) return claimOrOwn(wanted);

  if (currentTag && PLAYER_TAG_PATTERN.test(currentTag)) {
    return claimOrOwn(currentTag);
  }

  for (let attempt = 0; attempt < 48; attempt += 1) {
    const tag = randomPlayerTag();
    const handle = `${name.toLowerCase()}#${tag}`;
    const existing = await getDoc(handleDocRef(handle));
    if (existing.exists()) continue;
    try { return await tryClaim(tag); }
    catch { /* another player claimed this ID in the same moment */ }
  }
  throw new Error("Couldn't assign a unique GrindInfo ID. Try different digits or a different name.");
}

function normalizeGameName(game) {
  return canonicalFilterGame(game) || String(game || "").trim();
}

function normalizeGameNames(games = []) {
  return [...new Set(games.map(normalizeGameName).filter(Boolean))];
}

/** Kept for scrim finder server buckets (not player country). */
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

const COUNTRIES = [
  "India",
  "United States",
  "Canada",
  "United Kingdom",
  "Germany",
  "France",
  "Spain",
  "Portugal",
  "Italy",
  "Netherlands",
  "Poland",
  "Sweden",
  "Norway",
  "Denmark",
  "Finland",
  "Russia",
  "Ukraine",
  "Turkey",
  "Brazil",
  "Argentina",
  "Chile",
  "Mexico",
  "Colombia",
  "Peru",
  "Australia",
  "New Zealand",
  "Japan",
  "South Korea",
  "China",
  "Taiwan",
  "Hong Kong",
  "Singapore",
  "Malaysia",
  "Indonesia",
  "Thailand",
  "Vietnam",
  "Philippines",
  "Pakistan",
  "Bangladesh",
  "Nepal",
  "Sri Lanka",
  "UAE",
  "Saudi Arabia",
  "Qatar",
  "Kuwait",
  "Egypt",
  "South Africa",
  "Nigeria",
  "Kenya",
  "Other",
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
  "Entry Fragger",
  "Support",
  "Sniper / Precision",
  "Flex / All-rounder",
  "Casual",
  "Competitive",
];
const LOOKING_FOR = ["Duo", "Squad", "Ranked", "Casual", "Competitive", "Tournament"];
const RANK_BANDS = ["Unranked", "Beginner", "Intermediate", "High rank", "Pro / scrim"];

function normalizeLookingFor(list = []) {
  return [...new Set((Array.isArray(list) ? list : []).filter((item) => LOOKING_FOR.includes(item)))].slice(0, 6);
}

function normalizeStyles(list = [], legacy = "") {
  const fromList = (Array.isArray(list) ? list : []).filter((item) => PLAY_STYLES.includes(item));
  if (fromList.length) return [...new Set(fromList)].slice(0, 8);
  if (legacy && PLAY_STYLES.includes(legacy)) return [legacy];
  return [];
}

function normalizeLanguages(list = [], legacy = "") {
  const fromList = (Array.isArray(list) ? list : []).filter((item) => LANGUAGES.includes(item));
  if (fromList.length) return [...new Set(fromList)].slice(0, 8);
  if (legacy && LANGUAGES.includes(legacy)) return [legacy];
  return [];
}

function normalizeCountry(country) {
  return COUNTRIES.includes(country) ? country : "";
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
  const myStyles = new Set(normalizeStyles(me.styles, me.style));
  const sharedStyles = normalizeStyles(them.styles, them.style).filter((style) => myStyles.has(style));
  const myLangs = new Set(normalizeLanguages(me.languages, me.language));
  const sharedLangs = normalizeLanguages(them.languages, them.language).filter((lang) => myLangs.has(lang));
  const reasons = [];
  let score = 0;
  if (sharedGames.length) {
    score += sharedGames.length * 5;
    reasons.push(`Same game: ${sharedGames.slice(0, 2).join(", ")}`);
  }
  if (me.region && them.region === me.region) {
    score += 4;
    reasons.push("Same country");
  }
  if (sharedLangs.length) {
    score += sharedLangs.length * 3;
    reasons.push(`Same language: ${sharedLangs.slice(0, 2).join(", ")}`);
  }
  if (sharedWants.length) {
    score += sharedWants.length * 2;
    reasons.push(`Also looking for ${sharedWants.slice(0, 2).join(", ")}`);
  }
  if (sharedStyles.length) {
    score += sharedStyles.length * 2;
    reasons.push(`Same style: ${sharedStyles.slice(0, 2).join(", ")}`);
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
  "PUBG / PUBG Mobile": "🎮",
  "PUBG PC": "🎖️",
  PUBG: "🎖️",
  "PUBG Mobile (PMWC)": "🎮",
  "Mobile Legends: Bang Bang": "⚔️",
  "Free Fire": "🔥",
  "Call of Duty": "🎖️",
  "Fortnite": "🪂",
  "Rainbow Six Siege": "🛡️",
  "Honor of Kings": "👑",
  "Clash Royale": "👑",
  "Clash of Clans": "🏰",
  "Brawl Stars": "⭐",
  "StarCraft 2": "🚀",
  "Teamfight Tactics": "♟️",
  "Other": "🎮",
};
const QUICK_PICK_GAMES = ["Valorant", PUBG_FAMILY_LABEL, "Apex Legends"];
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

function GameIcon({ game, size = 30, src }) {
  const { covers } = useMediaArt();
  const banner = useGameBanner(game, bannerForGame(game));
  const live = src || covers?.[game]?.avatar || banner;
  return (
    <span
      aria-hidden="true"
      className="inline-grid shrink-0 overflow-hidden rounded-md border border-white/10"
      style={{ width: size, height: size }}
    >
      <img src={live} alt="" className="aspect-square h-full w-full object-cover" />
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
  const accountChoices = knownAccounts.filter((item, index, list) => {
    if (isDummybotAccount(item)) return false;
    const key = String(item.email || item.handle || item.label || "").toLowerCase();
    if (!key) return false;
    return list.findIndex((other) => String(other.email || other.handle || other.label || "").toLowerCase() === key) === index;
  });

  const submit = (e) => {
    e.preventDefault();
    if (mode === "signup" && !isValidPlayerName(name)) return;
    onEmailAuth(mode, { name: playerNameFromInput(name), email: mode === "signup" ? email : identifier, password });
  };

  return (
    <div role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !requireChoice) onClose(); }} style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", justifyContent: requireChoice ? "center" : "flex-end", alignItems: requireChoice ? "center" : "flex-start", padding: requireChoice ? 20 : "82px max(16px, calc((100vw - 980px) / 2)) 16px", background: requireChoice ? "var(--page-bg-solid)" : "transparent", pointerEvents: requireChoice ? "auto" : "none", fontFamily: "'Inter', sans-serif" }}>
      <style>{`@keyframes gi-auth-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}@media(prefers-reduced-motion:reduce){.gi-auth-panel{animation:none!important}}`}</style>
      <div role="dialog" aria-modal={requireChoice ? "true" : "false"} aria-label="Sign in to GrindInfo" onMouseDown={(event) => event.stopPropagation()} className="gi-auth-panel" style={{ width: "min(380px, 100%)", maxHeight: "calc(100vh - 100px)", overflowY: "auto", padding: 20, color: "var(--page-text)", background: "var(--panel-bg)", border: "1px solid var(--border-strong)", boxShadow: "var(--panel-shadow)", pointerEvents: "auto", animation: "gi-auth-in 320ms cubic-bezier(0.22,1,0.36,1) both" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: "var(--page-text)", letterSpacing: "0.04em" }}>GRINDINFO</div>
            <Eyebrow color="var(--accent-secondary)">Sign in for player features</Eyebrow>
          </div>
          {!requireChoice && <button type="button" aria-label="Close sign in" onClick={onClose} style={{ background: "none", border: 0, color: "var(--text-muted)", fontSize: 22, cursor: "pointer" }}>×</button>}
        </div>

        <div style={{ color: "var(--text-muted)", fontSize: 12, lineHeight: 1.5, marginBottom: 12 }}>Continue with Google for your main account, or use email and password below. Only one account is signed in at a time.</div>

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
              <TextInput value={name} onChange={(e) => setName(e.target.value.replace(/#.*/, "").replace(/[^A-Za-z0-9_]/g, "").slice(0, 16))} placeholder="name" maxLength={16} required />
            </Field>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: "var(--accent-secondary)", marginTop: -6 }}>
              {grindHandle(playerNameFromInput(name) || "name", "0000")}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Format is name#0000. Type only the name here. A random 4-digit code is generated in your profile setup — you can edit those digits anytime.</div>
            {name && !isValidPlayerName(name) && <div role="alert" style={{ fontSize: 12, color: "var(--danger)" }}>Use 3–16 letters, numbers, or underscore. Do not type the #code yourself.</div>}
            </>
          )}
          {mode === "signup" ? (
            <Field label="Email">
              <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
            </Field>
          ) : (
            <>
            <Field label={ID_SIGN_IN_ENABLED ? "GrindInfo ID or account email" : "Account email"}>
              <TextInput value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder={ID_SIGN_IN_ENABLED ? "name#1234 or you@email.com" : "you@email.com"} autoComplete="username" required />
            </Field>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: -6 }}>{ID_SIGN_IN_ENABLED ? "Email/password accounts can use their GrindInfo ID. Sign in with email once to link an existing ID. Main Google accounts should Continue with Google." : "GrindInfo ID sign-in will appear after App Check and the matching Cloud Functions are configured. Main Google accounts should Continue with Google."}</div>
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

function MultiToggle({ options, selected, onToggle, initialVisible = 8, pageSize = 8 }) {
  const floor = Math.max(1, Number(initialVisible) || 8);
  const step = Math.max(6, Math.min(9, Number(pageSize) || floor));
  const [visibleCount, setVisibleCount] = useState(floor);
  const head = options.slice(0, visibleCount);
  const extras = options.filter((opt) => selected.includes(opt) && !head.includes(opt));
  const visible = [...head, ...extras];
  const remaining = Math.max(0, options.length - visibleCount);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
      {visible.map((opt) => {
        const active = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              fontWeight: 500,
              padding: "5px 9px",
              border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
              background: active ? "rgba(255,45,149,0.12)" : "transparent",
              color: active ? "var(--accent)" : "var(--text-muted)",
              cursor: "pointer",
            }}
          >
            {opt}
          </button>
        );
      })}
      {remaining > 0 && (
        <button
          type="button"
          onClick={() => setVisibleCount((current) => Math.min(options.length, current + step))}
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            padding: "5px 8px",
            border: "none",
            background: "transparent",
            color: "var(--accent-secondary)",
            cursor: "pointer",
          }}
        >
          More
        </button>
      )}
      {visibleCount > floor && (
        <button
          type="button"
          onClick={() => setVisibleCount(floor)}
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            padding: "5px 8px",
            border: "none",
            background: "transparent",
            color: "var(--text-muted)",
            cursor: "pointer",
          }}
        >
          Less
        </button>
      )}
    </div>
  );
}

function ProfileModal({ initialProfile, defaultDisplayName, onSave, onSkip, onClose, gamesList = FILTER_GAMES, initialTab = "profile" }) {
  const [tab, setTab] = useState(initialTab === "account" ? "account" : "profile");
  const [displayName, setDisplayName] = useState(safeProfileName(initialProfile?.displayName, defaultDisplayName));
  const [games, setGames] = useState(normalizeGameNames(initialProfile?.games || []));
  const [region, setRegion] = useState(normalizeCountry(initialProfile?.region) || initialProfile?.region || "");
  const [languages, setLanguages] = useState(normalizeLanguages(initialProfile?.languages, initialProfile?.language));
  const [styles, setStyles] = useState(normalizeStyles(initialProfile?.styles, initialProfile?.style));
  const [lookingFor, setLookingFor] = useState(normalizeLookingFor(initialProfile?.lookingFor));
  const [rank, setRank] = useState(normalizeRank(initialProfile?.rank));
  const [bio, setBio] = useState(initialProfile?.bio || "");
  const [discordHandle, setDiscordHandle] = useState(initialProfile?.discordHandle || "");
  const [avatar, setAvatar] = useState(initialProfile?.avatar || "🎮");
  const [discoverable, setDiscoverable] = useState(initialProfile?.discoverable === true);
  const [notifyScrims, setNotifyScrims] = useState(true);
  const [playerTag, setPlayerTag] = useState(() => initialProfile?.playerTag || randomPlayerTag());
  const [error, setError] = useState("");
  const usernameChanges = Number(initialProfile?.usernameChanges || 0);
  const nameLocked = Boolean(initialProfile?.playerTag) && usernameChanges >= 1;
  const previewTag = normalizePlayerTagInput(playerTag) || playerTag || "0000";

  const toggleGame = (g) => {
    setGames((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  };
  const toggleIn = (setter) => (value) => {
    setter((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
  };

  const submit = () => {
    const name = playerNameFromInput(displayName);
    if (!isValidPlayerName(name) || isEmailLike(name)) {
      setError("Use 3–16 letters, numbers, or underscore. Your public ID looks like name#0000.");
      return;
    }
    if (nameLocked) {
      setError("Username was already changed once and is locked.");
      return;
    }
    const nextLanguages = normalizeLanguages(languages);
    const nextStyles = normalizeStyles(styles);
    const country = normalizeCountry(region) || String(region || "").trim();
    if (games.length === 0 || !country || !nextLanguages.length) {
      setError("Pick at least one game, a country, and a language");
      return;
    }
    const tag = normalizePlayerTagInput(playerTag);
    if (!PLAYER_TAG_PATTERN.test(tag)) {
      setError("Use a 4-digit code like 0000, or tap Randomize.");
      return;
    }
    onSave({
      displayName: name,
      playerTag: tag,
      games,
      region: country.slice(0, 60),
      languages: nextLanguages,
      language: nextLanguages[0] || "",
      styles: nextStyles,
      style: nextStyles[0] || "",
      lookingFor: normalizeLookingFor(lookingFor),
      rank: normalizeRank(rank),
      bio: bio.trim(),
      discordHandle: String(discordHandle || "").trim().slice(0, 40),
      avatar,
      discoverable,
      notifyScrims: notifyScrims === true,
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
        <Eyebrow>Account</Eyebrow>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, margin: "4px 0 6px" }}>
          {tab === "account" ? "Account info" : "Set up your player profile"}
        </div>
        <div style={{ display: "flex", gap: 8, margin: "10px 0 16px", flexWrap: "wrap" }}>
          <Button variant={tab === "profile" ? "primary" : "ghost"} onClick={() => setTab("profile")}>Profile</Button>
          <Button variant={tab === "account" ? "primary" : "ghost"} onClick={() => setTab("account")}>Account info</Button>
        </div>
        {tab === "profile" ? (
          <>
        <div style={{ color: "var(--accent-secondary)", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, marginTop: 0 }}>Your GrindInfo ID: {grindHandle(displayName || "name", previewTag)}</div>
        <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>
          IDs use the name#0000 format. Your profile stays out of player search unless you choose to be discoverable. You can change the username once after it is assigned.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ background: "var(--panel-raised)", border: "1px solid var(--border)", padding: 14 }}>
            <Eyebrow>Profile ideas</Eyebrow>
            <div style={{ fontSize: 13, color: "var(--text-muted)", margin: "6px 0 10px" }}>
              Pick a library avatar for your GrindInfo ID, or use a quick emoji. Browse every game&apos;s Avatar pack — not only the games you play.
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <span
                aria-hidden="true"
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  overflow: "hidden",
                  border: "1px solid var(--border)",
                  display: "inline-grid",
                  placeItems: "center",
                  fontSize: 24,
                  background: "var(--panel-bg)",
                }}
              >
                {/^https?:\/\//i.test(avatar) || String(avatar).startsWith("/media/") || String(avatar).startsWith("data:image/")
                  ? <img src={avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : avatar}
              </span>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>This shows on your player ID and teammate search.</div>
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
            <div style={{ marginBottom: 12 }}>
              <AvatarRosterPicker
                value={avatar}
                onSelect={setAvatar}
                heading="Library avatars · all games"
              />
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
            <TextInput
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value.replace(/#.*/, "").replace(/[^A-Za-z0-9_]/g, "").slice(0, 16))}
              maxLength={16}
              placeholder="name"
              disabled={nameLocked}
            />
          </Field>
          <Field label="# code">
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-muted)" }}>#</span>
              <TextInput
                value={playerTag}
                onChange={(e) => setPlayerTag(e.target.value.replace(/\D/g, "").slice(0, 4))}
                maxLength={4}
                inputMode="numeric"
                pattern="[0-9]{4}"
                placeholder="0000"
                aria-label="Four digit player code"
                style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.12em", maxWidth: 120 }}
              />
              <Button type="button" variant="ghost" onClick={() => setPlayerTag(randomPlayerTag())}>
                Randomize
              </Button>
            </div>
          </Field>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: "var(--accent-secondary)", marginTop: -8 }}>
            {grindHandle(playerNameFromInput(displayName) || "name", previewTag)}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {nameLocked
              ? "Username is locked — it can only be changed once. You can still change the # digits."
              : initialProfile?.playerTag
                ? "You can change the username once. Edit or randomize the # digits anytime if that name#code is free."
                : "If you leave the digits blank we assign a random #0000-style code. You can edit them before saving."}
          </div>
          <Field label="Games you play">
            <MultiToggle options={gamesList} selected={games} onToggle={toggleGame} initialVisible={8} pageSize={8} />
          </Field>
          <label style={{ display: "flex", alignItems: "flex-start", gap: 10, color: "var(--page-text)", fontSize: 13 }}>
            <input
              type="checkbox"
              checked={notifyScrims}
              onChange={(e) => setNotifyScrims(e.target.checked)}
              style={{ marginTop: 2, accentColor: "var(--accent-secondary)" }}
            />
            <span>
              <strong>Notify me when new scrims publish for my games</strong>
              <span style={{ display: "block", color: "var(--text-muted)", marginTop: 3 }}>
                In-app flyer alerts for the titles you picked above. You can change this anytime on Scrims.
              </span>
            </span>
          </label>
          <Field label="Country">
            <Select value={region} onChange={(e) => setRegion(e.target.value)}>
              <option value="">Select…</option>
              {COUNTRIES.map((country) => (
                <option key={country} value={country}>{country}</option>
              ))}
            </Select>
          </Field>
          <Field label="Languages">
            <MultiToggle options={LANGUAGES} selected={languages} onToggle={toggleIn(setLanguages)} initialVisible={8} />
          </Field>
          <Field label="Playing styles (optional)">
            <MultiToggle options={PLAY_STYLES} selected={styles} onToggle={toggleIn(setStyles)} initialVisible={8} />
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
          <Field label="Discord sync (optional)">
            <TextInput
              value={discordHandle}
              maxLength={40}
              onChange={(e) => setDiscordHandle(e.target.value)}
              placeholder="username or name#0000"
            />
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
          </>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ padding: 14, background: "var(--panel-raised)", border: "1px solid var(--border)" }}>
              <Eyebrow>Queries and support</Eyebrow>
              <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.55 }}>
                Questions about accounts, scrims, host badges, or safety reports — email the GrindInfo desk.
              </p>
              <a
                href="mailto:eswar@grindinfo.xyz?subject=GrindInfo%20support%20query"
                style={{ display: "inline-block", marginTop: 12, color: "var(--accent-secondary)", fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}
              >
                eswar@grindinfo.xyz
              </a>
            </div>
            <div style={{ padding: 14, background: "var(--panel-raised)", border: "1px solid var(--border)" }}>
              <Eyebrow>Your history</Eyebrow>
              <p style={{ margin: "8px 0 12px", fontSize: 13, color: "var(--text-muted)" }}>
                Review scrims you joined and follow official hosts from your circuit.
              </p>
              <Link to="/me/history" onClick={onClose} style={{ textDecoration: "none" }}>
                <Button variant="ghost">Open scrim history</Button>
              </Link>
            </div>
            <div style={{ padding: 14, background: "var(--panel-raised)", border: "1px solid var(--border)" }}>
              <Eyebrow>Community desk</Eyebrow>
              <p style={{ margin: "8px 0 12px", fontSize: 13, color: "var(--text-muted)" }}>
                Friends, followed hosts, flyer feed, and host badge requests live here — not on the Scrims grid.
              </p>
              <Link to="/desk" onClick={onClose} style={{ textDecoration: "none" }}>
                <Button variant="ghost">Open community desk</Button>
              </Link>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
              <Button variant="ghost" onClick={onClose}>Close</Button>
            </div>
          </div>
        )}
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
        {[player.region, ...(normalizeLanguages(player.languages, player.language).slice(0, 3)), player.rank].filter(Boolean).join(" · ")}
      </div>
      {normalizeStyles(player.styles, player.style).length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
          {normalizeStyles(player.styles, player.style).map((style) => (
            <span key={style} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, padding: "3px 8px", border: "1px solid var(--border)", color: "var(--page-text)" }}>{style}</span>
          ))}
        </div>
      )}
      {normalizeLookingFor(player.lookingFor).length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
          {normalizeLookingFor(player.lookingFor).map((want) => (
            <span key={want} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, padding: "3px 8px", border: "1px solid var(--border)", color: "var(--page-text)" }}>{want}</span>
          ))}
        </div>
      )}
      <AchievementBadges player={player} />
      {matchReasons.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
          {matchReasons.map((reason) => (
            <span key={reason} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, padding: "3px 8px", background: "var(--panel-raised)", color: "var(--accent-secondary)" }}>{reason}</span>
          ))}
        </div>
      )}
      {player.discordHandle && (
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--accent-secondary)", marginTop: 8 }}>
          Discord · {player.discordHandle}
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
  return { games: [], region: "", languages: [], styles: [], lookingFor: [], rank: "", name: "" };
}

function playerSearchActive(search) {
  if (!search) return false;
  const tag = extractPlayerTag(search.name);
  return Boolean(
    search.games.length
    || search.region
    || search.languages?.length
    || search.styles?.length
    || search.lookingFor.length
    || search.rank
    || (search.name.includes("#") && PLAYER_TAG_PATTERN.test(tag))
    || search.name.trim().length >= 2
  );
}

function FindPlayersPage({ currentUid, myProfile, friendRequests = [], onFriendRequest, onFriendDecision, onReport, onEditProfile, embedded = false, gamesList = FILTER_GAMES, notifyEnabled = true, onNotifyChange = null }) {
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
      languages: normalizeLanguages(myProfile?.languages, myProfile?.language),
      styles: normalizeStyles(myProfile?.styles, myProfile?.style),
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
          isPubgFamily(game) ? filterGameAliases(game) : [game],
        );
        filters.push(where("games", "array-contains-any", [...new Set(queryGames)].slice(0, 10)));
      }
      if (applied.region) filters.push(where("region", "==", applied.region));
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
      && !isDummybotAccount(p)
      && playerMatchesQuery(p, applied?.name || "")
      && (exactId
        || ((!applied?.styles?.length || normalizeStyles(p.styles, p.style).some((style) => applied.styles.includes(style)))
          && (!applied?.languages?.length || normalizeLanguages(p.languages, p.language).some((lang) => applied.languages.includes(lang)))
          && (!applied?.rank || p.rank === applied.rank)
          && (!applied?.lookingFor?.length || normalizeLookingFor(p.lookingFor).some((want) => applied.lookingFor.includes(want))))))
    .map((p) => ({ ...p, ...similarityMatch(myProfile, p) }))
    .sort((a, b) => b.score - a.score || String(a.displayName || "").localeCompare(String(b.displayName || "")));

  return (
    <PageEnter>
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
          {!embedded && <SectionBackHome />}
          {!embedded && <Eyebrow>Squad up</Eyebrow>}
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: embedded ? 28 : 44, margin: "4px 0 0" }}>{embedded ? "Find players" : "Find similar players"}</h1>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {currentUid && onNotifyChange ? <PageNotifyToggle enabled={notifyEnabled} onChange={onNotifyChange} label="Friends" /> : null}
          {onEditProfile && <Button variant="ghost" onClick={onEditProfile}>{myProfile ? "Edit my profile" : "Set up my profile"}</Button>}
        </div>
      </div>

      <LfgNoticeBoard profile={myProfile} gamesList={gamesList} />
      {myProfile && <div style={{ marginBottom: 10 }}><AchievementBadges player={myProfile} /></div>}

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
                initialVisible={9}
                pageSize={9}
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
          <div style={{ minWidth: 180 }}>
            <Select aria-label="Country" value={draft.region} onChange={(e) => updateDraft({ region: e.target.value })}>
              <option value="">All countries</option>
              {COUNTRIES.map((country) => (
                <option key={country} value={country}>{country}</option>
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
            <Field label="Languages (optional)">
              <MultiToggle
                options={LANGUAGES}
                selected={draft.languages}
                initialVisible={8}
                onToggle={(lang) => updateDraft({ languages: draft.languages.includes(lang) ? draft.languages.filter((item) => item !== lang) : [...draft.languages, lang] })}
              />
            </Field>
          </div>
          <div style={{ width: "100%" }}>
            <Field label="Playing styles (optional)">
              <MultiToggle
                options={PLAY_STYLES}
                selected={draft.styles}
                initialVisible={8}
                onToggle={(style) => updateDraft({ styles: draft.styles.includes(style) ? draft.styles.filter((item) => item !== style) : [...draft.styles, style] })}
              />
            </Field>
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
    </PageEnter>
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

function RegistrationPanel({
  tournament,
  requests,
  currentUserId,
  currentUserName,
  isAdmin,
  onRequest,
  onDecision,
  onCheckIn,
  onMarkAttendance,
  onSaveRoster,
  disclaimer,
  onDisclaimerVisibilityChange,
  onSignIn,
  friends = [],
  savedSquad = { name: "My squad", memberIds: [] },
}) {
  const [showJoinDisclaimer, setShowJoinDisclaimer] = useState(false);
  const mine = requests.find((request) => request.playerId === currentUserId);
  const pending = requests.filter((request) => request.status === "pending");
  const approved = requests.filter((request) => request.status === "approved");
  const counts = attendanceCounts(requests);
  const needCheckIn = scrimRequiresCheckIn(tournament);
  const [entryType, setEntryType] = useState("solo");
  const [squadMateIds, setSquadMateIds] = useState([]);
  const openJoin = tournament.joinMode === "open" && tournament.requireRequest !== true;
  const inviteOnly = isInviteOnlyScrim(tournament);
  const full = isTournamentFull(tournament, requests);
  const joiningOpen = tournament.registrationOpen !== false && !isTournamentArchived(tournament) && !full;
  const slotLabel = Number(tournament.maxSlots) > 0 ? `${approved.length}/${tournament.maxSlots} ${isCustomRoomEvent(tournament) ? "players" : "slots"}` : `${approved.length} joined`;
  const rosterReady = savedSquadReady(savedSquad, currentUserId);
  const toggleMate = (uid) => {
    setSquadMateIds((list) => (list.includes(uid) ? list.filter((id) => id !== uid) : [...list, uid].slice(0, 7)));
  };
  const submitJoin = () => {
    const useRoster = entryType === "roster";
    onRequest({
      playerId: currentUserId,
      displayName: currentUserName,
      entryType: useRoster ? "roster" : entryType,
      squadMemberIds: useRoster ? (savedSquad.memberIds || []) : (entryType === "squad" ? squadMateIds : []),
      rosterName: useRoster ? savedSquad.name : "",
    });
  };
  const mineAttendance = registrationAttendance(mine);
  return (
    <section style={{ marginTop: isAdmin ? 0 : 20, padding: isAdmin ? 0 : 16, background: isAdmin ? "transparent" : "var(--panel-bg)", border: isAdmin ? "none" : "1px solid var(--border)" }}>
      {isAdmin ? (
        <Eyebrow>{openJoin ? "Public registration" : inviteOnly ? "Invite only" : "Private · request to join"} · {slotLabel} · {counts.checkedIn} checked in · {counts.noShow} no-show</Eyebrow>
      ) : (
        <Eyebrow>{mine ? `Your place · ${mine.status}${mineAttendance !== "pending" ? ` · ${mineAttendance.replace("_", " ")}` : ""}` : joiningOpen ? (openJoin ? "Enter this public scrim" : inviteOnly ? "Invite-only scrim" : "Request this private scrim") : "Registration"}</Eyebrow>
      )}
      <div style={{ fontSize: 13, color: "var(--text-muted)", margin: "8px 0 12px" }}>
        {full ? "This scrim is full." : mine ? `Your request is ${mine.status}${mine.entryType === "squad" || mine.entryType === "roster" ? ` · ${mine.entryType}` : ""}.${needCheckIn && mine.status === "approved" && mineAttendance === "pending" ? " Check in to unlock room codes." : ""}` : currentUserId
          ? (isAdmin
            ? (openJoin ? "Public join — free seats auto-approve. Mark no-shows after the lobby opens." : inviteOnly ? "Invite only — players you invite can request a place." : "Private — players request a place. Room ID stays hidden until approve + check-in.")
            : (openJoin ? "Public scrim. Join solo, as a squad, or with your saved roster." : inviteOnly ? "Invite-only. Accept your invite, then request a place." : "Private scrim. Register and wait for approval."))
          : "Sign in to take a place in this scrim."}
      </div>
      {!currentUserId && joiningOpen && <Button onClick={onSignIn}>Sign in to join</Button>}
      {currentUserId && !isAdmin && mine?.status === "approved" && needCheckIn && mineAttendance === "pending" && (
        <div style={{ marginBottom: 12 }}>
          <Button onClick={() => onCheckIn?.(tournament.id)}>I'm here — check in</Button>
        </div>
      )}
      {currentUserId && !isAdmin && !mine && joiningOpen && (
        <div style={{ display: "grid", gap: 10, maxWidth: 420 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button variant={entryType === "solo" ? "primary" : "ghost"} onClick={() => setEntryType("solo")}>Join solo</Button>
            <Button variant={entryType === "squad" ? "primary" : "ghost"} onClick={() => setEntryType("squad")}>Join as squad</Button>
            <Button variant={entryType === "roster" ? "primary" : "ghost"} onClick={() => setEntryType("roster")} disabled={!rosterReady}>
              Saved roster
            </Button>
          </div>
          {entryType === "roster" && (
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {rosterReady
                ? `Joining as ${savedSquad.name} with ${(savedSquad.memberIds || []).length} mate(s).`
                : "Save a roster from friends first (pick mates as squad, then Save roster)."}
            </div>
          )}
          {entryType === "squad" && (
            <div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 6 }}>
                Squad mates from friends ({squadMateIds.length}/7)
              </div>
              {friends.length === 0 ? (
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Add friends first, then pick them here. All squad members must be GrindInfo players.</div>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {friends.map((friend) => (
                    <button
                      key={friend.uid}
                      type="button"
                      onClick={() => toggleMate(friend.uid)}
                      style={{
                        border: squadMateIds.includes(friend.uid) ? "1px solid var(--accent)" : "1px solid var(--border)",
                        background: "transparent",
                        color: squadMateIds.includes(friend.uid) ? "var(--accent)" : "var(--text-muted)",
                        padding: "4px 8px",
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 10,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        cursor: "pointer",
                      }}
                    >
                      {friend.name}{friend.playerTag ? ` #${friend.playerTag}` : ""}
                    </button>
                  ))}
                </div>
              )}
              {squadMateIds.length > 0 && onSaveRoster ? (
                <Button variant="ghost" onClick={() => onSaveRoster({ name: savedSquad.name || "My squad", memberIds: squadMateIds })}>
                  Save as roster
                </Button>
              ) : null}
            </div>
          )}
          <Button onClick={() => { setShowJoinDisclaimer(true); onDisclaimerVisibilityChange(true); }}>
            {openJoin
              ? (entryType === "roster" ? "Take seats with roster" : entryType === "squad" ? "Take free seats as squad" : "Take a free seat")
              : "Request to join"}
          </Button>
        </div>
      )}
      {!isAdmin && !joiningOpen && !mine && <div style={{ color: "var(--text-dim)", fontSize: 12 }}>{full ? "No places left." : "Registration is closed."}</div>}
      {isAdmin && (
        <div style={{ display: "grid", gap: 8 }}>
          {pending.length === 0 ? <div style={{ fontSize: 13, color: "var(--text-dim)" }}>No requests waiting.</div> : pending.map((request) => (
            <div key={request.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", borderTop: "1px solid var(--border)", paddingTop: 9 }}>
              <span>{request.displayName || "Player"}{request.entryType === "squad" || request.entryType === "roster" ? ` · ${request.entryType}${request.rosterName ? ` · ${request.rosterName}` : ""} (${(request.squadMemberIds || []).length})` : ""}</span>
              <span style={{ display: "flex", gap: 6 }}><Button onClick={() => onDecision(request.id, "approved")}>Approve</Button><Button variant="danger" onClick={() => onDecision(request.id, "declined")}>Decline</Button></span>
            </div>
          ))}
          {approved.length > 0 && (
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10, marginTop: 4, display: "grid", gap: 8 }}>
              {approved.map((request) => {
                const att = registrationAttendance(request);
                return (
                  <div key={request.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", fontSize: 12 }}>
                    <span>{request.displayName || "Player"} · {att.replace("_", " ")}</span>
                    <span style={{ display: "flex", gap: 6 }}>
                      {att !== "checked_in" ? <Button variant="ghost" onClick={() => onMarkAttendance?.(request.id, "checked_in")}>Check in</Button> : null}
                      {att !== "no_show" ? <Button variant="danger" onClick={() => onMarkAttendance?.(request.id, "no_show")}>No-show</Button> : null}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      {showJoinDisclaimer && <div role="dialog" aria-modal="true" aria-labelledby="join-disclaimer-title" style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(0,0,0,.72)", display: "grid", placeItems: "center", padding: 18 }}>
        <section style={{ width: "min(100%, 480px)", padding: 22, background: "var(--panel-bg)", color: "var(--page-text)", border: "1px solid var(--border-strong)", boxShadow: "var(--panel-shadow)" }}>
          <Eyebrow color="var(--danger)">Before you request</Eyebrow>
          <h2 id="join-disclaimer-title" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, margin: "6px 0" }}>{disclaimer?.title || "Scrim safety disclaimer"}</h2>
          <p style={{ color: "var(--text-muted)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{disclaimer?.message || "Join only scrims hosted by people you trust. Verify the details directly with the host, never send money or account credentials, and report suspicious activity. GrindInfo cannot guarantee a host's conduct."}</p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button variant="ghost" onClick={() => { setShowJoinDisclaimer(false); onDisclaimerVisibilityChange(false); }}>Cancel</Button>
            <Button onClick={() => { setShowJoinDisclaimer(false); onDisclaimerVisibilityChange(false); submitJoin(); }}>{openJoin ? "Join this scrim" : "Continue to request"}</Button>
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
      <Eyebrow>Live lobby</Eyebrow>
      {posted ? (
        <>
          <div style={{ color: "var(--text-muted)", fontSize: 12, margin: "7px 0 12px" }}>Host posted the custom room. One-click copy into the game.</div>
          <div style={{ display: "grid", gap: 10, maxWidth: 420 }}>
            <Button
              onClick={() => copyValue(`Room ID: ${lobby.roomId}\nPassword: ${lobby.roomPassword}`, "both")}
            >
              {copied === "both" ? "Copied room + password" : "One-click copy room + password"}
            </Button>
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

function FriendRequestCenter({ requests, currentUserId, onDecision, compact = false }) {
  const incoming = requests.filter((request) => request.recipientId === currentUserId && request.status === "pending");
  const sent = requests.filter((request) => request.requesterId === currentUserId);
  return (
    <div style={{ paddingTop: compact ? 0 : 34 }}>
      <Eyebrow>Player connections</Eyebrow>
      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "4px 0 18px" }}>
        <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: compact ? 32 : 42, margin: 0 }}>Friend requests</h1>
        {incoming.length > 0 ? (
          <span
            aria-label={`${incoming.length} pending`}
            style={{
              minWidth: 22,
              height: 22,
              padding: "0 7px",
              borderRadius: 999,
              display: "inline-grid",
              placeItems: "center",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              fontWeight: 700,
              ...NOTICE_BADGE_STYLE,
            }}
          >
            {incoming.length > 9 ? "9+" : incoming.length}
          </span>
        ) : null}
      </div>
      {incoming.length === 0 ? (
        <div style={{ color: "var(--text-muted)", marginBottom: 18 }}>No pending requests to review.</div>
      ) : (
        <div style={{ display: "grid", gap: 10, marginBottom: 20 }}>
          {incoming.map((request) => (
            <div
              key={request.id}
              style={{
                padding: 14,
                background: "var(--panel-bg)",
                border: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                flexWrap: "wrap",
                boxShadow: "inset 3px 0 0 var(--accent-secondary)",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <img
                  src={avatarForGamer({ displayName: request.requesterName, uid: request.requesterId })}
                  alt=""
                  className="aspect-square h-9 w-9 shrink-0 rounded-full object-cover"
                />
                <span>
                  <strong style={{ display: "block" }}>{request.requesterName || "Player"}</strong>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>wants to connect</span>
                </span>
              </span>
              <span style={{ display: "flex", gap: 6 }}>
                <Button onClick={() => onDecision(request.id, "accepted")}>Accept</Button>
                <Button variant="danger" onClick={() => onDecision(request.id, "declined")}>Decline</Button>
              </span>
            </div>
          ))}
        </div>
      )}
      {sent.length > 0 && (
        <div>
          <Eyebrow>Requests you sent</Eyebrow>
          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            {sent.map((request) => (
              <div key={request.id} style={{ padding: 12, background: "var(--panel-bg)", border: "1px solid var(--border)", fontSize: 13 }}>
                {request.recipientName || "Player"} · {request.status}
              </div>
            ))}
          </div>
        </div>
      )}
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}><span style={{ display: "flex", alignItems: "center", gap: 8 }}><img src={avatarForGamer({ displayName: friend.name, uid: friend.uid })} alt="" className="aspect-square h-7 w-7 rounded-full object-cover" /><span aria-label={presence[friend.uid] || "offline"} title={presence[friend.uid] || (presenceDb ? "offline" : "Online status needs Realtime Database setup")} style={{ width: 8, height: 8, borderRadius: "50%", background: presence[friend.uid] === "online" ? "var(--success)" : "var(--text-dim)" }} />{friend.name}{mutedIds.has(friend.uid) ? <span style={{ fontSize: 10, color: "var(--text-dim)" }}>muted</span> : null}</span><button type="button" onClick={(event) => { event.currentTarget.closest("details")?.removeAttribute("open"); onOpenChat(friend); }} style={{ border: 0, background: "transparent", color: "var(--accent-secondary)", cursor: "pointer" }}>Chat</button></div>
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

function FriendChat({ currentUser, friend, onClose, muted = false, onToggleMute, onBlock, embedded = false, active = true, onSeen = null }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [sending, setSending] = useState(false);
  const logRef = useRef(null);
  const inputRef = useRef(null);
  const participants = [currentUser.uid, friend.uid].sort();
  const conversationId = `${participants[0]}_${participants[1]}`;
  useEffect(() => {
    let alive = true;
    let stopMessages = null;
    setReady(false);
    setMessages([]);
    setError("");
    const conversationRef = doc(CHAT_CONVERSATIONS_COLLECTION, conversationId);
    const openConversation = async () => {
      try {
        const snapshot = await getDoc(conversationRef);
        if (!snapshot.exists()) await setDoc(conversationRef, { participants, createdAt: Date.now() });
      } catch {
        try { await setDoc(conversationRef, { participants, createdAt: Date.now() }); }
        catch (writeError) {
          const racedSnapshot = await getDoc(conversationRef).catch(() => null);
          if (!racedSnapshot?.exists()) throw writeError;
        }
      }
      if (!alive) return;
      stopMessages = onSnapshot(CHAT_MESSAGES_COLLECTION(conversationId), (messageSnapshot) => {
        if (!alive) return;
        setMessages(messageSnapshot.docs.map((item) => ({ id: item.id, ...item.data() })).sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0)).slice(-100));
        setReady(true);
      }, () => { if (alive) setError("Couldn't load messages. Reopen chat and try again."); });
    };
    openConversation().catch(() => { if (alive) setError("Chat could not open. You both need to be accepted friends."); });
    return () => { alive = false; stopMessages?.(); };
  }, [conversationId, currentUser.uid, friend.uid]);
  useEffect(() => {
    const node = logRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages]);
  useEffect(() => {
    if (ready) inputRef.current?.focus();
  }, [ready, conversationId]);
  useEffect(() => {
    if (!active || !ready || !onSeen) return;
    const latest = messages.reduce((max, item) => Math.max(max, Number(item.createdAt) || 0), 0);
    onSeen(friend.uid, conversationId, latest || Date.now());
  }, [active, ready, messages, friend.uid, conversationId, onSeen]);
  const send = async (event) => {
    event.preventDefault();
    const clean = text.trim().slice(0, 1000);
    if (!ready || !clean || sending) return;
    const pending = { id: `local-${Date.now()}`, senderId: currentUser.uid, text: clean, createdAt: Date.now() };
    setSending(true);
    setMessages((current) => [...current, pending]);
    setText("");
    setError("");
    try {
      await addDoc(CHAT_MESSAGES_COLLECTION(conversationId), { senderId: currentUser.uid, text: clean, createdAt: pending.createdAt });
    } catch {
      setMessages((current) => current.filter((item) => item.id !== pending.id));
      setText(clean);
      setError("Message not sent. Confirm you are still friends and try again.");
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };
  const ghost = { border: 0, background: "transparent", color: "var(--text-muted)", cursor: "pointer", fontSize: 12, padding: "4px 6px" };
  return (
    <section
      aria-label={`Chat with ${friend.name}`}
      style={
        embedded
          ? { display: "flex", flexDirection: "column", flex: 1, minHeight: 0, background: "var(--panel-bg)", color: "var(--page-text)" }
          : {
              position: "fixed",
              right: 14,
              bottom: 14,
              zIndex: 90,
              width: "min(360px, calc(100vw - 28px))",
              height: "min(460px, calc(100vh - 96px))",
              display: "flex",
              flexDirection: "column",
              background: "var(--panel-bg)",
              color: "var(--page-text)",
              border: "1px solid var(--border-strong)",
              boxShadow: "var(--panel-shadow)",
            }
      }
    >
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>
        <strong style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{friend.name}{muted ? " · muted" : ""}</strong>
        <span style={{ display: "flex", gap: 2, flexShrink: 0 }}>
          {onToggleMute && <button type="button" onClick={() => onToggleMute(friend.uid)} style={ghost}>{muted ? "Unmute" : "Mute"}</button>}
          {onBlock && <button type="button" onClick={() => onBlock(friend)} style={{ ...ghost, color: "var(--danger)" }}>Block</button>}
          {onClose && <button type="button" onClick={onClose} style={ghost}>{embedded ? "Remove" : "Close"}</button>}
        </span>
      </header>
      <div ref={logRef} aria-live="polite" style={{ flex: 1, overflowY: "auto", padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
        {messages.map((message) => (
          <div key={message.id} style={{ alignSelf: message.senderId === currentUser.uid ? "flex-end" : "flex-start", maxWidth: "85%", padding: "8px 10px", background: message.senderId === currentUser.uid ? "var(--panel-raised)" : "transparent", border: "1px solid var(--border)", whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: 13 }}>
            {message.text}
          </div>
        ))}
        {!messages.length && ready && <span style={{ color: "var(--text-muted)", fontSize: 13, padding: 8 }}>Start the conversation.</span>}
        {!ready && !error && <span style={{ color: "var(--text-muted)", fontSize: 13, padding: 8 }}>Opening chat…</span>}
      </div>
      {error && <div role="alert" style={{ color: "var(--danger)", fontSize: 12, padding: "0 10px 8px" }}>{error}</div>}
      <form onSubmit={send} style={{ display: "flex", gap: 8, padding: 10, borderTop: "1px solid var(--border)", alignItems: "center" }}>
        <TextInput ref={inputRef} aria-label="Message" value={text} maxLength={1000} onChange={(event) => setText(event.target.value)} placeholder="Write a message" autoComplete="off" style={{ flex: 1, minWidth: 0 }} />
        <Button type="submit" disabled={!ready || sending || !text.trim()} style={{ flexShrink: 0 }}>Send</Button>
      </form>
    </section>
  );
}

const CHAT_POPUP_MAX = 6;

function ChatPopup({
  open,
  onClose,
  currentUser,
  chats = [],
  focusedUid,
  onFocus,
  onRemove,
  mutedIds = new Set(),
  onToggleMute,
  onBlock,
  unreadByUid = {},
  onSeen = null,
  unseenCount = 0,
  notifyEnabled = true,
  onNotifyChange = null,
}) {
  if (!open) return null;
  const focused = chats.find((item) => item.uid === focusedUid) || chats[0] || null;
  const badgeCount = notifyEnabled ? unseenCount : 0;
  return (
    <div
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 95,
        display: "grid",
        placeItems: "center",
        padding: 16,
        background: "rgba(0,0,0,0.72)",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Chats"
        onMouseDown={(event) => event.stopPropagation()}
        style={{
          width: "min(720px, 100%)",
          height: "min(560px, calc(100vh - 32px))",
          display: "flex",
          flexDirection: "column",
          background: "var(--panel-bg)",
          border: "1px solid var(--border-strong)",
          boxShadow: "var(--panel-shadow)",
          color: "var(--page-text)",
        }}
      >
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 14px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <strong style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, letterSpacing: "0.04em" }}>Chats</strong>
            {badgeCount > 0 ? (
              <span
                aria-label={`${badgeCount} unseen chats`}
                style={{
                  minWidth: 22,
                  height: 22,
                  padding: "0 7px",
                  borderRadius: 999,
                  display: "inline-grid",
                  placeItems: "center",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  fontWeight: 700,
                  ...NOTICE_BADGE_STYLE,
                }}
              >
                {badgeCount > 9 ? "9+" : badgeCount}
              </span>
            ) : null}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {onNotifyChange ? (
              <PageNotifyToggle enabled={notifyEnabled} onChange={onNotifyChange} />
            ) : null}
            <button type="button" onClick={onClose} style={{ border: 0, background: "transparent", color: "var(--text-muted)", cursor: "pointer", fontSize: 13 }}>
              Close
            </button>
          </div>
        </header>
        {chats.length === 0 ? (
          <div style={{ flex: 1, display: "grid", placeItems: "center", color: "var(--text-muted)", fontSize: 14, padding: 24, textAlign: "center" }}>
            No active chats. Open Friends and tap Chat on someone to start one here.
          </div>
        ) : (
          <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "minmax(140px, 200px) 1fr" }}>
            <aside style={{ borderRight: "1px solid var(--border)", overflowY: "auto" }}>
              {chats.map((friend) => {
                const selected = focused?.uid === friend.uid;
                const unseen = Number(unreadByUid[friend.uid]) || 0;
                return (
                  <div
                    key={friend.uid}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      borderBottom: "1px solid var(--border)",
                      background: selected ? "var(--panel-raised)" : "transparent",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => onFocus(friend.uid)}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        textAlign: "left",
                        border: 0,
                        background: "transparent",
                        color: "var(--page-text)",
                        cursor: "pointer",
                        padding: "12px 10px",
                        fontSize: 13,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{friend.name}</span>
                      {unseen > 0 ? (
                        <span
                          aria-label={`${unseen} unseen`}
                          style={{
                            marginLeft: "auto",
                            flexShrink: 0,
                            minWidth: 18,
                            height: 18,
                            padding: "0 5px",
                            borderRadius: 999,
                            display: "inline-grid",
                            placeItems: "center",
                            fontSize: 10,
                            fontWeight: 700,
                            ...NOTICE_BADGE_STYLE,
                          }}
                        >
                          {unseen > 9 ? "9+" : unseen}
                        </span>
                      ) : null}
                    </button>
                    <button
                      type="button"
                      aria-label={`Close chat with ${friend.name}`}
                      onClick={() => onRemove(friend.uid)}
                      style={{ border: 0, background: "transparent", color: "var(--text-muted)", cursor: "pointer", padding: "8px 10px" }}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </aside>
            <div style={{ minHeight: 0, display: "flex", flexDirection: "column" }}>
              {focused ? (
                <FriendChat
                  key={focused.uid}
                  embedded
                  active={open}
                  currentUser={currentUser}
                  friend={focused}
                  muted={mutedIds.has(focused.uid)}
                  onToggleMute={onToggleMute}
                  onBlock={onBlock}
                  onClose={() => onRemove(focused.uid)}
                  onSeen={onSeen}
                />
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
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
    {pending.length === 0 ? <EmptyState title="No Vault requests waiting" body="New event submissions will appear here for review." /> : <div style={{ display: "grid", gap: 10 }}>{pending.map((item) => <article key={item.id} style={{ padding: 14, background: "var(--panel-bg)", border: "1px solid var(--border)" }}><Eyebrow>{item.game} · {item.eventDate} · by {item.submitterName || "Player"}</Eyebrow><h2 style={{ fontFamily: "'Bebas Neue', sans-serif", margin: "6px 0" }}>{item.tournament}</h2><p style={{ margin: "6px 0" }}>Winner: {item.winner}{item.runnerUp ? ` · Runner-up: ${item.runnerUp}` : ""}{item.mvp ? ` · MVP: ${item.mvp}` : ""}</p>{item.source && <a href={item.source} target="_blank" rel="noopener noreferrer">Source</a>}{onDecision && <div style={{ display: "flex", gap: 8, marginTop: 10 }}><Button onClick={() => onDecision(item.id, "approved")}>Approve for The Vault</Button><Button variant="danger" onClick={() => onDecision(item.id, "rejected")}>Decline</Button></div>}</article>)}</div>}
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

function blogMatchKey(game = "") {
  const canonical = String(canonicalFilterGame(game) || game || "").trim().toLowerCase();
  if (!canonical) return "";
  // Strip parenthetical suffixes so "Call of Duty (CDL & Warzone)" ≈ "Call of Duty".
  return canonical.replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();
}

const RELATED_BLOGS_PER_GAME = 3;

function blogsByGame(posts = [], limit = RELATED_BLOGS_PER_GAME) {
  const byGame = new Map();
  [...posts]
    .filter((post) => post.status === "published" && post.game && post.content)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .forEach((post) => {
      const key = blogMatchKey(post.game);
      if (!key) return;
      const list = byGame.get(key) || [];
      if (list.length >= limit) return;
      list.push(post);
      byGame.set(key, list);
    });
  return byGame;
}

function relatedBlogCard(post) {
  return {
    id: post.id,
    title: post.title || "Untitled",
    content: post.content || "",
    summary: excerptWords(post.content, { min: 30, max: 50 }),
    authorName: post.authorName || "",
    analysisType: post.analysisType || "",
    analysisSubject: post.analysisSubject || "",
    docsUrl: post.docsUrl || "",
    source: post.source || "",
    youtubeUrl: post.youtubeUrl || "",
    createdAt: post.createdAt || 0,
  };
}

function applyBlogExcerptsToSlides(slides = [], posts = []) {
  const byGame = blogsByGame(posts, RELATED_BLOGS_PER_GAME);
  if (!byGame.size) return slides;
  return slides.map((slide) => {
    if (slide.blog) return slide;
    const key = blogMatchKey(slide.game);
    const related = key ? byGame.get(key) : null;
    if (!related?.length) return slide;
    const primary = related[0];
    const summary = excerptWords(primary.content, { min: 30, max: 50 });
    if (!summary) return slide;
    return {
      ...slide,
      summary,
      relatedBlogs: related.map(relatedBlogCard),
      blogExcerptId: primary.id,
      docsUrl: slide.docsUrl || primary.docsUrl || "",
      source: slide.source || primary.source || "",
    };
  });
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
      summary: excerptWords(post.content, { min: 30, max: 50 }) || String(post.content || "").slice(0, 280),
      fullContent: post.content,
      authorName: post.authorName,
      source: post.source,
      eventScope: post.eventScope,
      kicker: [analysisTypeLabel(post.analysisType), publicScopeKicker(post) || "Blog"].filter(Boolean).join(" · "),
      poster: (!isStockBannerUrl(post.coverUrl) && post.coverUrl) || bannerForGame(post.game) || post.coverUrl || "",
      analysisType: post.analysisType || "event",
      analysisSubject: post.analysisSubject || "",
      youtubeUrl: post.youtubeUrl || "",
      docsUrl: post.docsUrl || "",
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
                <ExpandableBlogBody text={post.content} />
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
  if (!onPromote) return null;
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
      <button type="button" aria-label="Suggest event to Vault" onClick={() => { if (!user) { onSignIn?.(); return; } setOpen((value) => !value); }} className="grid h-9 w-9 place-items-center rounded-full border border-white/20 bg-black/40 font-mono text-lg text-neon hover:border-neon">+</button>
      {open && user && (
        <div className="absolute right-0 top-11 z-20 w-[min(100vw-2rem,20rem)] border border-white/10 bg-[var(--page-bg-solid)] p-3 shadow-xl">
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

function OwnerDashboard({ role, reports, onStatusChange, bans = [], onSetPlayerAccess, popups, onSavePopup, onDeletePopup, staff, onSetSupport, onSaveSupportPermissions, supportPermissions = null, tournaments, archiveEntries = [], blogPosts, blogPrivateById = {}, onBlogReview, onPromoteBlog, archiveSubmissions = [], onArchiveDecision, auditLog = [], onOpenTournament, initialTab = "overview", circuitRecords = [], deletedCircuitRecords = [], onSaveCircuit, onDeleteCircuit, onRestoreCircuit, onPurgeCircuit, onImportArchive, filterGames = FILTER_GAMES, ewcWindows = [], blogSlides = [], supportChanges = [], onReviewSupportChange, deskGate = null, onSaveDeskPassword }) {
  const isOwner = role === "owner";
  const perms = normalizeSupportPermissions(supportPermissions);
  const canVault = isOwner || supportHas(perms, "vaultEdit");
  const canLibrary = isOwner || supportHas(perms, "libraryView") || supportHas(perms, "libraryManage");
  const canBlogs = isOwner || supportHas(perms, "blogReview") || supportHas(perms, "blogPromote");
  const canReports = isOwner || supportHas(perms, "reportsTriage");
  const supportTabs = useMemo(
    () => [
      "overview",
      ...(canVault ? ["windows", "tournaments", "vault"] : []),
      ...(canLibrary ? ["library"] : []),
      ...(canBlogs ? ["blogs"] : []),
      ...(canReports ? ["reports"] : []),
      ...(isOwner ? ["live matrix", "support changes", "activity log", "popups", "support access"] : ["my requests"]),
    ],
    [canVault, canLibrary, canBlogs, canReports, isOwner],
  );
  const [tab, setTab] = useState(initialTab);
  const [editing, setEditing] = useState(null);
  const [popupError, setPopupError] = useState("");
  const activeReports = reports.filter((item) => !isReportArchived(item)).length;
  const pendingBlogs = blogPosts.filter((post) => post.status === "pending").length;
  const pendingArchiveRequests = archiveSubmissions.filter((item) => item.status === "pending").length;
  const activeTournaments = tournaments.filter((item) => !isTournamentArchived(item)).length;
  const pendingSupportChanges = supportChanges.filter((item) => item.status === "pending").length;
  useEffect(() => {
    if (!supportTabs.includes(tab)) setTab("overview");
  }, [tab, supportTabs]);
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

  return (
    <div style={{ paddingTop: 24 }}>
      <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 34, margin: "0 0 10px" }}>{isOwner ? "Owner" : "Support"}</h1>
      <div
        role="tablist"
        aria-label="Dashboard sections"
        style={{
          display: "flex",
          flexWrap: "nowrap",
          gap: 4,
          marginBottom: 18,
          borderBottom: "1px solid var(--border)",
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "thin",
          paddingBottom: 2,
        }}
      >
          {supportTabs.map((name) => (
            <button
              key={name}
              type="button"
              role="tab"
              aria-selected={tab === name}
              onClick={() => setTab(name)}
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                padding: "10px 12px",
                minHeight: 40,
                flex: "0 0 auto",
                whiteSpace: "nowrap",
                border: "none",
                borderBottom: tab === name ? "2px solid var(--accent-secondary)" : "2px solid transparent",
                marginBottom: -1,
                background: "transparent",
                color: tab === name ? "var(--page-text)" : "var(--text-muted)",
                cursor: "pointer",
              }}
            >
              {name === "vault" ? "Vault" : name === "tournaments" ? "Scrims" : name === "live matrix" ? "Matrix" : name === "support changes" ? "Changes" : name === "activity log" ? "Log" : name === "support access" ? "Access" : name === "my requests" ? "Requests" : name[0].toUpperCase() + name.slice(1)}
            </button>
          ))}
      </div>
      {tab === "overview" && <>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 18 }}>
          {[["Open reports", activeReports, "reports"], ["Pending blogs", pendingBlogs, "blogs"], ["Vault requests", pendingArchiveRequests, "vault"], ["Support changes", pendingSupportChanges, isOwner ? "support changes" : "my requests"], ["Active scrims", activeTournaments, "tournaments"], ["Vault records", archiveEntries.length, "vault"]].map(([label, value, next]) => <button key={label} type="button" onClick={() => setTab(next)} style={{ padding: 16, background: "var(--panel-bg)", border: "1px solid var(--border)", textAlign: "left", cursor: "pointer", color: "inherit" }}><Eyebrow>{label}</Eyebrow><strong style={{ display: "block", fontSize: 25, marginTop: 8 }}>{value}</strong></button>)}
        </div>
        <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
          Monitor tournaments, The Vault, and the community blog from the tabs above
          {isOwner
            ? ". Use Support access to turn each capability on or off per support UID. Owner-only: media manage, popups, bans, grant access, activity log."
            : ". Tabs follow the permissions the owner enabled for your account. Changes still wait for owner approval."}
        </p>
      </>}
      {tab === "windows" && canVault && <FloatingWindowsDesk records={circuitRecords} ewcWindows={ewcWindows} blogSlides={blogSlides} role={role} onSave={onSaveCircuit} filterGames={filterGames} />}
      {tab === "library" && canLibrary && <MediaLibraryDesk games={filterGames} canManage={canManageMediaLibrary(role, perms)} />}
      {tab === "live matrix" && isOwner && <LiveMatrixDesk role={role} onMergeCircuit={onSaveCircuit} />}
      {(tab === "support changes" || tab === "my requests") && <SupportChangeQueue requests={supportChanges} role={role} onReview={onReviewSupportChange} />}
      {tab === "reports" && canReports && <ReportsInbox reports={reports} onStatusChange={onStatusChange} bans={bans} role={role} onSetPlayerAccess={onSetPlayerAccess} />}
      {tab === "tournaments" && canVault && <div style={{ display: "grid", gap: 28 }}><CircuitCmsDesk surface="tournament" records={circuitRecords} deletedRecords={deletedCircuitRecords} role={role} onSave={onSaveCircuit} onDelete={onDeleteCircuit} onRestore={onRestoreCircuit} onPurge={onPurgeCircuit} games={filterGames} permissions={perms} /><TournamentMonitor tournaments={tournaments} onOpen={onOpenTournament} /></div>}
      {tab === "vault" && canVault && <div style={{ display: "grid", gap: 28 }}><VaultResearchDesk records={circuitRecords} deletedRecords={deletedCircuitRecords} role={role} onSave={onSaveCircuit} onDelete={onDeleteCircuit} onRestore={onRestoreCircuit} onPurge={onPurgeCircuit} filterGames={filterGames} permissions={perms} /><VaultMonitor submissions={archiveSubmissions} blogPosts={blogPosts} onDecision={supportHas(perms, "archiveDecide") || isOwner ? onArchiveDecision : undefined} onPromote={supportHas(perms, "blogPromote") || isOwner ? onPromoteBlog : undefined} /></div>}
      {tab === "activity log" && isOwner && <StaffActivityLog actions={auditLog} />}
      {tab === "blogs" && canBlogs && <section><p style={{ color: "var(--text-muted)", fontSize: 13 }}>Watch every community blog from this desk. Publish or decline pending posts, then promote a published story into The Vault from the Vault tab.</p><div style={{ display: "flex", gap: 16, margin: "0 0 14px", fontSize: 13, color: "var(--text-muted)" }}><span>Pending {pendingBlogs}</span><span>Published {blogPosts.filter((post) => post.status === "published").length}</span><span>Total {blogPosts.length}</span></div>{blogPosts.length === 0 ? <EmptyState title="No blog posts yet" body="Community submissions will appear here for preview." /> : <div style={{ display: "grid", gap: 10 }}>{[...blogPosts].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 30).map((post) => <article key={post.id} style={{ padding: 14, background: "var(--panel-bg)", border: "1px solid var(--border)" }}><Eyebrow>{post.game} · {post.status}{post.eventScope ? ` · ${post.eventScope}` : ""} · by {blogCreditStaff(post, blogPrivateById[post.id])}</Eyebrow><h2 style={{ fontFamily: "'Bebas Neue', sans-serif", margin: "6px 0" }}>{post.title}</h2><ExpandableBlogBody text={post.content} />{post.docsUrl && <a href={post.docsUrl} target="_blank" rel="noopener noreferrer" className="text-neon" style={{ marginRight: 10 }}>Docs</a>}{post.source && <a href={post.source} target="_blank" rel="noopener noreferrer" className="text-neon">Source</a>}{post.status === "pending" && (isOwner || supportHas(perms, "blogReview")) && <div style={{ display: "flex", gap: 8, marginTop: 10 }}><Button onClick={() => onBlogReview(post.id, "published")}>Publish</Button><Button variant="danger" onClick={() => onBlogReview(post.id, "rejected")}>Decline</Button></div>}</article>)}</div>}</section>}
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
      {tab === "support access" && isOwner && (
        <div style={{ display: "grid", gap: 28 }}>
          <DeskPasswordSettings gate={deskGate} onSave={onSaveDeskPassword} />
          <SupportAccessDesk staff={staff} onSetSupport={onSetSupport} onSavePermissions={onSaveSupportPermissions} />
        </div>
      )}
    </div>
  );
}

function DeskPasswordSettings({ gate = null, onSave }) {
  const [ownerPass, setOwnerPass] = useState("");
  const [supportPass, setSupportPass] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const save = async (role, value) => {
    setError("");
    setMessage("");
    setBusy(role);
    try {
      const hash = await hashDeskPassword(value);
      await onSave(role, hash);
      if (role === "owner") setOwnerPass("");
      else setSupportPass("");
      setMessage(`${role === "owner" ? "Owner" : "Support"} desk password updated.`);
    } catch (issue) {
      setError(issue.message || "Could not save desk password.");
    } finally {
      setBusy("");
    }
  };

  return (
    <section style={{ maxWidth: 760, padding: 14, border: "1px solid var(--border)", background: "var(--panel-bg)" }}>
      <Eyebrow>Desk passwords</Eyebrow>
      <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 8 }}>
        Separate passwords for owner and support dashboards. Staff still need their Firebase account, then this desk password.
      </p>
      <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
        <label style={{ display: "grid", gap: 6, fontSize: 12, color: "var(--text-muted)" }}>
          Owner desk password {gate?.ownerHash ? "(set)" : "(not set)"}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <TextInput type="password" value={ownerPass} onChange={(e) => setOwnerPass(e.target.value)} placeholder="New owner password" style={{ flex: 1, minWidth: 180 }} />
            <Button disabled={busy === "owner" || !ownerPass} onClick={() => save("owner", ownerPass)}>{busy === "owner" ? "Saving…" : "Save owner"}</Button>
          </div>
        </label>
        <label style={{ display: "grid", gap: 6, fontSize: 12, color: "var(--text-muted)" }}>
          Support desk password {gate?.supportHash ? "(set)" : "(not set)"}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <TextInput type="password" value={supportPass} onChange={(e) => setSupportPass(e.target.value)} placeholder="New support password" style={{ flex: 1, minWidth: 180 }} />
            <Button disabled={busy === "support" || !supportPass} onClick={() => save("support", supportPass)}>{busy === "support" ? "Saving…" : "Save support"}</Button>
          </div>
        </label>
      </div>
      {error && <div role="alert" style={{ color: "var(--danger)", marginTop: 8 }}>{error}</div>}
      {message && <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 8 }}>{message}</p>}
    </section>
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
    <PageEnter className={embedded ? "pt-2" : "pt-6"}>
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
              {entry.source && <a href={entry.source} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm text-neon">Source</a>}
            </div>
          </article>
        ))}
      </div>
    </PageEnter>
  );
}

function LoadingScreen({ label }) {
  return <div role="status" aria-live="polite" style={{ minHeight: "60vh", display: "grid", placeItems: "center", background: "var(--page-bg-solid, #101820)", color: "var(--page-text, #EDF1F4)", fontFamily: "'Inter',sans-serif" }}><div style={{ textAlign: "center" }}><div className="grind-loader" aria-hidden="true"><span>G</span></div><div style={{ marginTop: 16 }}>{label}…</div><style>{`.grind-loader{width:68px;height:68px;margin:auto;border:2px solid var(--border,#314);border-top-color:var(--accent,#08f);border-right-color:var(--accent-secondary,#0dc);border-radius:50%;display:grid;place-items:center;animation:grind-spin 1.2s linear infinite}.grind-loader span{font-family:'Bebas Neue',sans-serif;font-size:30px;animation:grind-spin 1.2s linear infinite reverse}@keyframes grind-spin{to{transform:rotate(360deg)}}@media(prefers-reduced-motion:reduce){.grind-loader,.grind-loader span{animation:none}}`}</style></div></div>;
}

function blogLinkError(source, youtubeUrl, docsUrl) {
  if ((source || "").trim() && !isHttpsUrl(source)) return "Use a secure https source link.";
  if ((youtubeUrl || "").trim() && !isHttpsUrl(youtubeUrl)) return "Use a secure https YouTube link.";
  if ((docsUrl || "").trim() && !isHttpsUrl(docsUrl)) return "Use a secure https docs link.";
  return "";
}

function BlogPage({ posts, user, isModerator, blogPrivateById = {}, onSubmit, onReview, onEdit, onDelete, onSignIn, embedded = false, manageInDrawer = false, overlay = false, notifyEnabled = true, onNotifyChange = null }) {
  const [title, setTitle] = useState("");
  const [game, setGame] = useState("");
  const [eventScope, setEventScope] = useState("random");
  const [analysisType, setAnalysisType] = useState("event");
  const [analysisSubject, setAnalysisSubject] = useState("");
  const [content, setContent] = useState("");
  const [source, setSource] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [docsUrl, setDocsUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState("");
  const [manageOpen, setManageOpen] = useState(false);
  const [draft, setDraft] = useState({ title: "", game: "", content: "", source: "", eventScope: "random", analysisType: "event", analysisSubject: "", youtubeUrl: "", docsUrl: "", coverUrl: "" });
  const visible = posts.filter((post) => post.status === "published" || (user && post.authorId === user.uid) || (isModerator && post.status === "pending"));
  const submit = async () => {
    if (!title.trim() || !game.trim() || !content.trim()) { setError("Add a title, game, and post text."); return; }
    const linkError = blogLinkError(source, youtubeUrl, docsUrl);
    if (linkError) { setError(linkError); return; }
    try {
      await onSubmit({
        title: title.trim(),
        game: game.trim(),
        content: content.trim(),
        source: source.trim(),
        eventScope,
        analysisType,
        analysisSubject: analysisSubject.trim(),
        youtubeUrl: youtubeUrl.trim(),
        docsUrl: docsUrl.trim(),
        coverUrl: coverUrl.trim(),
        anonymous,
      });
      setTitle(""); setGame(""); setEventScope("random"); setAnalysisType("event"); setAnalysisSubject(""); setContent(""); setSource(""); setYoutubeUrl(""); setDocsUrl(""); setCoverUrl(""); setAnonymous(false); setError("");
    }
    catch { setError("Could not submit this post. Please try again."); }
  };
  const startEdit = (post) => { setEditingId(post.id); setDraft({ title: post.title || "", game: post.game || "", content: post.content || "", source: post.source || "", eventScope: post.eventScope || "random", analysisType: post.analysisType || "event", analysisSubject: post.analysisSubject || "", youtubeUrl: post.youtubeUrl || "", docsUrl: post.docsUrl || "", coverUrl: post.coverUrl || "" }); setError(""); };
  const saveEdit = async (post) => {
    if (!draft.title.trim() || !draft.game.trim() || !draft.content.trim()) { setError("Add a title, game, and post text."); return; }
    const linkError = blogLinkError(draft.source, draft.youtubeUrl, draft.docsUrl);
    if (linkError) { setError(linkError); return; }
    try { await onEdit(post, { title: draft.title.trim(), game: draft.game.trim(), content: draft.content.trim(), source: draft.source.trim(), eventScope: draft.eventScope || "random", analysisType: draft.analysisType || "event", analysisSubject: (draft.analysisSubject || "").trim(), youtubeUrl: (draft.youtubeUrl || "").trim(), docsUrl: (draft.docsUrl || "").trim(), coverUrl: (draft.coverUrl || "").trim() }); setEditingId(""); setError(""); }
    catch { setError("Could not save this post. Please try again."); }
  };
  const compose = user ? (
    <section style={{ display: "grid", gap: 10, padding: 16, background: "var(--panel-bg)", border: "1px solid var(--border)", maxWidth: 680 }}>
      <p style={{ color: "var(--text-muted)", fontSize: 13, margin: 0 }}>Send a tournament recap or esports story to the GrindInfo owner for review.</p>
      <Field label="Post title"><TextInput value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} /></Field>
      <Field label="Game"><TextInput value={game} maxLength={60} onChange={(e) => setGame(e.target.value)} placeholder="e.g. Valorant" /></Field>
      <Field label="Event type"><Select value={eventScope} onChange={(e) => setEventScope(e.target.value)}>{EVENT_SCOPES.map((scope) => <option key={scope.id} value={scope.id}>{scope.label}</option>)}</Select></Field>
      <Field label="Analysis of"><Select value={analysisType} onChange={(e) => setAnalysisType(e.target.value)}>{BLOG_ANALYSIS_TYPES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</Select></Field>
      <Field label="Subject (event, team, game, or match)"><TextInput value={analysisSubject} maxLength={80} onChange={(e) => setAnalysisSubject(e.target.value)} placeholder="EWC 2025 Final · Team Liquid · map 3" /></Field>
      <Field label="Story or tournament update"><textarea value={content} maxLength={12000} onChange={(e) => setContent(e.target.value)} rows={6} style={{ ...inputStyle, resize: "vertical" }} /></Field>
      {game.trim() && (
        <Field label="Cover from library">
          <BlogGameCover game={game.trim()} coverUrl={coverUrl} height={120} style={{ marginTop: 0, marginBottom: 8 }} />
          <CollectionPicker
            game={game.trim()}
            kinds={["avatar", "poster", "background", "event"]}
            value={coverUrl}
            onSelect={setCoverUrl}
            heading="Avatar / poster / background packs"
          />
        </Field>
      )}
      <Field label="YouTube (optional)"><TextInput value={youtubeUrl} maxLength={500} onChange={(e) => setYoutubeUrl(e.target.value)} placeholder="https://youtube.com/..." /></Field>
      <Field label="Docs (optional)"><TextInput value={docsUrl} maxLength={500} onChange={(e) => setDocsUrl(e.target.value)} placeholder="https://docs.google.com/..." /></Field>
      <Field label="Source link (optional)"><TextInput value={source} maxLength={500} onChange={(e) => setSource(e.target.value)} placeholder="https://" /></Field>
      <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: "var(--text-muted)" }}>
        <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
        Post anonymously (public credit shows Anonymous; staff still see who requested)
      </label>
      {error && !editingId && <span role="alert" style={{ color: "var(--danger)" }}>{error}</span>}
      <Button onClick={submit}>Request publication</Button>
    </section>
  ) : (
    <section style={{ maxWidth: 680, padding: 16, marginTop: 14, background: "var(--panel-bg)", border: "1px solid var(--border)" }}>
      <div style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 10 }}>Sign in to request that a blog post be published.</div>
      <Button onClick={onSignIn}>Sign in to request a post</Button>
    </section>
  );
  return (
    <PageEnter style={{ paddingTop: overlay || embedded ? 0 : 32, paddingBottom: manageInDrawer ? 88 : 0 }}>
      {!embedded && !overlay && (
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <SectionBackHome />
            <Eyebrow>Community stories</Eyebrow>
            <h1 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 42, margin: "4px 0 0" }}>Esports blog</h1>
            <p style={{ color: "var(--text-muted)" }}>Read community stories, tournament recaps, and esports updates.</p>
          </div>
          {user && onNotifyChange ? <PageNotifyToggle enabled={notifyEnabled} onChange={onNotifyChange} /> : null}
        </div>
      )}
      {overlay && (
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
          <p style={{ color: "var(--text-muted)", margin: 0, fontSize: 14 }}>Read community stories, tournament recaps, and esports updates.</p>
          {user && onNotifyChange ? <PageNotifyToggle enabled={notifyEnabled} onChange={onNotifyChange} /> : null}
        </div>
      )}
      {embedded && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, margin: 0 }}>Community blog</h2>
          {user && onNotifyChange ? <PageNotifyToggle enabled={notifyEnabled} onChange={onNotifyChange} /> : null}
        </div>
      )}
      {!manageInDrawer && compose}
      <div style={{ display: "grid", gap: 12, marginTop: 20 }}>
        {visible.map((post) => (
          <article key={post.id} style={{ padding: 16, background: "var(--panel-bg)", border: "1px solid var(--border)" }}>
            <Eyebrow>{post.game} · {post.status}{post.eventScope ? ` · ${post.eventScope}` : ""}{post.analysisType ? ` · ${analysisTypeLabel(post.analysisType)}` : ""}{post.analysisSubject ? ` · ${post.analysisSubject}` : ""}</Eyebrow>
            {editingId === post.id ? (
              <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                <Field label="Post title"><TextInput maxLength={120} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></Field>
                <Field label="Game"><TextInput maxLength={60} value={draft.game} onChange={(e) => setDraft({ ...draft, game: e.target.value })} /></Field>
                <Field label="Event type"><Select value={draft.eventScope || "random"} onChange={(e) => setDraft({ ...draft, eventScope: e.target.value })}>{EVENT_SCOPES.map((scope) => <option key={scope.id} value={scope.id}>{scope.label}</option>)}</Select></Field>
                <Field label="Analysis of"><Select value={draft.analysisType || "event"} onChange={(e) => setDraft({ ...draft, analysisType: e.target.value })}>{BLOG_ANALYSIS_TYPES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</Select></Field>
                <Field label="Subject"><TextInput maxLength={80} value={draft.analysisSubject || ""} onChange={(e) => setDraft({ ...draft, analysisSubject: e.target.value })} /></Field>
                <Field label="Story"><textarea maxLength={12000} rows={6} value={draft.content} onChange={(e) => setDraft({ ...draft, content: e.target.value })} style={{ ...inputStyle, resize: "vertical" }} /></Field>
                {draft.game?.trim() && (
                  <Field label="Cover from library">
                    <BlogGameCover game={draft.game.trim()} coverUrl={draft.coverUrl} height={120} style={{ marginTop: 0, marginBottom: 8 }} />
                    <CollectionPicker
                      game={draft.game.trim()}
                      kinds={["avatar", "poster", "background", "event"]}
                      value={draft.coverUrl || ""}
                      onSelect={(url) => setDraft({ ...draft, coverUrl: url })}
                      heading="Avatar / poster / background packs"
                    />
                  </Field>
                )}
                <Field label="YouTube (optional)"><TextInput maxLength={500} value={draft.youtubeUrl || ""} onChange={(e) => setDraft({ ...draft, youtubeUrl: e.target.value })} /></Field>
                <Field label="Docs (optional)"><TextInput maxLength={500} value={draft.docsUrl || ""} onChange={(e) => setDraft({ ...draft, docsUrl: e.target.value })} /></Field>
                <Field label="Source link (optional)"><TextInput maxLength={500} value={draft.source} onChange={(e) => setDraft({ ...draft, source: e.target.value })} /></Field>
                <div style={{ display: "flex", gap: 8 }}><Button onClick={() => saveEdit(post)}>Save changes</Button><Button variant="ghost" onClick={() => setEditingId("")}>Cancel</Button></div>
              </div>
            ) : (
              <>
                <BlogGameCover game={post.game} coverUrl={post.coverUrl} />
                <h2 style={{ fontFamily: "'Bebas Neue',sans-serif" }}>{post.title}</h2>
                <ExpandableBlogBody text={post.content} />
                <div style={{ marginTop: 8, fontSize: 12 }}>
                  By {isModerator ? blogCreditStaff(post, blogPrivateById[post.id]) : blogCreditPublic(post)}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 8 }}>
                  {post.youtubeUrl && <a href={post.youtubeUrl} target="_blank" rel="noopener noreferrer" className="text-neon">YouTube</a>}
                  {post.docsUrl && <a href={post.docsUrl} target="_blank" rel="noopener noreferrer" className="text-neon">Docs</a>}
                  {post.source && <a href={post.source} target="_blank" rel="noopener noreferrer" className="text-neon">Source</a>}
                </div>
                {isModerator && post.status === "pending" && (
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <Button onClick={() => onReview(post.id, "published")}>Publish</Button>
                    <Button variant="danger" onClick={() => onReview(post.id, "rejected")}>Decline</Button>
                  </div>
                )}
                {(user && post.authorId === user.uid || isModerator) && (
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <Button variant="ghost" onClick={() => startEdit(post)}>Edit post</Button>
                    <Button variant="danger" onClick={() => { if (window.confirm("Delete this blog post? This cannot be undone.")) onDelete(post); }}>Delete post</Button>
                  </div>
                )}
                {user && post.authorId === user.uid && post.status === "published" && (
                  <small style={{ display: "block", marginTop: 8, color: "var(--text-muted)" }}>Saving an edit sends the post back for review.</small>
                )}
              </>
            )}
            {error && editingId === post.id && <div role="alert" style={{ color: "var(--danger)", marginTop: 8 }}>{error}</div>}
          </article>
        ))}
      </div>
      {manageInDrawer && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[var(--page-bg-solid)]/95 backdrop-blur-md">
          <button type="button" onClick={() => setManageOpen((open) => !open)} className="flex w-full items-center justify-between px-5 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-neon">
            <span>Manage Posts</span>
            <span aria-hidden="true">{manageOpen ? "−" : "+"}</span>
          </button>
          {manageOpen && <div className="max-h-[48vh] overflow-y-auto border-t border-white/10 px-5 py-4">{compose}</div>}
        </div>
      )}
    </PageEnter>
  );
}



export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const windowLocation = useWindowLocation();
  const routePath = windowLocation.pathname || location.pathname;
  const blogOpen = routePath === "/blog";
  const blogBackground = blogOpen
    ? (windowLocation.state?.background || location.state?.background || { pathname: "/", search: "", hash: "", state: null, key: "blog-bg" })
    : null;
  const routesLocation = blogOpen ? blogBackground : windowLocation;
  const closeBlogOverlay = () => {
    if (windowLocation.state?.background || location.state?.background) {
      navigate(-1);
      return;
    }
    navigate("/", { replace: true });
  };
  const [tournaments, setTournaments] = useState([]);
  const [selectedTeams, setSelectedTeams] = useState([]);
  const [selectedMatches, setSelectedMatches] = useState([]);
  const [selectedStats, setSelectedStats] = useState([]);
  const [selectedRegistrations, setSelectedRegistrations] = useState([]);
  const [selectedLobby, setSelectedLobby] = useState(null);
  const [selectedRooms, setSelectedRooms] = useState([]);
  const [selectedPromotions, setSelectedPromotions] = useState([]);
  const [scrimAnnouncements, setScrimAnnouncements] = useState([]);
  const [officialHosts, setOfficialHosts] = useState([]);
  const [hostRequests, setHostRequests] = useState([]);
  const [userPrefs, setUserPrefs] = useState(null);
  const [myScrimHistory, setMyScrimHistory] = useState([]);
  const [profileModalTab, setProfileModalTab] = useState("profile");
  const [showScrimAlertPrefs, setShowScrimAlertPrefs] = useState(false);
  const [scrimDeskFilter, setScrimDeskFilter] = useState("all");
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
  const [supportPermissions, setSupportPermissions] = useState(null);
  const [siteRoleResolved, setSiteRoleResolved] = useState(!auth.currentUser);
  const [deskGate, setDeskGate] = useState(null);
  const [deskGateLoading, setDeskGateLoading] = useState(true);
  const [friendRequests, setFriendRequests] = useState([]);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [tournamentInvites, setTournamentInvites] = useState([]);
  const [activeChats, setActiveChats] = useState([]);
  const [focusedChatUid, setFocusedChatUid] = useState(null);
  const [chatPopupOpen, setChatPopupOpen] = useState(false);
  const [chatUnreadByUid, setChatUnreadByUid] = useState({});
  const [archiveEntries, setArchiveEntries] = useState([]);
  const [archiveSubmissions, setArchiveSubmissions] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [blogPosts, setBlogPosts] = useState([]);
  const [blogPrivateById, setBlogPrivateById] = useState({});
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
  const vaultBookmarks = useVaultBookmarks(user?.uid);

  useEffect(() => {
    let cancelled = false;
    let loadingCleared = false;
    const applyAuthUser = (u) => {
      if (cancelled) return;
      setUser(u || null);
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
        setAuthBusy(false);
        setAuthError("");
        try { localStorage.setItem("grindinfo-last-active", String(Date.now())); } catch { /* private mode */ }
        rememberKnownAccount({
          uid: u.uid,
          email: u.email || "",
          handle: u.displayName && String(u.displayName).includes("#") ? String(u.displayName).toLowerCase() : "",
          label: u.displayName || u.email || "Player",
          provider: u.providerData?.some((item) => item.providerId === "google.com") ? "google" : "password",
        });
        setKnownAccounts(readKnownAccounts());
      } else {
        setAuthBusy(false);
      }
      if (!loadingCleared) {
        loadingCleared = true;
        setAuthLoading(false);
      }
    };

    // Never block the UI on Auth/IndexedDB. Paint within 1.5s even if Auth never answers.
    const unsub = onAuthStateChanged(auth, (u) => applyAuthUser(u));
    const failSafe = window.setTimeout(() => {
      if (!loadingCleared) applyAuthUser(auth.currentUser || null);
    }, 1500);

    if (typeof auth.authStateReady === "function") {
      Promise.race([
        auth.authStateReady(),
        new Promise((resolve) => window.setTimeout(resolve, 1200)),
      ]).then(() => {
        if (!loadingCleared) applyAuthUser(auth.currentUser || null);
      }).catch(() => {
        if (!loadingCleared) applyAuthUser(null);
      });
    }

    (async () => {
      try {
        await Promise.race([
          completeGoogleSignInReturn(),
          new Promise((resolve) => window.setTimeout(resolve, 2500)),
        ]);
      } catch (e) {
        if (!cancelled) {
          setAuthError(e.code === "auth/unauthorized-domain"
            ? "This site isn't allowed for Google sign-in yet."
            : "Couldn't finish Google sign-in — try email instead.");
        }
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(failSafe);
      unsub();
    };
  }, []);

  // Soft session hygiene on Spark: idle signed-in tabs re-auth after 12 hours without activity.
  useEffect(() => {
    if (!user) return undefined;
    const KEY = "grindinfo-last-active";
    const IDLE_MS = 12 * 60 * 60 * 1000;
    const touch = () => {
      try { localStorage.setItem(KEY, String(Date.now())); } catch { /* private mode */ }
    };
    const clearStamp = () => {
      try { localStorage.removeItem(KEY); } catch { /* private mode */ }
    };
    const forceIdleSignOut = () => {
      // Drop the stale stamp so the next successful sign-in is not bounced immediately.
      clearStamp();
      sessionStorage.removeItem("grindinfo-guest-mode");
      setAuthBusy(false);
      signOut(auth);
      setAuthDialogOpen(true);
      setAuthError("Signed out after idle time. Sign in again to continue.");
    };
    const last = Number(localStorage.getItem(KEY) || 0);
    if (last > 0 && Date.now() - last > IDLE_MS) {
      forceIdleSignOut();
      return undefined;
    }
    touch();
    const onActivity = () => touch();
    const events = ["pointerdown", "keydown", "visibilitychange"];
    events.forEach((name) => window.addEventListener(name, onActivity, { passive: true }));
    const tick = window.setInterval(() => {
      const stamped = Number(localStorage.getItem(KEY) || 0);
      if (stamped > 0 && Date.now() - stamped > IDLE_MS) {
        forceIdleSignOut();
      }
    }, 60 * 1000);
    return () => {
      events.forEach((name) => window.removeEventListener(name, onActivity));
      window.clearInterval(tick);
    };
  }, [user]);

  const handleGoogleSignIn = useCallback(async () => {
    setAuthError("");
    setAuthBusy(true);
    try {
      await signInWithGoogle();
      try { localStorage.setItem("grindinfo-last-active", String(Date.now())); } catch { /* private mode */ }
    } catch (e) {
      if (e?.code === "auth/popup-closed-by-user" || e?.code === "auth/cancelled-popup-request") {
        setAuthBusy(false);
        return;
      }
      setAuthError(e?.code === "auth/unauthorized-domain"
        ? "This site isn't allowed for Google sign-in yet."
        : "Couldn't finish Google sign-in — try Google again, or use email and password.");
      setAuthBusy(false);
    }
  }, []);

  const handleEmailAuth = useCallback(async (mode, { name, email, password }) => {
    setAuthError("");
    setAuthBusy(true);
    try {
      if (mode === "signup") {
        if (!isValidPlayerName(name)) {
          setAuthError("Use 3–16 letters, numbers, or underscore. Your ID will look like name#0000.");
          return;
        }
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: playerNameFromInput(name) });
      } else {
        const identifier = String(email || "").trim();
        if (isEmailLike(identifier)) {
          await signInWithEmailAndPassword(auth, identifier, password);
          try { await syncPrivateHandleLookup(); } catch { /* Login still succeeds if ID linking needs setup. */ }
        } else {
          if (!ID_SIGN_IN_ENABLED) {
            setAuthError("GrindInfo ID sign-in is not configured yet. Use your account email for now.");
            return;
          }
          await signInWithGrindInfoId(identifier, password);
        }
      }
    } catch (e) {
      const messages = {
        "auth/email-already-in-use": "That email is already registered — try signing in instead.",
        "auth/invalid-credential": "Incorrect email or password. If you signed up with Google, use Continue with Google.",
        "auth/wrong-password": "Incorrect password. Google accounts do not use this password box.",
        "auth/user-not-found": "No email/password account matches that. Try Continue with Google.",
        "auth/too-many-requests": "Too many attempts. Wait a minute, then try again.",
        "auth/network-request-failed": "Network error. Check your connection and try again.",
        "auth/user-disabled": "This account is disabled.",
        "auth/weak-password": "Password should be at least 6 characters.",
        "auth/invalid-email": "That email address doesn't look right.",
        "functions/failed-precondition": "Sign in with your account email once to link this GrindInfo ID.",
        "functions/unauthenticated": "The GrindInfo ID or password did not match, or ID sign-in is not configured yet.",
      };
      setAuthError(messages[e.code] || "Something went wrong — try again.");
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const handleSignOut = useCallback(() => {
    sessionStorage.removeItem("grindinfo-guest-mode");
    try { localStorage.removeItem("grindinfo-last-active"); } catch { /* private mode */ }
    signOut(auth);
  }, []);

  const handleSwitchAccount = useCallback(() => {
    sessionStorage.removeItem("grindinfo-guest-mode");
    try { localStorage.removeItem("grindinfo-last-active"); } catch { /* private mode */ }
    setGuestMode(false);
    setAuthDialogOpen(true);
    setAuthError("");
    setAuthBusy(false);
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
  const circuitCms = useCircuitCms({ canWrite: siteRole === "owner" || (siteRole === "support" && supportCanDirectAction(supportPermissions, "cms_upsert")) });
  const staffChanges = useStaffChangeRequests({ role: siteRole, user, permissions: supportPermissions });
  const liveEsportsBanners = useEsportsMedia();
  const blogSlides = useMemo(() => slidesFromBlogs(blogPosts), [blogPosts]);
  const researchSlidesWithBlogCopy = useMemo(
    () => applyBlogExcerptsToSlides(circuitCms.researchSlides, blogPosts),
    [circuitCms.researchSlides, blogPosts],
  );
  const ewcWindows = useMemo(
    () => mergeEwcWindows(ewcFloatingSlides(researchSlidesWithBlogCopy), circuitCms.records),
    [researchSlidesWithBlogCopy, circuitCms.records],
  );
  const floatingSlides = useMemo(
    () => assembleFloatingSlides({
      policy: floatingPolicyFromRecords(circuitCms.records),
      ewcWindows,
      records: circuitCms.records,
      blogSlides,
    }),
    [circuitCms.records, ewcWindows, blogSlides],
  );
  const homeSlides = useMemo(
    () => buildFeaturedWindows({
      floating: floatingSlides,
      research: researchSlidesWithBlogCopy,
    }),
    [floatingSlides, researchSlidesWithBlogCopy],
  );
  const vaultSlides = useMemo(() => {
    const seen = new Set();
    const floatKeys = new Set(floatingSlides.map((slide) => slide.slug || slide.id));
    // Public vault catalog: game vaults + live EWC years (no home event spotlights).
    // Specific events stay on home floating windows via buildFeaturedWindows.
    const liveEwcWindows = ewcWindows.filter((slide) => slide.floating === true);
    const customVaultWindows = floatingSlides.filter(
      (slide) => slide.surface === "vault" || slide.surface === "tournament",
    );
    return applyBlogExcerptsToSlides(
      mergeVaultMedia(
        [...liveEwcWindows, ...researchSlidesWithBlogCopy, ...customVaultWindows, ...blogSlides],
        liveEsportsBanners,
      ).filter((slide) => {
        const key = slide.slug || slide.id;
        if (!key || seen.has(key)) return false;
        // Drop event-spotlight clones — vault cards are game / EWC headers only.
        if (slide.spotlight === true && slide.surface !== "ewc-window") return false;
        seen.add(key);
        return true;
      }).map((slide) => ({
        ...slide,
        floating: floatKeys.has(slide.slug || slide.id),
        featured: false,
        ...(slide.surface === "ewc-window"
          ? {}
          : {
              spotlight: false,
              spotlightEdition: undefined,
              spotlightEventKey: undefined,
              eventName: "",
              title: slide.game || slide.title,
            }),
      })),
      blogPosts,
    );
  }, [floatingSlides, ewcWindows, researchSlidesWithBlogCopy, blogSlides, blogPosts, liveEsportsBanners]);
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
    if (!user) {
      setIsModerator(false);
      setSiteRole(null);
      setSupportPermissions(null);
      setSiteRoleResolved(true);
      setDeskGate(null);
      setDeskGateLoading(false);
      return undefined;
    }
    setSiteRoleResolved(false);
    setDeskGateLoading(true);
    const stopRole = onSnapshot(doc(SITE_ROLES_COLLECTION, user.uid), (snapshot) => {
      const data = snapshot.exists() ? snapshot.data() : null;
      const nextRole = data?.enabled !== false && ["owner", "support"].includes(data?.role) ? data.role : null;
      setSiteRole(nextRole);
      setSupportPermissions(nextRole === "support" ? normalizeSupportPermissions(data?.permissions) : null);
      setSiteRoleResolved(true);
    }, () => {
      setSiteRole(null);
      setSupportPermissions(null);
      setSiteRoleResolved(true);
    });
    const stopModerator = onSnapshot(doc(db, "moderators", user.uid), (snapshot) => {
      setIsModerator(snapshot.exists() && snapshot.data().enabled === true);
    }, () => setIsModerator(false));
    const [settingsCollection, gateId] = deskGateDocPath();
    const stopGate = onSnapshot(doc(db, settingsCollection, gateId), (snapshot) => {
      setDeskGate(snapshot.exists() ? snapshot.data() : null);
      setDeskGateLoading(false);
    }, () => {
      setDeskGate(null);
      setDeskGateLoading(false);
    });
    return () => { stopRole(); stopModerator(); stopGate(); };
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
  const unseenChatCount = useMemo(
    () => Object.values(chatUnreadByUid).filter((count) => Number(count) > 0).length,
    [chatUnreadByUid],
  );
  const markFriendChatSeen = useCallback((friendUid, conversationId, at = Date.now()) => {
    markChatConversationSeen(conversationId || chatConversationId(user?.uid, friendUid), at);
    setChatUnreadByUid((current) => {
      if (!friendUid || !current[friendUid]) return current;
      const next = { ...current };
      delete next[friendUid];
      return next;
    });
  }, [user?.uid]);
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

  useEffect(() => {
    const canReadPrivate = !!(user && (isModerator || siteRole === "owner" || siteRole === "support"));
    if (!canReadPrivate && !user) {
      setBlogPrivateById({});
      return undefined;
    }
    if (!canReadPrivate) {
      // Authors can read their own private meta for the posts they own.
      return onSnapshot(
        query(BLOG_PRIVATE_COLLECTION, where("authorId", "==", user.uid)),
        (snap) => {
          const next = {};
          snap.docs.forEach((item) => { next[item.id] = item.data(); });
          setBlogPrivateById(next);
        },
        () => setBlogPrivateById({}),
      );
    }
    return onSnapshot(
      BLOG_PRIVATE_COLLECTION,
      (snap) => {
        const next = {};
        snap.docs.forEach((item) => { next[item.id] = item.data(); });
        setBlogPrivateById(next);
      },
      () => setBlogPrivateById({}),
    );
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
      setSelectedRooms([]);
      setSelectedPromotions([]);
      return;
    }
    const unsubs = [
      onSnapshot(
        teamsCollectionRef(selectedId),
        (snap) => setSelectedTeams(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
        () => setSelectedTeams([]),
      ),
      onSnapshot(
        matchesCollectionRef(selectedId),
        (snap) => setSelectedMatches(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
        () => setSelectedMatches([]),
      ),
      onSnapshot(
        statsCollectionRef(selectedId),
        (snap) => setSelectedStats(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
        () => setSelectedStats([]),
      ),
      onSnapshot(
        roomsCollectionRef(selectedId),
        (snap) => setSelectedRooms(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
        () => setSelectedRooms([]),
      ),
      onSnapshot(
        promotionsCollectionRef(selectedId),
        (snap) => setSelectedPromotions(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
        () => setSelectedPromotions([]),
      ),
    ];
    return () => unsubs.forEach((u) => u());
  }, [selectedId]);

  useEffect(() => {
    if (!user) {
      setScrimAnnouncements([]);
      setOfficialHosts([]);
      setUserPrefs(null);
      setMyScrimHistory([]);
      return undefined;
    }
    const stops = [
      onSnapshot(SCRIM_ANNOUNCEMENTS_COLLECTION, (snap) => {
        setScrimAnnouncements(snap.docs.map((item) => ({ id: item.id, ...item.data() })));
      }, () => setScrimAnnouncements([])),
      onSnapshot(OFFICIAL_HOSTS_COLLECTION, (snap) => {
        setOfficialHosts(snap.docs.map((item) => ({ uid: item.id, ...item.data() })).filter((row) => row.enabled !== false));
      }, () => setOfficialHosts([])),
      onSnapshot(doc(HOST_REQUESTS_COLLECTION, user.uid), (snap) => {
        if (snap.exists()) setHostRequests((prev) => {
          const row = { id: snap.id, uid: snap.id, ...snap.data() };
          const rest = prev.filter((item) => item.id !== snap.id && item.uid !== snap.id);
          return [...rest, row];
        });
      }, () => {}),
      onSnapshot(userPrefsDocRef(user.uid), (snap) => {
        setUserPrefs(snap.exists() ? snap.data() : null);
      }, () => setUserPrefs(null)),
      onSnapshot(scrimHistoryCollectionRef(user.uid), (snap) => {
        setMyScrimHistory(snap.docs.map((item) => ({ id: item.id, ...item.data() })));
      }, () => setMyScrimHistory([])),
    ];
    return () => stops.forEach((stop) => stop());
  }, [user]);

  useEffect(() => {
    if (siteRole !== "owner" && siteRole !== "support") return undefined;
    return onSnapshot(HOST_REQUESTS_COLLECTION, (snap) => {
      setHostRequests(snap.docs.map((item) => ({ id: item.id, uid: item.id, ...item.data() })));
    }, () => setHostRequests([]));
  }, [siteRole]);

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
  const pendingFriendRequests = useMemo(
    () => friendRequests.filter((request) => request.recipientId === user?.uid && request.status === "pending"),
    [friendRequests, user?.uid],
  );
  const pendingFriendRequestCount = pendingFriendRequests.length;
  const knownPendingFriendIds = useRef(null);
  useEffect(() => {
    if (!user) {
      knownPendingFriendIds.current = null;
      return;
    }
    const ids = pendingFriendRequests.map((request) => request.id);
    if (knownPendingFriendIds.current === null) {
      knownPendingFriendIds.current = new Set(ids);
      return;
    }
    const fresh = pendingFriendRequests.filter((request) => !knownPendingFriendIds.current.has(request.id));
    ids.forEach((id) => knownPendingFriendIds.current.add(id));
    [...knownPendingFriendIds.current].forEach((id) => {
      if (!ids.includes(id)) knownPendingFriendIds.current.delete(id);
    });
    if (!fresh.length) return;
    if (normalizeNotifyPrefs(userPrefs || {}).friends === false) return;
    const name = fresh[0].requesterName || "Someone";
    showToast(fresh.length === 1 ? `${name} sent a friend request` : `${fresh.length} new friend requests`);
    setShowFriendRequests(true);
    document.querySelector("details[open]")?.removeAttribute("open");
  }, [pendingFriendRequests, user, userPrefs, showToast]);
  useEffect(() => {
    if (!user) { setMutedFriendIds([]); return; }
    try { setMutedFriendIds(JSON.parse(localStorage.getItem(`grindinfo-muted-chats:${user.uid}`) || "[]")); }
    catch { setMutedFriendIds([]); }
  }, [user]);
  const mutedFriendSet = useMemo(() => new Set(mutedFriendIds), [mutedFriendIds]);
  const chatFocusRef = useRef({ open: false, focusedUid: null });
  chatFocusRef.current = { open: chatPopupOpen, focusedUid: focusedChatUid };
  const acceptedFriendsByUid = useMemo(
    () => Object.fromEntries(acceptedFriends.map((friend) => [friend.uid, friend])),
    [acceptedFriendKey],
  );
  useEffect(() => {
    if (!user?.uid) {
      setChatUnreadByUid({});
      return undefined;
    }
    const messageStops = new Map();
    const stopAllMessages = () => {
      messageStops.forEach((stop) => stop?.());
      messageStops.clear();
    };
    const watchConversation = (conversationId, friendUid) => {
      if (!friendUid || mutedFriendSet.has(friendUid) || messageStops.has(conversationId)) return;
      const stop = onSnapshot(
        query(CHAT_MESSAGES_COLLECTION(conversationId), orderBy("createdAt", "desc"), limit(40)),
        (snapshot) => {
          const focus = chatFocusRef.current;
          const viewing = focus.open && focus.focusedUid === friendUid;
          if (viewing) {
            const latest = snapshot.docs[0]?.data()?.createdAt;
            markFriendChatSeen(friendUid, conversationId, Number(latest) || Date.now());
            return;
          }
          const seenAt = Number(readChatSeenMap()[conversationId]) || 0;
          const unread = snapshot.docs.filter((item) => {
            const data = item.data() || {};
            if (data.senderId === user.uid) return false;
            return Number(data.createdAt) > seenAt;
          }).length;
          setChatUnreadByUid((current) => {
            const prev = Number(current[friendUid]) || 0;
            if (unread === prev) return current;
            if (unread <= 0) {
              if (!prev) return current;
              const next = { ...current };
              delete next[friendUid];
              return next;
            }
            return { ...current, [friendUid]: unread };
          });
          if (unread > 0) {
            const friend = acceptedFriendsByUid[friendUid] || { uid: friendUid, name: "Friend" };
            setActiveChats((current) => {
              if (current.some((item) => item.uid === friendUid)) return current;
              return [...current, friend].slice(-CHAT_POPUP_MAX);
            });
          }
        },
        () => {},
      );
      messageStops.set(conversationId, stop);
    };
    const stopConversations = onSnapshot(
      query(CHAT_CONVERSATIONS_COLLECTION, where("participants", "array-contains", user.uid)),
      (snapshot) => {
        const liveIds = new Set();
        snapshot.docs.forEach((item) => {
          const participants = item.data()?.participants || [];
          const friendUid = participants.find((uid) => uid !== user.uid);
          if (!friendUid || mutedFriendSet.has(friendUid)) return;
          liveIds.add(item.id);
          watchConversation(item.id, friendUid);
        });
        [...messageStops.keys()].forEach((id) => {
          if (liveIds.has(id)) return;
          messageStops.get(id)?.();
          messageStops.delete(id);
        });
      },
      () => {
        stopAllMessages();
        setChatUnreadByUid({});
      },
    );
    return () => {
      stopConversations();
      stopAllMessages();
    };
  }, [user?.uid, mutedFriendSet, markFriendChatSeen, acceptedFriendsByUid]);
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
      const preferredTag = normalizePlayerTagInput(fields.playerTag);
      const previousName = playerNameFromInput(myProfile?.displayName || "");
      const hadTag = Boolean(myProfile?.playerTag);
      const nameChanged = hadTag && previousName.toLowerCase() !== displayName.toLowerCase();
      const usernameChanges = Number(myProfile?.usernameChanges || 0);
      if (nameChanged && usernameChanges >= 1) {
        showToast("Username can only be changed once.");
        return;
      }
      const nextUsernameChanges = nameChanged ? 1 : usernameChanges;
      const profileBody = {
        displayName,
        games: fields.games,
        region: String(fields.region || "").trim().slice(0, 60),
        lookingFor: normalizeLookingFor(fields.lookingFor),
        styles: normalizeStyles(fields.styles, fields.style),
        style: normalizeStyles(fields.styles, fields.style)[0] || "",
        languages: normalizeLanguages(fields.languages, fields.language),
        language: normalizeLanguages(fields.languages, fields.language)[0] || "",
        rank: normalizeRank(fields.rank),
        bio: String(fields.bio || "").slice(0, 200),
        discordHandle: String(fields.discordHandle || "").trim().slice(0, 40),
        avatar: fields.avatar,
        discoverable: fields.discoverable === true,
        updatedAt: Date.now(),
      };
      // Only persist usernameChanges after a rename (or if already set) so Firestore create/update stays valid.
      if (nameChanged || usernameChanges > 0) profileBody.usernameChanges = nextUsernameChanges;
      try {
        if (!myProfile?.playerTag) {
          await setDoc(playerDocRef(user.uid), profileBody, { merge: true });
        }
        const claimed = await claimUniqueHandle(
          user,
          displayName,
          myProfile?.playerTag || "",
          preferredTag || "",
        );
        await setDoc(playerDocRef(user.uid), { ...profileBody, playerTag: claimed.tag, handle: claimed.handle }, { merge: true });
        if (myProfile?.handle && myProfile.handle !== claimed.handle) {
          try { await deleteDoc(handleDocRef(myProfile.handle)); } catch { /* previous ID mapping can stay until overwritten */ }
        }
        try { await updateProfile(user, { displayName: grindHandle(displayName, claimed.tag) }); } catch { /* Auth display name stays as the player name if this fails */ }
        const wantScrims = fields.notifyScrims !== false;
        try {
          await setDoc(userPrefsDocRef(user.uid), {
            notifyChannelsChosen: true,
            scrimAlertsEnabled: wantScrims,
            scrimAlertGames: wantScrims ? (fields.games || []).map(String).filter(Boolean).slice(0, 20) : [],
            notifyFriends: userPrefs?.notifyFriends !== false,
            notifyChats: userPrefs?.notifyChats !== false,
            notifyBlogs: userPrefs?.notifyBlogs !== false,
            updatedAt: Date.now(),
          }, { merge: true });
        } catch { /* prefs are best-effort; profile already saved */ }
        showToast(`Profile saved · ${grindHandle(displayName, claimed.tag)}`);
      } catch (e) {
        showToast(e?.message || "Couldn't save profile — try again");
        return;
      }
      setShowProfileModal(false);
    },
    [user, myProfile, userPrefs, showToast]
  );

  // ---- mutations (now writing to the tournaments collection + sub-collections) ----
  const addTournament = async (t) => {
    if (!user) return;
    if (myAccess?.restricted) { showToast("This account is restricted from hosting tournaments."); return; }
    setSaving(true);
    try {
      const { roomId, roomPassword, publishAnnouncement, ...event } = t;
      const joinMode = event.joinMode === "open" ? "open" : event.joinMode === "invite" ? "invite" : "request";
      const published = joinMode === "open" && publishAnnouncement !== false;
      const hostName = grindHandle(safeProfileName(myProfile?.displayName, user.displayName), myProfile?.playerTag);
      const payload = {
        name: String(event.name || "").slice(0, 120),
        game: String(event.game || "").slice(0, 60),
        format: String(event.format || "").slice(0, 60),
        startDate: String(event.startDate || "").slice(0, 40),
        endDate: String(event.endDate || "").slice(0, 40),
        prizeAmount: Number(event.prizeAmount) || 0,
        prizeCurrency: event.prizeCurrency || "INR",
        registrationOpen: true,
        adminUserId: user.uid,
        adminDisplayName: hostName,
        coAdminUserIds: [],
        coAdminPlayerTags: {},
        status: event.status || "upcoming",
        kind: event.kind || (event.format === "Custom room" ? "custom_room" : "bracket"),
        joinMode,
        publicStats: joinMode === "open" ? true : event.publicStats === true,
        requireRequest: event.requireRequest === true,
        maxSlots: Math.max(0, Math.min(256, Math.trunc(Number(event.maxSlots) || 0))),
        region: REGIONS.includes(event.region) ? event.region : "",
        rankBand: RANK_BANDS.includes(event.rankBand) ? event.rankBand : "",
        blurb: String(event.blurb || "").slice(0, 400),
        posterUrl: String(event.posterUrl || "").slice(0, 500000),
        published,
        publishedAt: published ? Date.now() : 0,
        isLegacyImport: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const created = await addDoc(TOURNAMENTS_COLLECTION, payload);
      const nextRoom = String(roomId || "").trim();
      const nextPassword = String(roomPassword || "").trim();
      if (nextRoom && nextPassword) {
        await setDoc(lobbyCredentialsRef(created.id), { roomId: nextRoom.slice(0, 40), roomPassword: nextPassword.slice(0, 40), updatedAt: Date.now() });
      }
      if (published) {
        try {
          await setDoc(doc(SCRIM_ANNOUNCEMENTS_COLLECTION, created.id), buildScrimAnnouncement({ ...payload, id: created.id }, { tournamentId: created.id }));
        } catch {
          /* announcement is best-effort; scrim still created */
        }
      }
      showToast(published ? "Scrim published" : joinMode === "invite" ? "Invite-only scrim created" : "Scrim created");
      setShowNewTournament(false);
      navigate(`/tournaments/${created.id}`);
    } catch (e) {
      showToast(e?.message || "Couldn't create tournament — try again");
    } finally {
      setSaving(false);
    }
  };

  const refreshInternationalTrack = async (tournamentId, {
    rooms = null,
    results = null,
    standings = null,
    resultsPostedAt = null,
  } = {}) => {
    const tournament = tournaments.find((item) => item.id === tournamentId) || selected;
    if (!tournament || tournament.id !== tournamentId) return null;
    const roomList = rooms || selectedRooms;
    const nextResults = results !== null ? results : tournament.results;
    const nextStandings = standings !== null ? standings : tournament.standings;
    const postedAt = resultsPostedAt != null
      ? resultsPostedAt
      : (tournament.resultsPostedAt || (hasPostedResults({ results: nextResults }) ? tournament.archivedAt : null));
    const track = buildInternationalTrack({
      game: tournament.game,
      rooms: roomList,
      results: nextResults,
      standings: nextStandings,
      resultsPostedAt: postedAt,
      previous: tournament.internationalTrack,
    });
    await updateDoc(tournamentDocRef(tournamentId), {
      internationalTrack: track,
      ...(postedAt ? { resultsPostedAt: postedAt } : {}),
      updatedAt: Date.now(),
    });
    return track;
  };

  const saveTournamentResults = async (id, results) => {
    setSaving(true);
    try {
      const now = Date.now();
      const rooms = selectedRooms.map((room) => (
        room.status === "active"
          ? { ...room, status: "collapsed", collapsedAt: room.collapsedAt || now }
          : room
      ));
      const track = buildInternationalTrack({
        game: selected?.game || tournaments.find((item) => item.id === id)?.game,
        rooms,
        results,
        standings: selected?.standings,
        resultsPostedAt: now,
        previous: selected?.internationalTrack,
      });
      await updateDoc(tournamentDocRef(id), {
        results,
        status: "completed",
        registrationOpen: false,
        archived: true,
        archivedAt: now,
        resultsPostedAt: now,
        internationalTrack: track,
        updatedAt: now,
      });
      await Promise.all(
        selectedRooms
          .filter((room) => room.status === "active")
          .map((room) => updateDoc(doc(roomsCollectionRef(id), room.id), {
            status: "collapsed",
            collapsedAt: room.collapsedAt || now,
            updatedAt: now,
          }).catch(() => null)),
      );
      showToast(
        track.complete
          ? "Results posted · international desk complete"
          : track.reason
            ? `Results posted · ${track.reason}`
            : "Tournament results posted",
      );
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
    const openJoin = event?.joinMode === "open" && event?.requireRequest !== true;
    const entryType = player?.entryType === "squad" || player?.entryType === "roster"
      ? player.entryType
      : "solo";
    const squadMemberIds = entryType === "solo"
      ? [user.uid]
      : [...new Set([user.uid, ...(player.squadMemberIds || [])].map(String).filter(Boolean))].slice(0, 8);
    if ((entryType === "squad" || entryType === "roster") && squadMemberIds.length < 2) {
      showToast("Add at least one more GrindInfo player for a squad / roster join.");
      return;
    }
    try {
      const registrationBody = {
        playerId: user.uid,
        displayName: safeProfileName(player.displayName),
        status: openJoin ? "approved" : "pending",
        requestedAt: Date.now(),
        entryType,
        squadMemberIds,
        attendance: "pending",
        rosterName: entryType === "roster" ? String(player.rosterName || "My squad").slice(0, 40) : "",
      };
      await setDoc(doc(registrationsCollectionRef(tournamentId), user.uid), registrationBody);
      await upsertScrimHistory(event, registrationBody);
      showToast(openJoin
        ? (scrimRequiresCheckIn(event) ? "You're in. Check in to unlock room codes." : "You're in. Room details appear if the host posted them.")
        : "Join request sent to the tournament host");
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

  const checkInRegistration = async (tournamentId) => {
    if (!user) return;
    try {
      await updateDoc(doc(registrationsCollectionRef(tournamentId), user.uid), {
        attendance: "checked_in",
        checkedInAt: Date.now(),
      });
      const event = tournaments.find((item) => item.id === tournamentId);
      const mine = selectedRegistrations.find((row) => row.playerId === user.uid);
      if (event) await upsertScrimHistory(event, { ...mine, status: "approved", attendance: "checked_in" });
      showToast("Checked in — room codes unlock when the host posts them");
    } catch (e) {
      showToast(e?.code === "permission-denied"
        ? "Check-in blocked. You need an approved seat first."
        : "Couldn't check in.");
    }
  };

  const markRegistrationAttendance = async (tournamentId, requestId, attendance) => {
    try {
      const patch = { attendance };
      if (attendance === "checked_in") patch.checkedInAt = Date.now();
      await updateDoc(doc(registrationsCollectionRef(tournamentId), requestId), patch);
      showToast(attendance === "no_show" ? "Marked no-show" : "Marked checked in");
    } catch {
      showToast("Couldn't update attendance");
    }
  };

  const saveTournamentStandings = async (tournamentId, standings) => {
    try {
      const track = buildInternationalTrack({
        game: selected?.game || tournaments.find((item) => item.id === tournamentId)?.game,
        rooms: selectedRooms,
        results: selected?.results,
        standings,
        resultsPostedAt: selected?.resultsPostedAt,
        previous: selected?.internationalTrack,
      });
      await updateDoc(tournamentDocRef(tournamentId), {
        standings: standings || [],
        internationalTrack: track,
        updatedAt: Date.now(),
      });
      showToast("Standings saved");
    } catch {
      showToast("Couldn't save standings. Publish latest Firestore rules.");
      throw new Error("standings-save-failed");
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
      showToast("Scrim settings saved");
    } catch (e) {
      showToast("Couldn't update scrim settings. Check Firestore rules.");
    }
  };

  const submitBlogPost = async (post) => {
    try {
      const requesterName = safeProfileName(myProfile?.displayName, user.displayName);
      const anonymous = post.anonymous === true;
      const { anonymous: _anonFlag, ...publicFields } = post;
      const createdAt = Date.now();
      const postRef = doc(BLOG_POSTS_COLLECTION);
      const batch = writeBatch(db);
      batch.set(postRef, {
        ...publicFields,
        eventScope: post.eventScope || "random",
        authorId: user.uid,
        authorName: anonymous ? "Anonymous" : requesterName,
        anonymous,
        status: "pending",
        createdAt,
      });
      batch.set(blogPrivateDocRef(postRef.id), {
        authorId: user.uid,
        requesterName,
        anonymous,
        createdAt,
      });
      await batch.commit();
      showToast(anonymous ? "Anonymous blog request sent for review" : "Blog request sent for review");
    }
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

  const queueSupportChange = async (fields) => {
    await staffChanges.submit(fields);
    showToast("Sent to the owner for approval");
    return true;
  };

  const saveCircuit = async (draft) => {
    const id = draft.id || `cms-${Date.now().toString(36)}`;
    const record = { ...draft, id };
    if (siteRole === "support") {
      if (supportCanDirectAction(supportPermissions, "cms_upsert")) {
        return circuitCms.upsert(record);
      }
      await queueSupportChange({
        action: "cms_upsert",
        targetType: "circuitCms",
        targetId: id,
        targetLabel: record.title || record.game || id,
        summary: `Update ${record.title || record.surface || "desk record"}`,
        payload: record,
      });
      return record;
    }
    return circuitCms.upsert(record);
  };

  const deleteCircuit = async (id) => {
    if (siteRole === "support") {
      if (supportCanDirectAction(supportPermissions, "cms_delete")) {
        return circuitCms.remove(id);
      }
      await queueSupportChange({
        action: "cms_delete",
        targetType: "circuitCms",
        targetId: id,
        targetLabel: id,
        summary: `Move desk record ${id} to bin`,
        payload: { id },
      });
      return;
    }
    return circuitCms.remove(id);
  };

  const restoreCircuit = async (id) => {
    if (siteRole !== "owner" && !supportCanDirectAction(supportPermissions, "cms_upsert")) {
      showToast("Only the owner (or direct-edit support) can restore from the bin.");
      return;
    }
    await circuitCms.restore(id);
    showToast("Restored from bin");
  };

  const purgeCircuit = async (id) => {
    if (siteRole !== "owner" && !supportCanDirectAction(supportPermissions, "cms_delete")) {
      showToast("Only the owner (or direct-delete support) can permanently delete.");
      return;
    }
    await circuitCms.purge(id);
    showToast("Permanently deleted");
  };

  const reviewBlogPost = async (postId, status) => {
    if (siteRole === "support" && !supportCanDirectAction(supportPermissions, "blog_review")) {
      await queueSupportChange({
        action: "blog_review",
        targetType: "blog",
        targetId: postId,
        targetLabel: postId,
        summary: `Mark blog ${status}`,
        payload: { postId, status },
      });
      return;
    }
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
    batch.delete(blogPrivateDocRef(post.id));
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
    showToast(isPublicScrim(tournaments.find((item) => item.id === tournamentId))
      ? "Room details shared with public scrim viewers"
      : "Room details shared with approved players");
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
    const inviteeName = safeProfileName(friend.name || friend.displayName);
    try {
      await setDoc(inviteRef, {
        tournamentId: tournament.id,
        tournamentName: String(tournament.name || "Tournament").slice(0, 120),
        game: String(tournament.game || "").slice(0, 60),
        invitedBy: user.uid,
        inviterName: safeProfileName(myProfile?.displayName, user.displayName),
        inviteeUid: friend.uid,
        inviteeName,
        status: "pending",
        createdAt: Date.now(),
      });
      showToast(`Invitation sent to ${inviteeName}`);
    } catch (error) {
      showToast(error?.code === "permission-denied"
        ? "Invite blocked. Publish latest Firestore rules, or invite as host / accepted friend."
        : "An invite is already waiting or could not be sent.");
      throw error;
    }
  };

  const scrimAlerts = useMemo(
    () => normalizeScrimAlerts(userPrefs || {}, myProfile?.games || []),
    [userPrefs, myProfile?.games],
  );

  const notifyPrefs = useMemo(() => normalizeNotifyPrefs(userPrefs || {}), [userPrefs]);

  const savedSquad = useMemo(() => normalizeSavedSquad(userPrefs || {}), [userPrefs]);

  const hostVerifyNotifiedGames = useMemo(() => {
    const map = userPrefs?.hostVerifyNotifiedGames;
    if (map && typeof map === "object") return map;
    // Legacy single notify → treat as notified for current best only after migration write.
    return {};
  }, [userPrefs?.hostVerifyNotifiedGames]);

  const hostVerification = useMemo(
    () => (user
      ? evaluateHostVerification(tournaments, user.uid, { notifiedGames: hostVerifyNotifiedGames })
      : evaluateHostVerification([], null)),
    [tournaments, user, hostVerifyNotifiedGames],
  );

  const hostVerifyPromptDismissed = Boolean(userPrefs?.hostVerifyPromptDismissedAt);
  const isVerifiedHost = Boolean(user && officialHosts.some((host) => host.uid === user.uid && host.enabled !== false));
  const hostVerifyPending = Boolean(
    user && hostRequests.some((row) => (row.uid === user.uid || row.id === user.uid) && row.status === "pending"),
  );
  const showHostVerifyPrompt = Boolean(
    user && hostVerification.eligible && !isVerifiedHost && !hostVerifyPending && !hostVerifyPromptDismissed,
  );

  useEffect(() => {
    if (!user || isVerifiedHost || hostVerifyPending) return;
    const needing = hostVerifyGamesNeedingNotify(hostVerification, hostVerifyNotifiedGames);
    if (!needing.length) return;
    let cancelled = false;
    (async () => {
      const now = Date.now();
      const nextNotified = { ...hostVerifyNotifiedGames };
      needing.forEach((row) => {
        nextNotified[row.game] = now;
      });
      try {
        await setDoc(userPrefsDocRef(user.uid), {
          hostVerifyNotifiedAt: now,
          hostVerifyNotifiedGames: nextNotified,
          // Re-surface banner when a new game unlocks review.
          hostVerifyPromptDismissedAt: null,
          updatedAt: now,
        }, { merge: true });
        if (!cancelled) {
          needing.forEach((row) => {
            showToast(
              `Verification review · ${row.game} (${row.count}/${row.threshold}) · ${row.pathLabel}`,
            );
          });
        }
      } catch {
        /* prefs write is best-effort */
      }
    })();
    return () => { cancelled = true; };
  }, [
    user,
    hostVerification,
    hostVerifyNotifiedGames,
    isVerifiedHost,
    hostVerifyPending,
  ]);

  const saveScrimAlerts = async (next) => {
    if (!user) return;
    const body = {
      showWeeklyPanel: userPrefs?.showWeeklyPanel !== false,
      digestOptIn: next.digestOptIn === true || (next.digestOptIn == null && userPrefs?.digestOptIn === true),
      browserPushOptIn: next.browserPushOptIn === true || (next.browserPushOptIn == null && userPrefs?.browserPushOptIn === true),
      scrimAlertsEnabled: next.enabled !== false,
      scrimAlertModes: next.modes || "both",
      scrimAlertGames: (next.games || []).slice(0, 20),
      followedHosts: (next.followedHosts || []).slice(0, 80),
      scrimAlertsLastSeenAt: Number(next.lastSeenAt) || Number(userPrefs?.scrimAlertsLastSeenAt) || 0,
      notifyChannelsChosen: next.notifyChannelsChosen === true || userPrefs?.notifyChannelsChosen === true,
      notifyFriends: next.notifyFriends != null ? next.notifyFriends !== false : userPrefs?.notifyFriends !== false,
      notifyChats: next.notifyChats != null ? next.notifyChats !== false : userPrefs?.notifyChats !== false,
      notifyBlogs: next.notifyBlogs != null ? next.notifyBlogs !== false : userPrefs?.notifyBlogs !== false,
      savedSquadName: next.savedSquadName != null ? String(next.savedSquadName).slice(0, 40) : (userPrefs?.savedSquadName || "My squad"),
      savedSquadMemberIds: Array.isArray(next.savedSquadMemberIds)
        ? next.savedSquadMemberIds.map(String).filter(Boolean).slice(0, 7)
        : (userPrefs?.savedSquadMemberIds || []),
      updatedAt: Date.now(),
    };
    try {
      await setDoc(userPrefsDocRef(user.uid), body, { merge: true });
    } catch {
      showToast("Couldn't save scrim alert prefs");
    }
  };

  const setNotifyChannel = async (channel, enabled) => {
    if (!user) return;
    const next = {
      ...scrimAlerts,
      notifyChannelsChosen: true,
      notifyFriends: notifyPrefs.friends,
      notifyChats: notifyPrefs.chats,
      notifyBlogs: notifyPrefs.blogs,
    };
    if (channel === "scrims") next.enabled = enabled;
    if (channel === "friends") next.notifyFriends = enabled;
    if (channel === "chats") next.notifyChats = enabled;
    if (channel === "blogs") next.notifyBlogs = enabled;
    if (channel === "scrims" && enabled && !(next.games || []).length) {
      next.games = (myProfile?.games || []).map(String).filter(Boolean).slice(0, 20);
    }
    await saveScrimAlerts(next);
  };

  const chooseScrimNotifyPrompt = async (want) => {
    if (!user) return;
    await saveScrimAlerts({
      ...scrimAlerts,
      enabled: want === true,
      games: want ? (myProfile?.games || []).map(String).filter(Boolean).slice(0, 20) : (scrimAlerts.games || []),
      notifyChannelsChosen: true,
      notifyFriends: notifyPrefs.friends,
      notifyChats: notifyPrefs.chats,
      notifyBlogs: notifyPrefs.blogs,
    });
    showToast(want ? "Scrim alerts on for your games" : "Scrim alerts off — turn on anytime");
  };

  const saveSavedRoster = async ({ name, memberIds }) => {
    await saveScrimAlerts({
      ...scrimAlerts,
      savedSquadName: String(name || "My squad").slice(0, 40),
      savedSquadMemberIds: (memberIds || []).map(String).filter(Boolean).slice(0, 7),
    });
    showToast("Roster saved for one-tap joins");
  };

  const markScrimAlertsSeen = async () => {
    if (!user) return;
    await saveScrimAlerts({ ...scrimAlerts, lastSeenAt: Date.now() });
  };

  const toggleFollowHost = async (hostUid, follow) => {
    if (!user || !hostUid) return;
    const followedHosts = follow
      ? [...new Set([...(scrimAlerts.followedHosts || []), hostUid])].slice(0, 80)
      : (scrimAlerts.followedHosts || []).filter((id) => id !== hostUid);
    await saveScrimAlerts({
      ...scrimAlerts,
      followedHosts,
      enabled: follow ? true : scrimAlerts.enabled,
      notifyChannelsChosen: true,
      notifyFriends: notifyPrefs.friends,
      notifyChats: notifyPrefs.chats,
      notifyBlogs: notifyPrefs.blogs,
    });
    showToast(follow ? "Following host — flyers hit your bell" : "Unfollowed host");
  };

  const toggleAlertGame = async (game, follow) => {
    if (!user || !game) return;
    const key = String(game);
    const current = scrimAlerts.games || [];
    const games = follow
      ? [...new Set([...current, key])].slice(0, 20)
      : current.filter((item) => String(item).toLowerCase() !== key.toLowerCase());
    await saveScrimAlerts({
      ...scrimAlerts,
      games,
      enabled: follow ? true : scrimAlerts.enabled,
      notifyChannelsChosen: true,
      notifyFriends: notifyPrefs.friends,
      notifyChats: notifyPrefs.chats,
      notifyBlogs: notifyPrefs.blogs,
    });
    showToast(follow ? `Following ${key} scrims` : `Stopped ${key} alerts`);
  };

  const addTournamentRoom = async (tournamentId, room) => {
    const code = String(room.roomCode || room.title || "1").slice(0, 16);
    const stage = room.stage || "group";
    await addDoc(roomsCollectionRef(tournamentId), {
      index: Number(room.index) || 0,
      roomCode: code,
      title: String(room.title || code).slice(0, 80),
      stage,
      status: "pending",
      capacity: Math.max(0, Math.min(256, Number(room.capacity) || 0)),
      updatedAt: Date.now(),
    });
    const nextRooms = [
      ...selectedRooms,
      { stage, status: "pending", roomCode: code, title: room.title || code },
    ];
    await refreshInternationalTrack(tournamentId, { rooms: nextRooms });
  };

  const activateTournamentRoom = async (tournamentId, roomId, credentials) => {
    const now = Date.now();
    const active = selectedRooms.filter((room) => room.status === "active");
    await Promise.all(active.map((room) => updateDoc(doc(roomsCollectionRef(tournamentId), room.id), {
      status: "collapsed",
      collapsedAt: now,
      updatedAt: now,
    })));
    await updateDoc(doc(roomsCollectionRef(tournamentId), roomId), {
      status: "active",
      roomId: String(credentials.roomId || "").slice(0, 40),
      roomPassword: String(credentials.roomPassword || "").slice(0, 40),
      publishedAt: now,
      activatedAt: now,
      updatedAt: now,
    });
    await setDoc(lobbyCredentialsRef(tournamentId), {
      roomId: String(credentials.roomId || "").slice(0, 40),
      roomPassword: String(credentials.roomPassword || "").slice(0, 40),
      updatedAt: now,
    });
    const nextRooms = selectedRooms.map((room) => {
      if (room.id === roomId) {
        return { ...room, status: "active", activatedAt: now, publishedAt: now };
      }
      if (active.some((item) => item.id === room.id)) {
        return { ...room, status: "collapsed", collapsedAt: now };
      }
      return room;
    });
    const track = await refreshInternationalTrack(tournamentId, { rooms: nextRooms });
    showToast(
      track?.missingStages?.length
        ? `Room live · still need ${track.missingStages.join(", ")} for a complete desk`
        : "Room activated — previous stage collapsed",
    );
  };

  const promoteTournamentPlayers = async (tournamentId, { fromRoomId, toRoomId, playerIds, mode = "manual", unitCount = 0 }) => {
    const ids = [...new Set((playerIds || []).map(String).filter(Boolean))].slice(0, 64);
    if (!ids.length) return;
    await addDoc(promotionsCollectionRef(tournamentId), {
      fromRoomId,
      toRoomId,
      playerIds: ids,
      promotedBy: user.uid,
      at: Date.now(),
      mode: mode === "auto" ? "auto" : "manual",
      unitCount: Math.max(0, Math.min(64, Number(unitCount) || 0)),
    });
    await Promise.all(ids.map((playerId) => updateDoc(doc(registrationsCollectionRef(tournamentId), playerId), {
      currentRoomId: toRoomId,
    }).catch(() => null)));
    showToast(`${mode === "auto" ? "Auto-allocated" : "Allocated"} ${ids.length} player(s)`);
  };

  const requestOfficialHost = async ({ orgName, message, displayName, verification } = {}) => {
    if (!user) return;
    const evalState = verification || hostVerification;
    if (!evalState?.eligible) {
      throw new Error(evalState?.summary || "Host more successful full-scale scrims before requesting a badge.");
    }
    if (officialHosts.some((host) => host.uid === user.uid && host.enabled !== false)) {
      throw new Error("You are already a verified host.");
    }
    const meta = hostVerificationRequestMeta(evalState);
    await setDoc(doc(HOST_REQUESTS_COLLECTION, user.uid), {
      uid: user.uid,
      orgName: String(orgName || "").slice(0, 60),
      displayName: String(displayName || "").slice(0, 40),
      message: String(message || "").slice(0, 400),
      status: "pending",
      ...meta,
      statusTrack: evalState.byGame?.slice(0, 8) || [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  };

  const dismissHostVerifyPrompt = async () => {
    if (!user) return;
    try {
      await setDoc(userPrefsDocRef(user.uid), {
        hostVerifyPromptDismissedAt: Date.now(),
        updatedAt: Date.now(),
      }, { merge: true });
    } catch {
      /* ignore */
    }
  };

  const decideHostRequest = async (row, status) => {
    if (!row?.uid && !row?.id) return;
    const uid = row.uid || row.id;
    await updateDoc(doc(HOST_REQUESTS_COLLECTION, uid), {
      status,
      reviewedAt: Date.now(),
      reviewedBy: user.uid,
      updatedAt: Date.now(),
    });
    if (status === "approved") {
      await setDoc(doc(OFFICIAL_HOSTS_COLLECTION, uid), {
        orgName: row.orgName || row.displayName || uid,
        displayName: row.displayName || "",
        enabled: true,
        verifiedAt: Date.now(),
        verifiedBy: user.uid,
      }, { merge: true });
      showToast("Official host approved");
    } else {
      showToast("Host request declined");
    }
  };

  const decideTournamentInvite = async (inviteId, status) => {
    try {
      await updateDoc(doc(TOURNAMENT_INVITES_COLLECTION, inviteId), { status, respondedAt: Date.now() });
      showToast(status === "accepted" ? "Invite accepted. Open the tournament and send your join request." : "Invite declined");
    } catch { showToast("Couldn't update the tournament invite. Check that the Firestore rules are published."); }
  };

  const upsertScrimHistory = async (tournament, registration) => {
    if (!user?.uid || !tournament?.id) return;
    try {
      await setDoc(
        scrimHistoryDocRef(user.uid, tournament.id),
        buildScrimHistoryEntry(tournament, registration),
        { merge: true },
      );
    } catch {
      /* history is best-effort; join still succeeds */
    }
  };

  const shareTournament = async (tournament, { watch = false } = {}) => {
    const path = watch ? `/tournaments/${tournament.id}/watch` : `/tournaments/${tournament.id}`;
    const url = `${window.location.origin}${path}`;
    try { await navigator.clipboard.writeText(url); showToast(watch ? "Watch link copied" : "Tournament link copied"); }
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
    try {
      await batch.commit();
      setActiveChats((current) => {
        const next = current.filter((item) => item.uid !== friend.uid);
        setFocusedChatUid((focused) => (focused === friend.uid ? (next[0]?.uid || null) : focused));
        if (!next.length) setChatPopupOpen(false);
        return next;
      });
      showToast(`${friend.name} blocked`);
    }
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
    if (siteRole === "support" && !supportCanDirectAction(supportPermissions, "archive_decision")) {
      await queueSupportChange({
        action: "archive_decision",
        targetType: "archiveSubmission",
        targetId: requestId,
        targetLabel: requestId,
        summary: `Vault request ${status}`,
        payload: { requestId, status },
      });
      return;
    }
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
    if (siteRole === "support" && !supportCanDirectAction(supportPermissions, "blog_promote")) {
      await queueSupportChange({
        action: "blog_promote",
        targetType: "blog",
        targetId: post.id,
        targetLabel: post.title,
        summary: `Promote blog ${post.title} into The Vault`,
        payload: { post, fields },
      });
      return;
    }
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
    if (siteRole === "support" && !supportHas(supportPermissions, "reportsTriage")) {
      showToast("Your support account cannot triage reports.");
      return;
    }
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

  const reviewSupportChange = async (item, status) => {
    if (siteRole !== "owner" || !item?.id) return;
    try {
      if (status === "approved") {
        if (!isAllowedSupportAction(item.action)) {
          showToast("Unknown support action — denied for safety. Ask support to resubmit with a known action.");
          await staffChanges.review(item.id, "denied", "Blocked: action not on allowlist");
          return;
        }
        if (item.action === "cms_upsert" && item.payload) await circuitCms.upsert(item.payload);
        else if (item.action === "cms_delete") await circuitCms.remove(item.payload?.id || item.targetId);
        else if (item.action === "blog_review" && item.payload?.postId) {
          const next = item.payload.status;
          const batch = writeBatch(db);
          batch.update(doc(BLOG_POSTS_COLLECTION, item.payload.postId), { status: next, reviewedAt: Date.now(), reviewedBy: user.uid });
          appendStaffAction(batch, next === "published" ? "blog_published" : "blog_declined", "blog", item.payload.postId, `Blog ${next}: ${item.payload.postId}`);
          await batch.commit();
        } else if (item.action === "archive_decision" && item.payload?.requestId) {
          await decideArchiveSubmission(item.payload.requestId, item.payload.status);
        } else if (item.action === "blog_promote" && item.payload?.post) {
          await promoteBlogToArchive(item.payload.post, item.payload.fields || {});
        }
      }
      await staffChanges.review(item.id, status);
      const log = writeBatch(db);
      appendStaffAction(log, status === "approved" ? "support_change_approved" : "support_change_denied", "supportChange", item.id, `${status === "approved" ? "Accepted" : "Denied"}: ${item.summary}`);
      await log.commit();
      showToast(status === "approved" ? "Support change accepted" : "Support change denied");
    } catch {
      showToast("Could not review this support change. Publish the latest Firestore rules and try again.");
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

  const setSupportAccess = async (targetUid, enabled, permissions = null) => {
    if (siteRole !== "owner" || targetUid === user?.uid) throw new Error("Owner access required");
    const ref = doc(SITE_ROLES_COLLECTION, targetUid);
    const batch = writeBatch(db);
    if (enabled) {
      batch.set(ref, {
        role: "support",
        enabled: true,
        updatedAt: Date.now(),
        permissions: normalizeSupportPermissions(permissions),
      });
    } else {
      batch.update(ref, { enabled: false, updatedAt: Date.now() });
    }
    appendStaffAction(batch, enabled ? "support_granted" : "support_revoked", "support", targetUid, `${enabled ? "Support access granted" : "Support access removed"} for ${targetUid}`);
    await batch.commit();
    showToast(enabled ? "Support access granted" : "Support access removed");
  };

  const saveDeskRolePassword = async (role, hash) => {
    if (siteRole !== "owner") throw new Error("Only the owner can set desk passwords.");
    const field = hashFieldForRole(role);
    const payload = {
      ownerHash: String(deskGate?.ownerHash || ""),
      supportHash: String(deskGate?.supportHash || ""),
      [field]: hash,
      updatedAt: Date.now(),
      updatedBy: user.uid,
    };
    const [settingsCollection, gateId] = deskGateDocPath();
    await setDoc(doc(db, settingsCollection, gateId), payload, { merge: true });
    setDeskGate(payload);
    showToast(`${role === "owner" ? "Owner" : "Support"} desk password saved`);
  };

  const saveSupportPermissions = async (targetUid, permissions) => {
    if (siteRole !== "owner" || !targetUid) throw new Error("Owner access required");
    const ref = doc(SITE_ROLES_COLLECTION, targetUid);
    const batch = writeBatch(db);
    batch.update(ref, {
      permissions: normalizeSupportPermissions(permissions),
      updatedAt: Date.now(),
    });
    appendStaffAction(batch, "support_permissions_updated", "support", targetUid, `Support permissions updated for ${targetUid}`);
    await batch.commit();
    showToast("Support permissions saved");
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

  // Keep participation history in sync when the open scrim updates your seat / results.
  useEffect(() => {
    if (!user?.uid || !selected?.id) return;
    const mine = selectedRegistrations.find((row) => row.playerId === user.uid);
    if (!mine) return;
    upsertScrimHistory(selected, mine);
  }, [user?.uid, selected?.id, selected?.results?.winner, selectedRegistrations]);

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
                  <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-neon">Staff portal</span>
                  <Link to="/" className="font-mono text-xs uppercase tracking-wider text-stone-400 hover:text-white">Leave portal</Link>
                </div>
              </header>
              <div className="mx-auto max-w-6xl px-5 pb-24">
                <StaffDeskGate
                  role={dashboardRole}
                  gate={deskGate}
                  gateLoading={deskGateLoading}
                  isOwner={dashboardRole === "owner"}
                  onSaveRolePassword={saveDeskRolePassword}
                >
                  {vaultEditId ? (
                    <VaultResearchDesk
                      focusId={decodeURIComponent(vaultEditId)}
                      records={circuitCms.records}
                      deletedRecords={circuitCms.deletedRecords}
                      role={siteRole || "support"}
                      onSave={saveCircuit}
                      onDelete={deleteCircuit}
                      onRestore={restoreCircuit}
                      onPurge={purgeCircuit}
                      filterGames={circuitCms.filterGames}
                    />
                  ) : (
                    <OwnerDashboard
                      key={dashTabHint}
                      initialTab={dashTabHint}
                      circuitRecords={circuitCms.records}
                      onSaveCircuit={saveCircuit}
                      onDeleteCircuit={deleteCircuit}
                      deletedCircuitRecords={circuitCms.deletedRecords}
                      onRestoreCircuit={restoreCircuit}
                      onPurgeCircuit={purgeCircuit}
                      ewcWindows={ewcWindows}
                      blogSlides={blogSlides}
                      supportChanges={staffChanges.requests}
                      onReviewSupportChange={reviewSupportChange}
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
                      onSaveSupportPermissions={saveSupportPermissions}
                      supportPermissions={supportPermissions}
                      tournaments={tournaments}
                      archiveEntries={archiveEntries}
                      blogPosts={blogPosts}
                      blogPrivateById={blogPrivateById}
                      onBlogReview={reviewBlogPost}
                      onPromoteBlog={promoteBlogToArchive}
                      archiveSubmissions={archiveSubmissions}
                      onArchiveDecision={decideArchiveSubmission}
                      auditLog={auditLog}
                      onOpenTournament={(id) => navigate(`/tournaments/${id}`)}
                      onImportArchive={importArchiveEntries}
                      filterGames={circuitCms.filterGames}
                      deskGate={deskGate}
                      onSaveDeskPassword={saveDeskRolePassword}
                    />
                  )}
                </StaffDeskGate>
              </div>
            </div>
          ) : <Navigate to="/" replace />
        )}

        {!needsAuthChoice && !routePath.startsWith("/admin") && (
          <>
            <div style={{ position: "relative", zIndex: 55 }}>
              <Header
                saving={saving}
                user={user}
                guestMode={guestMode}
                onSignInClick={() => { setKnownAccounts(readKnownAccounts()); setAuthDialogOpen((open) => !open); }}
                onSignOut={handleSignOut}
                onSwitchAccount={handleSwitchAccount}
                onEditProfile={() => { setProfileModalTab("profile"); setShowProfileModal(true); }}
                onOpenAccountInfo={() => { setProfileModalTab("account"); setShowProfileModal(true); }}
                dashboardRole={dashboardRole}
                playerTag={myProfile?.playerTag}
                profile={myProfile}
                scrimBell={user ? (
                  <ScrimBell
                    announcements={scrimAnnouncements}
                    alerts={scrimAlerts}
                    onOpenTournament={(id) => navigate(`/tournaments/${id}`)}
                    onMarkSeen={markScrimAlertsSeen}
                    onOpenPrefs={() => setShowScrimAlertPrefs(true)}
                  />
                ) : null}
                friendsPanel={user ? (
                  <FriendDock
                    placement="header"
                    requests={friendRequests}
                    currentUserId={user.uid}
                    onOpenChat={(friend) => {
                      setActiveChats((current) => {
                        if (current.some((item) => item.uid === friend.uid)) return current;
                        return [...current, friend].slice(-CHAT_POPUP_MAX);
                      });
                      setFocusedChatUid(friend.uid);
                      setChatPopupOpen(true);
                      document.querySelector("details[open]")?.removeAttribute("open");
                    }}
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
                chatCount={notifyPrefs.chats ? unseenChatCount : 0}
                onOpenChats={() => setChatPopupOpen(true)}
                friendRequestCount={notifyPrefs.friends ? pendingFriendRequestCount : 0}
                onOpenFriendRequests={() => setShowFriendRequests(true)}
              />
              <PublicNav pathname={routePath} />
            </div>
            <div className={`mx-auto px-5 pb-24 ${(routesLocation.pathname || "/") === "/" || String(routesLocation.pathname || "").startsWith("/vault") || String(routesLocation.pathname || "").startsWith("/games") ? "max-w-6xl" : "max-w-5xl"}`}>
              <Routes location={routesLocation}>
                <Route path="/" element={(
                  <PlatformHome slides={homeSlides}>
                    <HubSections />
                  </PlatformHome>
                )} />
                <Route path="/games" element={<GamesDirectoryPage />} />
                <Route path="/games/:slug" element={(
                  <GameDeskPage
                    slug={routePath.replace(/^\/games\//, "").split("/")[0] || ""}
                    vaultSlides={vaultSlides}
                    tournaments={tournaments}
                    blogPosts={blogPosts}
                    onOpenScrim={(id) => {
                      setSelectedId(id);
                      setView("detail");
                      navigate(`/tournaments/${id}`);
                    }}
                  />
                )} />
                <Route path="/vault" element={(
                  <VaultLibraryPage
                    slides={vaultSlides}
                    bookmarkSlugs={vaultBookmarks.slugs}
                    onToggleBookmark={vaultBookmarks.toggle}
                  >
                    <div>
                      <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-neon">Contributor desk</p>
                      <p className="mb-3 max-w-xl text-sm text-stone-400">Suggest a missing event or correction. Staff reviews every submission before it lands in The Vault.</p>
                      <ArchiveRequestForm
                        user={user}
                        submissions={archiveSubmissions}
                        onSubmit={submitArchiveRequest}
                        onSignIn={() => setAuthDialogOpen(true)}
                      />
                    </div>
                  </VaultLibraryPage>
                )} />
                <Route path="/vault/ewc" element={<EwcDirectoryPage slides={vaultSlides} liveEntries={archiveEntries} />} />
                <Route path="/vault/legacy" element={<PreEwcHistoryPage />} />
                <Route path="/vault/franchises" element={<CompetitorDirectoryPage slides={vaultSlides} kind="franchise" />} />
                <Route path="/vault/players" element={<CompetitorDirectoryPage slides={vaultSlides} kind="player" />} />
                <Route path="/vault/dossier/:name" element={<CompetitorDossierPage slides={vaultSlides} name={routePath.replace(/^\/vault\/dossier\//, "").split("/")[0] || ""} />} />
                <Route path="/vault/:slug" element={<VaultDetailPage slides={vaultSlides} slug={routePath.replace(/^\/vault\//, "").split("/")[0]} liveEntries={archiveEntries} bookmarked={vaultBookmarks.has(routePath.replace(/^\/vault\//, "").split("/")[0])} onToggleBookmark={vaultBookmarks.toggle} />} />
                <Route path="/tournaments" element={(
                  <>
                    <SectionBackHome />
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
                      hideCreate={false}
                      archivedView={showArchivedTournaments}
                      onArchivedView={setShowArchivedTournaments}
                      deskFilter={scrimDeskFilter}
                      onDeskFilter={setScrimDeskFilter}
                      followedHosts={scrimAlerts.followedHosts}
                      alertGames={scrimAlerts.games}
                      profileGames={myProfile?.games || []}
                      onToggleAlertGame={user ? toggleAlertGame : null}
                      notifyChosen={notifyPrefs.chosen}
                      notifyEnabled={notifyPrefs.scrims}
                      onNotifyChange={user ? (on) => setNotifyChannel("scrims", on) : null}
                      showNotifyPrompt={Boolean(user && !notifyPrefs.chosen)}
                      onNotifyPromptYes={() => chooseScrimNotifyPrompt(true)}
                      onNotifyPromptNo={() => chooseScrimNotifyPrompt(false)}
                      hostVerification={hostVerification}
                      showHostVerifyPrompt={showHostVerifyPrompt}
                      onDismissHostVerify={dismissHostVerifyPrompt}
                      tournaments={tournaments.filter((item) => canSeeScrimInList(item, {
                        uid: user?.uid,
                        invites: tournamentInvites,
                      }))}
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
                <Route path="/hosts/:uid" element={(() => {
                  const hostUid = routePath.replace(/^\/hosts\//, "").split("/")[0];
                  const official = officialHosts.find((row) => row.uid === hostUid && row.enabled !== false);
                  const fromTournament = tournaments.find((item) => item.adminUserId === hostUid);
                  const host = official || {
                    uid: hostUid,
                    orgName: fromTournament?.adminDisplayName || "Host",
                    displayName: fromTournament?.adminDisplayName || "",
                    adminDisplayName: fromTournament?.adminDisplayName || "",
                  };
                  return (
                    <HostProfilePage
                      hostUid={hostUid}
                      host={host}
                      official={Boolean(official)}
                      tournaments={tournaments}
                      currentUserId={user?.uid || null}
                      following={(scrimAlerts.followedHosts || []).includes(hostUid)}
                      onToggleFollow={toggleFollowHost}
                      onOpenTournament={(id) => navigate(`/tournaments/${id}`)}
                      onSignIn={() => setAuthDialogOpen(true)}
                    />
                  );
                })()} />
                <Route path="/tournaments/:id/watch" element={(
                  <SpectatorPage
                    tournament={selected}
                    official={Boolean(officialHosts.find((row) => row.uid === selected?.adminUserId && row.enabled !== false))}
                    following={(scrimAlerts.followedHosts || []).includes(selected?.adminUserId)}
                    currentUserId={user?.uid || null}
                    onToggleFollow={toggleFollowHost}
                    onSignIn={() => setAuthDialogOpen(true)}
                    onCopyLink={() => selected && shareTournament(selected, { watch: true })}
                    posterUrl={selected ? flyerForEvent(selected) : ""}
                  />
                )} />
                <Route path="/me/history" element={(
                  <PlayerScrimHistory
                    rows={myScrimHistory}
                    officialHosts={officialHosts}
                    followedHosts={scrimAlerts.followedHosts}
                    onToggleFollow={toggleFollowHost}
                    onOpenTournament={(id) => navigate(`/tournaments/${id}`)}
                    onSignIn={() => setAuthDialogOpen(true)}
                    currentUserId={user?.uid || null}
                  />
                )} />
                <Route path="/desk" element={(
                  <CommunityDesk
                    user={user}
                    myProfile={myProfile}
                    announcements={scrimAnnouncements}
                    alerts={scrimAlerts}
                    friends={acceptedFriends}
                    historyCount={myScrimHistory.length}
                    officialHosts={officialHosts}
                    hostRequests={hostRequests}
                    verification={hostVerification}
                    verifyPromptDismissed={!showHostVerifyPrompt}
                    onDismissVerifyPrompt={dismissHostVerifyPrompt}
                    isStaff={siteRole === "owner" || siteRole === "support"}
                    onOpenTournament={(id) => navigate(`/tournaments/${id}`)}
                    onOpenChats={() => setChatPopupOpen(true)}
                    onSignIn={() => setAuthDialogOpen(true)}
                    onRequestOfficial={requestOfficialHost}
                    onDecideRequest={decideHostRequest}
                    onToggleFollow={toggleFollowHost}
                    onOpenHostScrims={(hostUid) => navigate(`/hosts/${hostUid}`)}
                  />
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
                    rooms={selectedRooms}
                    promotions={selectedPromotions}
                    onAddRoom={(room) => addTournamentRoom(selected.id, room)}
                    onActivateRoom={(roomId, credentials) => activateTournamentRoom(selected.id, roomId, credentials)}
                    onPromote={(payload) => promoteTournamentPlayers(selected.id, payload)}
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
                    onShare={() => shareTournament(selected, { watch: true })}
                    onRequestFriend={() => requestHostFriend(selected)}
                    onRequestRegistration={(player) => requestRegistration(selected.id, player)}
                    onCheckIn={() => checkInRegistration(selected.id)}
                    onMarkAttendance={(requestId, attendance) => markRegistrationAttendance(selected.id, requestId, attendance)}
                    onSaveRoster={saveSavedRoster}
                    savedSquad={savedSquad}
                    onSaveStandings={(rows) => saveTournamentStandings(selected.id, rows)}
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
                    following={(scrimAlerts.followedHosts || []).includes(selected?.adminUserId)}
                    onToggleFollow={toggleFollowHost}
                  />
                ) : <EmptyState title="Scrim not found" body="This event is missing or was removed." actionLabel="Back to scrims" onAction={() => navigate("/tournaments")} />} />
                <Route path="/find-players" element={user ? (
                  <FindPlayersPage
                    gamesList={circuitCms.filterGames}
                    currentUid={user.uid}
                    myProfile={myProfile}
                    friendRequests={friendRequests}
                    onFriendRequest={(player) => requestFriend(player.uid, player.displayName)}
                    onFriendDecision={decideFriendRequest}
                    onReport={(player) => setReportTarget({ type: "player", id: player.uid, name: player.displayName })}
                    onEditProfile={() => setShowProfileModal(true)}
                    notifyEnabled={notifyPrefs.friends}
                    onNotifyChange={(on) => setNotifyChannel("friends", on)}
                  />
                ) : (
                  <div className="pt-8">
                    <SectionBackHome />
                    <h1 className="m-0 font-['Bebas_Neue',sans-serif] text-5xl">Find players</h1>
                    <p className="mb-4 mt-2 text-sm text-stone-400">Sign in to search similar players and send a connect request.</p>
                    <Button onClick={() => setAuthDialogOpen(true)}>Sign in to find players</Button>
                  </div>
                )} />
                <Route path="/blog" element={null} />
                <Route path="*" element={
                  <div className="pt-10">
                    <h1 className="m-0 font-['Bebas_Neue',sans-serif] text-5xl">Page not found</h1>
                    <p className="mt-2 text-sm text-stone-400">That link is not a GrindInfo page.</p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Link to="/" className="font-mono text-xs uppercase tracking-wider text-neon">Home</Link>
                      <Link to="/find-players" className="font-mono text-xs uppercase tracking-wider text-neon">Find players</Link>
                      <Link to="/tournaments" className="font-mono text-xs uppercase tracking-wider text-neon">Scrims</Link>
                      <Link to="/blog" state={{ background: routesLocation }} className="font-mono text-xs uppercase tracking-wider text-neon">Community blog</Link>
                    </div>
                  </div>
                } />
              </Routes>
            </div>
            {blogOpen && (
              <BlogOverlay onClose={closeBlogOverlay}>
                <BlogPage
                  overlay
                  manageInDrawer
                  posts={blogPosts}
                  user={user}
                  isModerator={isSiteStaff || isModerator}
                  blogPrivateById={blogPrivateById}
                  onSubmit={submitBlogPost}
                  onReview={reviewBlogPost}
                  onEdit={editBlogPost}
                  onDelete={deleteBlogPost}
                  onSignIn={() => setAuthDialogOpen(true)}
                  notifyEnabled={notifyPrefs.blogs}
                  onNotifyChange={user ? (on) => setNotifyChannel("blogs", on) : null}
                />
              </BlogOverlay>
            )}
          </>
        )}

      {user && showNewTournament && (
        <NewTournamentModal slides={vaultSlides} gameArt={circuitCms.records} gamesList={circuitCms.filterGames} onClose={() => setShowNewTournament(false)} onCreate={addTournament} />
      )}
      {user && showScrimAlertPrefs && (
        <ScrimAlertPrefs
          open
          onClose={() => setShowScrimAlertPrefs(false)}
          alerts={scrimAlerts}
          gamesList={circuitCms.filterGames}
          officialHosts={officialHosts}
          onSave={saveScrimAlerts}
          onToggleFollow={toggleFollowHost}
        />
      )}

      {showProfileModal && (
        <ProfileModal
          key={profileModalTab}
          initialProfile={myProfile}
          defaultDisplayName={user.displayName}
          gamesList={circuitCms.filterGames}
          onSave={saveProfile}
          onSkip={skipProfile}
          onClose={() => { setShowProfileModal(false); setProfileModalTab("profile"); }}
          initialTab={profileModalTab}
        />
      )}

      {user && reportTarget && <ReportModal target={reportTarget} onClose={() => setReportTarget(null)} onSubmit={submitReport} />}
      {user && showFriendRequests && (
        <div
          role="presentation"
          className="fixed inset-0 z-[70] grid place-items-center bg-black/70 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowFriendRequests(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Friend requests"
            className="max-h-[80vh] w-full max-w-lg overflow-y-auto border border-white/10 bg-[var(--page-bg-solid)] p-4 shadow-[0_0_0_1px_var(--accent-secondary)]"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="m-0 font-mono text-[10px] uppercase tracking-widest text-[var(--accent-secondary)]">
                {pendingFriendRequestCount ? "New connection" : "Connections"}
              </p>
              <div className="flex items-center gap-2">
                <PageNotifyToggle
                  enabled={notifyPrefs.friends}
                  onChange={(on) => setNotifyChannel("friends", on)}
                  label="Friends"
                />
                <Button variant="ghost" onClick={() => setShowFriendRequests(false)}>Close</Button>
              </div>
            </div>
            <FriendRequestCenter
              compact
              requests={friendRequests}
              currentUserId={user.uid}
              onDecision={decideFriendRequest}
            />
          </div>
        </div>
      )}
      {user && (
        <ChatPopup
          open={chatPopupOpen}
          onClose={() => setChatPopupOpen(false)}
          currentUser={user}
          chats={activeChats}
          focusedUid={focusedChatUid}
          onFocus={setFocusedChatUid}
          onRemove={(uid) => {
            setActiveChats((current) => {
              const next = current.filter((item) => item.uid !== uid);
              setFocusedChatUid((focused) => (focused === uid ? (next[0]?.uid || null) : focused));
              if (!next.length) setChatPopupOpen(false);
              return next;
            });
          }}
          mutedIds={mutedFriendSet}
          onToggleMute={toggleMuteFriend}
          onBlock={(friend) => {
            blockFriend(friend);
          }}
          unreadByUid={notifyPrefs.chats ? chatUnreadByUid : {}}
          unseenCount={notifyPrefs.chats ? unseenChatCount : 0}
          onSeen={markFriendChatSeen}
          notifyEnabled={notifyPrefs.chats}
          onNotifyChange={(on) => setNotifyChannel("chats", on)}
        />
      )}
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

function Header({ saving, user, guestMode, onSignInClick, onSignOut, onSwitchAccount, onEditProfile, onOpenAccountInfo, dashboardRole, friendsPanel = null, playerTag = "", profile = null, chatCount = 0, onOpenChats = null, friendRequestCount = 0, onOpenFriendRequests = null, scrimBell = null }) {
  const location = useLocation();
  const friendsMenu = useRef(null);
  const accountMenu = useRef(null);
  const displayName = grindHandle(safeProfileName(user?.displayName), playerTag);
  const initials = (playerNameFromInput(safeProfileName(user?.displayName)).slice(0, 1) || "P").toUpperCase();
  const avatarSrc = avatarForGamer({
    photoURL: user?.photoURL,
    avatar: profile?.avatar,
    games: profile?.games,
    displayName,
  });
  const closeOtherMenu = (keep) => {
    [friendsMenu.current, accountMenu.current].forEach((node) => {
      if (node && node !== keep) node.removeAttribute("open");
    });
  };
  const closeMenus = () => {
    friendsMenu.current?.removeAttribute("open");
    accountMenu.current?.removeAttribute("open");
  };
  useEffect(() => {
    closeMenus();
  }, [location.pathname]);
  useEffect(() => {
    const onPointerDown = (event) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      const menus = [friendsMenu.current, accountMenu.current].filter(Boolean);
      if (!menus.some((node) => node.open)) return;
      if (menus.some((node) => node.contains(target))) return;
      closeMenus();
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, []);

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
              {scrimBell}
              {friendsPanel ? (
                <details ref={friendsMenu} style={{ position: "relative" }} onToggle={(event) => { if (event.currentTarget.open) closeOtherMenu(event.currentTarget); }}>
                  <summary
                    aria-label={friendRequestCount ? `Friends, ${friendRequestCount} friend requests` : "Friends"}
                    style={{ position: "relative", listStyle: "none", cursor: "pointer", color: "var(--page-text)", border: "1px solid var(--border)", background: "var(--panel-bg)", padding: "8px 12px", fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase" }}
                  >
                    Friends
                    {friendRequestCount > 0 ? (
                      <span
                        aria-hidden="true"
                        style={{
                          position: "absolute",
                          top: -7,
                          right: -7,
                          minWidth: 18,
                          height: 18,
                          padding: "0 5px",
                          borderRadius: 999,
                          display: "inline-grid",
                          placeItems: "center",
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: 0,
                          ...NOTICE_BADGE_STYLE,
                        }}
                      >
                        {friendRequestCount > 9 ? "9+" : friendRequestCount}
                      </span>
                    ) : null}
                  </summary>
                  <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 65, width: 300, maxHeight: "70vh", overflow: "auto", background: "var(--panel-bg)", border: "1px solid var(--border)", boxShadow: "var(--panel-shadow)", padding: 8 }}>
                    {friendRequestCount > 0 && onOpenFriendRequests ? (
                      <button
                        type="button"
                        onClick={() => {
                          onOpenFriendRequests();
                          friendsMenu.current?.removeAttribute("open");
                        }}
                        style={{
                          width: "100%",
                          marginBottom: 8,
                          padding: "10px 11px",
                          border: "1px solid var(--accent-secondary)",
                          background: "rgba(59, 130, 255, 0.12)",
                          color: "var(--page-text)",
                          cursor: "pointer",
                          textAlign: "left",
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 11,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                        }}
                      >
                        {friendRequestCount} new friend request{friendRequestCount === 1 ? "" : "s"} — review
                      </button>
                    ) : null}
                    {friendsPanel}
                  </div>
                </details>
              ) : null}
              {onOpenChats ? (
                <button
                  type="button"
                  onClick={onOpenChats}
                  aria-label={chatCount ? `Open chats, ${chatCount} unseen` : "Open chats"}
                  style={{
                    position: "relative",
                    cursor: "pointer",
                    color: "var(--page-text)",
                    border: "1px solid var(--border)",
                    background: "var(--panel-bg)",
                    padding: "8px 12px",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 11,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                  }}
                >
                  Chat
                  {chatCount > 0 ? (
                    <span
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        top: -7,
                        right: -7,
                        minWidth: 18,
                        height: 18,
                        padding: "0 5px",
                        borderRadius: 999,
                        display: "inline-grid",
                        placeItems: "center",
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: 0,
                        ...NOTICE_BADGE_STYLE,
                      }}
                    >
                      {chatCount > 9 ? "9+" : chatCount}
                    </span>
                  ) : null}
                </button>
              ) : null}
              <details ref={accountMenu} style={{ position: "relative" }} onToggle={(event) => { if (event.currentTarget.open) closeOtherMenu(event.currentTarget); }}>
                <summary
                  aria-label="Account menu"
                  style={{ listStyle: "none", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: "var(--page-text)", border: "1px solid var(--border)", background: "var(--panel-bg)", padding: "6px 9px", fontFamily: "'Inter', sans-serif", fontSize: 12 }}
                >
                  {user?.photoURL || (profile?.avatar && String(profile.avatar).length > 2) ? (
                    <img src={avatarSrc} alt="" className="aspect-square h-[30px] w-[30px] rounded-full object-cover" />
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
                    <Button variant="ghost" style={{ width: "100%", marginBottom: 12 }} onClick={(event) => { onOpenAccountInfo?.(); event.currentTarget.closest("details")?.removeAttribute("open"); }}>Account info</Button>
                    <Link to="/me/history" style={{ display: "block", width: "100%", marginBottom: 12, textDecoration: "none" }} onClick={(event) => event.currentTarget.closest("details")?.removeAttribute("open")}>
                      <Button variant="ghost" style={{ width: "100%" }}>Scrim history</Button>
                    </Link>
                    <Link to="/desk" style={{ display: "block", width: "100%", marginBottom: 12, textDecoration: "none" }} onClick={(event) => event.currentTarget.closest("details")?.removeAttribute("open")}>
                      <Button variant="ghost" style={{ width: "100%" }}>Community desk</Button>
                    </Link>
                    <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 12, lineHeight: 1.45 }}>
                      Queries &amp; support:{" "}
                      <a href="mailto:eswar@grindinfo.xyz?subject=GrindInfo%20support%20query" style={{ color: "var(--accent-secondary)" }}>eswar@grindinfo.xyz</a>
                    </div>
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
function TournamentList({
  tournaments,
  currentUserId,
  currentUserName,
  onOpen,
  onNew,
  onSignIn,
  pendingInvites = [],
  onInviteDecision,
  embedded = false,
  hideCreate = false,
  archivedView,
  onArchivedView,
  deskFilter = "all",
  onDeskFilter,
  followedHosts = [],
  alertGames = [],
  profileGames = [],
  onToggleAlertGame = null,
  notifyChosen = false,
  hostPanel = null,
  notifyEnabled = true,
  onNotifyChange = null,
  showNotifyPrompt = false,
  onNotifyPromptYes = null,
  onNotifyPromptNo = null,
  hostVerification = null,
  showHostVerifyPrompt = false,
  onDismissHostVerify = null,
}) {
  const [localArchived, setLocalArchived] = useState(false);
  const [accessFilter, setAccessFilter] = useState("all");
  const [regionFilter, setRegionFilter] = useState("all");
  const [rankFilter, setRankFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all");
  const [openSlotsOnly, setOpenSlotsOnly] = useState(false);
  const showArchived = archivedView ?? localArchived;
  const setShowArchived = onArchivedView ?? setLocalArchived;
  const followSet = useMemo(() => new Set(followedHosts || []), [followedHosts]);
  const alertGameList = useMemo(() => (alertGames || []).map(String).filter(Boolean), [alertGames]);
  const listLocation = useLocation();
  const queryGame = useMemo(
    () => canonicalFilterGame(new URLSearchParams(listLocation.search).get("game") || ""),
    [listLocation.search],
  );
  const visibleTournaments = tournaments.filter((t) => {
    if (isTournamentArchived(t) !== showArchived) return false;
    if (queryGame && !gameMatchesFilter(t.game, queryGame)) return false;
    if (deskFilter === "following" && !followSet.has(t.adminUserId)) return false;
    if (deskFilter === "foryou") {
      const focusGames = alertGameList.length
        ? alertGameList
        : (profileGames || []).map(String).filter(Boolean);
      const gameOk = !focusGames.length || focusGames.some((game) => gameMatchesFilter(t.game, game));
      const followOk = followSet.has(t.adminUserId);
      if (!gameOk && !followOk) return false;
    }
    if (accessFilter === "public" && !isPublicScrim(t)) return false;
    if (accessFilter === "private" && isPublicScrim(t)) return false;
    if (regionFilter !== "all" && String(t.region || "") !== regionFilter) return false;
    if (rankFilter !== "all" && String(t.rankBand || "") !== rankFilter) return false;
    if (openSlotsOnly && t.registrationOpen === false) return false;
    if (timeFilter === "soon") {
      const start = Date.parse(t.startDate || "") || 0;
      if (!start) return false;
      const delta = start - Date.now();
      if (delta < -86400000 || delta > 7 * 86400000) return false;
    } else if (timeFilter === "later") {
      const start = Date.parse(t.startDate || "") || 0;
      if (!start || start - Date.now() <= 7 * 86400000) return false;
    }
    return true;
  });
  return (
    <PageEnter>
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
          {!embedded && <Eyebrow>GrindInfo</Eyebrow>}
          <h1
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: embedded ? 28 : "clamp(2.75rem, 8vw, 4.5rem)",
              margin: "4px 0 0",
              letterSpacing: "0.02em",
              lineHeight: 0.92,
            }}
          >
            Scrims
          </h1>
          {!embedded ? (
            <p style={{ margin: "8px 0 0", fontSize: 14, color: "var(--text-muted)", maxWidth: 360 }}>
              Find a lobby. Check in. Play.
            </p>
          ) : null}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {currentUserId && onNotifyChange ? (
            <PageNotifyToggle enabled={notifyEnabled} onChange={onNotifyChange} />
          ) : null}
          {currentUserId ? (
            !hideCreate && <Button onClick={onNew}>Host scrim</Button>
          ) : (
            <Button onClick={onSignIn}>Sign in to host</Button>
          )}
        </div>
      </div>

      {showNotifyPrompt && currentUserId ? (
        <div
          style={{
            marginBottom: 16,
            padding: "12px 14px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <p style={{ margin: 0, fontSize: 14, color: "var(--page-text)" }}>
            Notify when new scrims drop for your games?
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button onClick={onNotifyPromptYes}>Yes · my games</Button>
            <Button variant="ghost" onClick={onNotifyPromptNo}>Not now</Button>
          </div>
        </div>
      ) : null}

      {showHostVerifyPrompt ? (
        <HostVerifyPrompt
          evaluation={hostVerification}
          onDismiss={onDismissHostVerify}
        />
      ) : null}

      {!showArchived ? (
        <ScrimTodayStrip
          tournaments={tournaments.filter((t) => !isTournamentArchived(t))}
          alertGames={alertGameList}
          profileGames={profileGames}
          queryGame={queryGame}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          onOpen={onOpen}
          onToggleAlertGame={onToggleAlertGame}
          notifyChosen={notifyChosen}
        />
      ) : null}

      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap", alignItems: "center" }}>
        {!hideCreate ? (
          <>
            <Button variant={showArchived ? "ghost" : "primary"} onClick={() => setShowArchived(false)}>Live</Button>
            <Button variant={showArchived ? "primary" : "ghost"} onClick={() => setShowArchived(true)}>Results</Button>
            <span style={{ width: 1, height: 18, background: "var(--border)", margin: "0 2px" }} aria-hidden />
          </>
        ) : null}
        {!showArchived && onDeskFilter ? (
          <>
            <Button variant={deskFilter === "all" ? "primary" : "ghost"} onClick={() => onDeskFilter("all")}>All</Button>
            <Button variant={deskFilter === "foryou" ? "primary" : "ghost"} onClick={() => onDeskFilter("foryou")}>Your games</Button>
            <Button variant={deskFilter === "following" ? "primary" : "ghost"} onClick={() => onDeskFilter("following")}>Following</Button>
            <span style={{ width: 1, height: 18, background: "var(--border)", margin: "0 2px" }} aria-hidden />
          </>
        ) : null}
        {!showArchived ? (
          <>
            <Button variant={accessFilter === "all" ? "primary" : "ghost"} onClick={() => setAccessFilter("all")}>Any access</Button>
            <Button variant={accessFilter === "public" ? "primary" : "ghost"} onClick={() => setAccessFilter("public")}>Public</Button>
            <Button variant={accessFilter === "private" ? "primary" : "ghost"} onClick={() => setAccessFilter("private")}>Private</Button>
            <Button variant={openSlotsOnly ? "primary" : "ghost"} onClick={() => setOpenSlotsOnly((value) => !value)}>Open seats</Button>
            <Select value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)} style={{ minWidth: 110 }} aria-label="Region">
              <option value="all">Any region</option>
              {REGIONS.map((region) => <option key={region} value={region}>{region}</option>)}
            </Select>
            <Select value={rankFilter} onChange={(e) => setRankFilter(e.target.value)} style={{ minWidth: 110 }} aria-label="Rank">
              <option value="all">Any rank</option>
              {RANK_BANDS.map((band) => <option key={band} value={band}>{band}</option>)}
            </Select>
            <Select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)} style={{ minWidth: 110 }} aria-label="When">
              <option value="all">Any time</option>
              <option value="soon">Next 7 days</option>
              <option value="later">Later</option>
            </Select>
          </>
        ) : null}
      </div>
      {!showArchived && pendingInvites.length > 0 && <section style={{ display: "grid", gap: 8, marginBottom: 18 }}><Eyebrow>Scrim invites</Eyebrow>{pendingInvites.map((invite) => <article key={invite.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, padding: 12, background: "var(--panel-bg)", border: "1px solid var(--border)" }}><span>{invite.inviterName || "A friend"} invited you to <strong>{invite.tournamentName}</strong> · {invite.game}</span><span style={{ display: "flex", gap: 6 }}><Button onClick={() => onOpen(invite.tournamentId)}>View scrim</Button><Button variant="ghost" onClick={() => onInviteDecision(invite.id, "accepted")}>Accept</Button><Button variant="danger" onClick={() => onInviteDecision(invite.id, "declined")}>Decline</Button></span></article>)}</section>}
      {visibleTournaments.length === 0 ? (
        <EmptyState
          title={showArchived ? "No results yet" : accessFilter === "public" ? "No public scrims" : accessFilter === "private" ? "No private scrims" : deskFilter === "following" ? "No followed hosts live" : deskFilter === "foryou" ? "No scrims for your games" : "No active scrims"}
          body={showArchived ? "Closed and completed scrims land here with standings when hosts post results." : currentUserId ? "Host a scrim to open registration, run check-in, and post results on this desk." : "Public and private scrims will appear here when hosts go live."}
          actionLabel={!hideCreate && currentUserId ? "+ Host scrim" : undefined}
          onAction={!hideCreate ? onNew : undefined}
        />
      ) : (
        <ScrimWindowsGrid
          tournaments={visibleTournaments}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          onOpen={onOpen}
        />
      )}
    </PageEnter>
  );
}

function NewTournamentModal({ onClose, onCreate, slides = [], gameArt = [], gamesList = FILTER_GAMES }) {
  const [name, setName] = useState("");
  const [game, setGame] = useState(gamesList[0]);
  const [kind, setKind] = useState("bracket");
  const [format, setFormat] = useState(FORMATS[0]);
  const [joinMode, setJoinMode] = useState("open");
  const [publicStats, setPublicStats] = useState(false);
  const [publishAnnouncement, setPublishAnnouncement] = useState(true);
  const [requireRequest, setRequireRequest] = useState(false);
  const [maxSlots, setMaxSlots] = useState("16");
  const [region, setRegion] = useState("");
  const [rankBand, setRankBand] = useState("");
  const [blurb, setBlurb] = useState("");
  const [roomId, setRoomId] = useState("");
  const [roomPassword, setRoomPassword] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [posterUrl, setPosterUrl] = useState("");
  const [posterLocked, setPosterLocked] = useState(false);
  const [posterDraft, setPosterDraft] = useState("");
  const [prizeAmount, setPrizeAmount] = useState("0");
  const [customPrize, setCustomPrize] = useState("");
  const [error, setError] = useState("");
  const gameKey = String(game || "").toLowerCase();
  const catalogArt = gameArt.find((item) => String(item.game || "").toLowerCase() === gameKey);
  const vaultSlide = slides.find((slide) => String(slide.game || "").toLowerCase() === gameKey);
  const posterPack = flyersForGame(game, [catalogArt?.poster, vaultSlide?.poster, ...(catalogArt?.flyers || []), ...(vaultSlide?.flyers || [])]);

  useEffect(() => {
    setPosterLocked(false);
  }, [game]);

  useEffect(() => {
    if (posterLocked) return;
    const packDefault = flyersForGame(game, [catalogArt?.poster, vaultSlide?.poster, ...(catalogArt?.flyers || []), ...(vaultSlide?.flyers || [])])[0]
      || bannerForGame(game);
    setPosterUrl(packDefault);
  }, [game, posterLocked, catalogArt?.poster, vaultSlide?.poster]);

  const submit = () => {
    if (!name.trim()) {
      setError("Enter a scrim name first");
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
      publicStats: joinMode === "open" ? true : publicStats === true,
      publishAnnouncement: joinMode === "open" && publishAnnouncement,
      requireRequest: joinMode === "open" && requireRequest,
      maxSlots: slots,
      region: region || "",
      rankBand: rankBand || "",
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
        <Eyebrow>Host desk</Eyebrow>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, margin: "4px 0 8px" }}>
          Host a scrim
        </div>
        <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--text-muted)" }}>Publish a public flyer to interested players, or keep it invite-only. Poster defaults to the selected game pack.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label="Scrim name">
            <TextInput
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError("");
              }}
              placeholder="Friday night custom room"
              autoFocus
            />
          </Field>
          {error && <div style={{ fontSize: 13, color: "var(--danger)" }}>{error}</div>}
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <Field label="Game">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <GameIcon game={game} src={posterUrl} size={38} />
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
          <Field label="Game / event poster">
            <div style={{ display: "grid", gap: 8 }}>
              {posterUrl && <img src={posterUrl} alt="" style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 12 }} />}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                {posterPack.slice(0, 3).map((src) => (
                  <button
                    key={src}
                    type="button"
                    onClick={() => { setPosterUrl(src); setPosterLocked(true); }}
                    style={{ padding: 0, border: posterUrl === src ? "1px solid var(--accent, #08f)" : "1px solid var(--border)", borderRadius: 10, overflow: "hidden", background: "transparent", cursor: "pointer" }}
                  >
                    <img src={src} alt="" style={{ width: "100%", height: 56, objectFit: "cover", display: "block" }} />
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <TextInput
                  value={posterDraft}
                  onChange={(e) => setPosterDraft(e.target.value)}
                  placeholder="https:// image URL"
                />
                <Button
                  variant="ghost"
                  onClick={() => {
                    const url = posterDraft.trim();
                    if (!/^https:\/\//i.test(url) && !url.startsWith("data:image/")) {
                      setError("Use a secure https poster URL.");
                      return;
                    }
                    setPosterUrl(url);
                    setPosterLocked(true);
                    setPosterDraft("");
                    if (error) setError("");
                  }}
                >
                  Use URL
                </Button>
                <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                  Upload image
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    style={{ display: "none" }}
                    onChange={(event) => {
                      readImageFile(event.target.files?.[0], (dataUrl) => {
                        setPosterUrl(dataUrl);
                        setPosterLocked(true);
                        if (error) setError("");
                      }, setError, { maxChars: 450000 });
                    }}
                  />
                </label>
              </div>
              <Field label="Preset template library">
                <Select
                  value=""
                  onChange={(e) => {
                    const preset = POSTER_PRESETS.find((item) => item.id === e.target.value);
                    if (!preset) return;
                    setPosterUrl(preset.src);
                    setPosterLocked(true);
                    if (error) setError("");
                  }}
                >
                  <option value="">Choose a preset poster…</option>
                  {POSTER_PRESETS.filter((item) => String(item.game || "").toLowerCase() === gameKey || !gameKey)
                    .slice(0, 24)
                    .map((item) => (
                      <option key={item.id} value={item.id}>{item.label}</option>
                    ))}
                </Select>
              </Field>
              <CollectionPicker
                game={game}
                kinds={["poster", "event", "background"]}
                value={posterUrl}
                onSelect={(url) => { setPosterUrl(url); setPosterLocked(true); }}
                heading="Game posters & backgrounds"
              />
            </div>
          </Field>
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
              <Field label="Access">
                <Select value={joinMode} onChange={(e) => setJoinMode(e.target.value)}>
                  <option value="open">Public — listed, free join / flyer publish</option>
                  <option value="invite">Invite only — hidden from public list</option>
                  <option value="request">Private — listed, host approves requests</option>
                </Select>
              </Field>
            </div>
            <div style={{ flex: 1, minWidth: 150 }}>
              <Field label={kind === "custom_room" ? "Max players (0 = unlimited)" : "Max teams (0 = unlimited)"}>
                <TextInput type="number" min="0" max="256" value={maxSlots} onChange={(e) => setMaxSlots(e.target.value)} />
              </Field>
            </div>
          </div>
          {joinMode === "open" && (
            <>
              <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, color: "var(--text-muted)" }}>
                <input type="checkbox" checked={publishAnnouncement} onChange={(e) => setPublishAnnouncement(e.target.checked)} style={{ marginTop: 3 }} />
                <span>Publish flyer announcement to players following this game / official hosts.</span>
              </label>
              <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, color: "var(--text-muted)" }}>
                <input type="checkbox" checked={requireRequest} onChange={(e) => setRequireRequest(e.target.checked)} style={{ marginTop: 3 }} />
                <span>Require host approval even on public (otherwise free seats auto-approve).</span>
              </label>
            </>
          )}
          {joinMode === "invite" && (
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Invite-only scrims stay off the public Scrims list. Invite friends or Find players after create.</div>
          )}
          {(joinMode === "request" || joinMode === "invite") && (
            <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, color: "var(--text-muted)" }}>
              <input type="checkbox" checked={publicStats} onChange={(e) => setPublicStats(e.target.checked)} style={{ marginTop: 3 }} />
              <span>Allow public view of stats without joining. Room ID stays private until approved.</span>
            </label>
          )}
          <div style={{ display: "grid", gap: 10 }}>
            <Field label="Room ID (optional)">
              <TextInput value={roomId} onChange={(e) => setRoomId(e.target.value)} maxLength={40} placeholder="In-game room ID" />
            </Field>
            <Field label="Room password (optional)">
              <TextInput value={roomPassword} onChange={(e) => setRoomPassword(e.target.value)} maxLength={40} placeholder="In-game password" />
            </Field>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {joinMode === "open"
                ? "Public scrims can show room codes to signed-in visitors. You can add them later if you skip now."
                : "Private scrims hide room codes until a player is approved. You can add them later if you skip now."}
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 150 }}>
              <Field label="Region (for finder)">
                <Select value={region} onChange={(e) => setRegion(e.target.value)}>
                  <option value="">Any / unset</option>
                  {REGIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                </Select>
              </Field>
            </div>
            <div style={{ flex: 1, minWidth: 150 }}>
              <Field label="Rank band">
                <Select value={rankBand} onChange={(e) => setRankBand(e.target.value)}>
                  <option value="">Any / unset</option>
                  {RANK_BANDS.map((item) => <option key={item} value={item}>{item}</option>)}
                </Select>
              </Field>
            </div>
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
          <Button onClick={submit}>{joinMode === "open" && publishAnnouncement ? "Publish scrim" : "Create scrim"}</Button>
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
  if (tournament.registrationOpen === false || isTournamentArchived(tournament)) return <section style={{ marginTop: 16, padding: 16, background: "var(--panel-bg)", border: "1px solid var(--border)" }}><Eyebrow>Invite a friend</Eyebrow><div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 7 }}>Invites are closed for this scrim.</div></section>;
  return <section style={{ marginTop: 16, padding: 16, background: "var(--panel-bg)", border: "1px solid var(--border)" }}>
    <Eyebrow>Invite a friend</Eyebrow>
    <div style={{ color: "var(--text-muted)", fontSize: 12, margin: "7px 0 10px" }}>Invite an accepted friend to view this scrim. They still need to join (and get approved on private scrims) before room codes unlock.</div>
    {friends.length === 0 ? <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Add a friend first, then you can invite them here.</div> : <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <Select aria-label="Choose friend to invite" value={friendUid} onChange={(event) => setFriendUid(event.target.value)}><option value="">Choose a friend</option>{friends.map((friend) => <option key={friend.uid} value={friend.uid}>{friend.name}{friend.playerTag ? ` · #${friend.playerTag}` : ""}</option>)}</Select>
      <Button disabled={!selectedFriend || existing?.status === "pending" || existing?.status === "accepted"} onClick={() => selectedFriend && onInvite(selectedFriend)}>{existing?.status === "pending" ? "Invite pending" : existing?.status === "accepted" ? "Invite accepted" : existing?.status === "declined" ? "Send invite again" : "Send scrim invite"}</Button>
    </div>}
  </section>;
}

function HostControls({ tournament, requests, lobby, onUpdateSettings, onCloseTournament, onSaveLobby }) {
  const [joinMode, setJoinMode] = useState(tournament.joinMode === "open" ? "open" : tournament.joinMode === "invite" ? "invite" : "request");
  const [publicStats, setPublicStats] = useState(tournament.publicStats === true);
  const [requireCheckIn, setRequireCheckIn] = useState(
    tournament.requireCheckIn === true || (tournament.requireCheckIn !== false && tournament.joinMode !== "open"),
  );
  const [maxSlots, setMaxSlots] = useState(String(tournament.maxSlots ?? 0));
  const [blurb, setBlurb] = useState(tournament.blurb || "");
  const [kind, setKind] = useState(isCustomRoomEvent(tournament) ? "custom_room" : "bracket");
  const [roomId, setRoomId] = useState(lobby?.roomId || "");
  const [roomPassword, setRoomPassword] = useState(lobby?.roomPassword || "");
  const [roomError, setRoomError] = useState("");
  const [roomBusy, setRoomBusy] = useState(false);
  useEffect(() => {
    setJoinMode(tournament.joinMode === "open" ? "open" : tournament.joinMode === "invite" ? "invite" : "request");
    setPublicStats(tournament.publicStats === true);
    setRequireCheckIn(tournament.requireCheckIn === true || (tournament.requireCheckIn !== false && tournament.joinMode !== "open"));
    setMaxSlots(String(tournament.maxSlots ?? 0));
    setBlurb(tournament.blurb || "");
    setKind(isCustomRoomEvent(tournament) ? "custom_room" : "bracket");
  }, [tournament.joinMode, tournament.publicStats, tournament.requireCheckIn, tournament.maxSlots, tournament.blurb, tournament.kind, tournament.format]);
  useEffect(() => {
    setRoomId(lobby?.roomId || "");
    setRoomPassword(lobby?.roomPassword || "");
  }, [lobby?.roomId, lobby?.roomPassword]);
  const save = () => onUpdateSettings({
    joinMode,
    publicStats: joinMode === "open" ? true : publicStats === true,
    requireCheckIn: requireCheckIn === true,
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
      <div style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 12px" }}>Public/private access, team cap, live/closed, and room codes live here. Private room codes stay hidden until a player is approved.</div>
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
            <option value="bracket">Full scrim / bracket</option>
            <option value="custom_room">Custom room only</option>
          </Select>
        </Field>
        <Field label="Access">
          <Select value={joinMode} onChange={(event) => setJoinMode(event.target.value)}>
            <option value="open">Public — listed, free join / flyer publish</option>
            <option value="invite">Invite only — hidden from public list</option>
            <option value="request">Private — listed, host approves requests</option>
          </Select>
        </Field>
        {(joinMode === "request" || joinMode === "invite") && (
          <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, color: "var(--text-muted)" }}>
            <input type="checkbox" checked={publicStats} onChange={(event) => setPublicStats(event.target.checked)} style={{ marginTop: 3 }} />
            <span>Allow public view of stats without joining. Room ID stays private until approved.</span>
          </label>
        )}
        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, color: "var(--text-muted)" }}>
          <input type="checkbox" checked={requireCheckIn} onChange={(event) => setRequireCheckIn(event.target.checked)} style={{ marginTop: 3 }} />
          <span>Require player check-in before room codes unlock. Mark no-shows from the registration list.</span>
        </label>
        <Field label="Max teams / players (0 = unlimited)">
          <TextInput type="number" min="0" max="256" value={maxSlots} onChange={(event) => setMaxSlots(event.target.value)} />
        </Field>
        <Field label="Basic info">
          <textarea value={blurb} maxLength={400} rows={3} onChange={(event) => setBlurb(event.target.value)} style={{ ...inputStyle, resize: "vertical" }} />
        </Field>
        <Field label="Poster from collections">
          <MediaLibraryDesk
            compact
            canManage
            tournamentId={tournament.id}
            game={tournament.game}
            currentPoster={tournament.posterUrl}
            onPickPoster={(url) => onUpdateSettings({ posterUrl: url })}
          />
        </Field>
        <Field label="Room ID">
          <TextInput value={roomId} onChange={(event) => setRoomId(event.target.value)} maxLength={40} placeholder="In-game room ID" />
        </Field>
        <Field label="Room password">
          <TextInput value={roomPassword} onChange={(event) => setRoomPassword(event.target.value)} maxLength={40} placeholder="In-game password" />
        </Field>
      </div>
      {roomError && <div role="alert" style={{ color: "var(--danger)", fontSize: 13, marginTop: 8 }}>{roomError}</div>}
      <div style={{ marginTop: 12, fontSize: 12, color: "var(--text-dim)" }}>
        {approvedCount(requests)} currently approved.
        {joinMode === "open"
          ? (requireCheckIn ? " Public scrims still require check-in before room codes unlock." : " Public scrims can show posted room codes to signed-in visitors.")
          : " Private room codes stay hidden until you post them and a player is approved (and checked in if required)."}
      </div>
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
    rooms = [],
    promotions = [],
    onAddRoom,
    onActivateRoom,
    onPromote,
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
    onCheckIn,
    onMarkAttendance,
    onSaveRoster,
    savedSquad,
    onSaveStandings,
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
    following = false,
    onToggleFollow = null,
  } = props;

  const accessOpts = { uid: currentUserId, registrations: registrations || [], isAdmin };
  const showRoom = canViewScrimRoom(tournament, accessOpts);
  const showDetails = canViewScrimStats(tournament, accessOpts);
  const approved = isApprovedRegistrant(registrations || [], currentUserId);
  const privateLocked = !isAdmin && !isPublicScrim(tournament) && !approved;
  const checkInLocked = !isAdmin && approved && scrimRequiresCheckIn(tournament) && !showRoom;

  return (
    <PageEnter style={{ paddingTop: 24 }}>
      <SectionBackHome />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div>
          <Eyebrow color="var(--text-dim)">
            Hosted by{" "}
            {tournament.adminUserId ? (
              <Link
                to={`/hosts/${tournament.adminUserId}`}
                style={{ color: "inherit", textDecoration: "underline", textUnderlineOffset: 3 }}
              >
                {tournament.adminDisplayName || (tournament.adminUserId === currentUserId ? currentUserName : "Scrim host")}
              </Link>
            ) : (
              tournament.adminDisplayName || (tournament.adminUserId === currentUserId ? currentUserName : "Scrim host")
            )}
          </Eyebrow>
          <div className="mb-3 aspect-video max-w-sm overflow-hidden rounded-xl border border-white/10">
            <img src={flyerForEvent(tournament)} alt="" className="h-full w-full object-cover" />
          </div>
          <Eyebrow color="var(--text-muted)">
            {tournament.game} · {tournament.format} · {tournament.status || "upcoming"} · {scrimAccessLabel(tournament)}
          </Eyebrow>
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 38, margin: "4px 0 6px" }}>
            {tournament.name}
          </h1>
          <div style={{ fontSize: 13, color: "var(--text-dim)" }}>
            {fmtDate(tournament.startDate)} {tournament.endDate ? `– ${fmtDate(tournament.endDate)}` : ""}
          </div>
          <div style={{ fontSize: 13, color: "var(--accent-secondary)", marginTop: 7 }}>
            {Number(tournament.prizeAmount) > 0 ? `Prize information: ${tournament.prizeCurrency || "INR"} ${Number(tournament.prizeAmount).toLocaleString()}` : "Free scrim"}
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
              {isOwner ? "HOST · You manage this scrim" : "CO-HOST · You manage this scrim"}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {isAdmin && !isTournamentArchived(tournament) && <Button variant="ghost" onClick={onCloseTournament}>Close scrim</Button>}
          {currentUserId && tournament.adminUserId && currentUserId !== tournament.adminUserId && onToggleFollow ? (
            <Button
              variant={following ? "primary" : "ghost"}
              onClick={() => onToggleFollow(tournament.adminUserId, !following)}
            >
              {following ? "Following host" : "Follow host"}
            </Button>
          ) : null}
          {currentUserId && <Button variant="ghost" onClick={onShare}>Share scrim</Button>}
          {currentUserId ? <Button variant="danger" onClick={onReport}>Report scrim</Button> : <Button variant="ghost" onClick={onSignIn}>Sign in to report</Button>}
          {currentUserId && !isOwner && <Button variant="ghost" onClick={onRequestFriend}>Request host as friend</Button>}
        {isOwner && (
          <Button
            variant="danger"
            onClick={() => {
              if (window.confirm(`Delete "${tournament.name}" and all its teams, matches, and stats?`)) onDelete();
            }}
          >
            Delete scrim
          </Button>
        )}
        </div>
      </div>

      {tournament.blurb && <p style={{ marginTop: 14, color: "var(--text-muted)", whiteSpace: "pre-wrap", maxWidth: 680 }}>{tournament.blurb}</p>}
      {isAdmin && (
        <DeskFold title="Host desk · access, cap, room codes" defaultOpen>
          <HostControls tournament={tournament} requests={registrations || []} lobby={lobby} onUpdateSettings={onUpdateSettings} onCloseTournament={onCloseTournament} onSaveLobby={onSaveLobby} />
          <div style={{ marginTop: 18 }}>
            <RegistrationPanel tournament={tournament} requests={registrations || []} currentUserId={currentUserId} currentUserName={currentUserName} isAdmin={isAdmin} onRequest={onRequestRegistration} onDecision={onRegistrationDecision} onCheckIn={onCheckIn} onMarkAttendance={onMarkAttendance} onSaveRoster={onSaveRoster} savedSquad={savedSquad} disclaimer={props.registrationDisclaimer} onDisclaimerVisibilityChange={props.onJoinDisclaimerVisibilityChange} onSignIn={onSignIn} friends={friends} />
          </div>
        </DeskFold>
      )}
      {!isAdmin && (
        <RegistrationPanel tournament={tournament} requests={registrations || []} currentUserId={currentUserId} currentUserName={currentUserName} isAdmin={isAdmin} onRequest={onRequestRegistration} onDecision={onRegistrationDecision} onCheckIn={onCheckIn} onMarkAttendance={onMarkAttendance} onSaveRoster={onSaveRoster} savedSquad={savedSquad} disclaimer={props.registrationDisclaimer} onDisclaimerVisibilityChange={props.onJoinDisclaimerVisibilityChange} onSignIn={onSignIn} friends={friends} />
      )}
      {(tournament.startDate || tournament.endDate) && (
        <div style={{ marginTop: 12, maxWidth: 280 }}>
          <Countdown target={tournament.startDate || tournament.endDate} label="Match countdown" />
        </div>
      )}
      <RoomLobbyPanel isAdmin={isAdmin} canSee={!isAdmin && showRoom} lobby={lobby} />
      {(isAdmin || (showDetails && Array.isArray(tournament.standings) && tournament.standings.length > 0)) && (
        <DeskFold title="Dynamic points table" defaultOpen={isAdmin}>
          <DynamicPointsTable
            readOnly={!isAdmin}
            onSave={isAdmin ? onSaveStandings : undefined}
            initialRows={
              (Array.isArray(tournament.standings) && tournament.standings.length > 0
                ? tournament.standings
                : (teams || []).slice(0, 8).map((team, index) => ({
                  id: team.id || `team-${index}`,
                  team: team.name || `Team ${index + 1}`,
                  placement: String(index + 1),
                  kills: "0",
                })))
            }
          />
        </DeskFold>
      )}
      {privateLocked && (
        <section style={{ marginTop: 16, padding: 16, background: "var(--panel-bg)", border: "1px solid var(--border)" }}>
          <Eyebrow>Private scrim</Eyebrow>
          <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--text-muted)" }}>
            Room ID and match details stay hidden until you register and the host approves you
            {tournament.publicStats === true ? ". The host allowed public stats — they appear below when available." : "."}
          </p>
        </section>
      )}
      {checkInLocked && (
        <section style={{ marginTop: 16, padding: 16, background: "var(--panel-bg)", border: "1px solid var(--border)" }}>
          <Eyebrow>Check-in required</Eyebrow>
          <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--text-muted)" }}>
            You&apos;re approved. Tap check-in above to unlock room codes and confirm you&apos;ll show.
          </p>
        </section>
      )}
      {(isAdmin || currentUserId) && (
        <InvitePlayersPanel
          tournament={tournament}
          friends={friends}
          invites={tournamentInvites}
          closed={tournament.registrationOpen === false || isTournamentArchived(tournament)}
          onInvite={(player) => onInviteFriend(tournament, player)}
        />
      )}
      <RoomStagesPanel
        rooms={rooms}
        promotions={promotions}
        registrations={registrations || []}
        isAdmin={isAdmin}
        onAddRoom={onAddRoom}
        onActivateRoom={onActivateRoom}
        onPromote={onPromote}
        game={tournament.game}
        track={tournament.internationalTrack}
      />
      {isOwner && (
        <DeskFold title="Co-host">
          <CoAdminPanel tournament={tournament} isOwner={isOwner} onChange={(ids, tags) => onCoAdminsChange(ids, tags)} onAddByPlayerId={(playerTag) => onAddCoAdmin(tournament, playerTag)} />
        </DeskFold>
      )}
      {!isCustomRoomEvent(tournament) && showDetails && (isAdmin || hasPostedResults(tournament)) && (
        isAdmin ? (
          <DeskFold title="Final results">
            <TournamentResults results={tournament.results} isAdmin={isAdmin} onSave={onSaveResults} />
          </DeskFold>
        ) : (
          <TournamentResults results={tournament.results} isAdmin={isAdmin} onSave={onSaveResults} />
        )
      )}

      {!isCustomRoomEvent(tournament) && showDetails && (isAdmin || teams.length > 0 || matches.length > 0 || stats.length > 0) && (
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
    </PageEnter>
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

