import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  doc,
  collection,
  onSnapshot,
  setDoc,
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
  signInWithPopup,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { db, auth, googleProvider } from "./firebase";

const PLAYERS_COLLECTION = collection(db, "players");
const playerDocRef = (uid) => doc(db, "players", uid);

const TOURNAMENTS_COLLECTION = collection(db, "tournaments");
const tournamentDocRef = (id) => doc(db, "tournaments", id);
const teamsCollectionRef = (tid) => collection(db, "tournaments", tid, "teams");
const matchesCollectionRef = (tid) => collection(db, "tournaments", tid, "matches");
const statsCollectionRef = (tid) => collection(db, "tournaments", tid, "stats");
const registrationsCollectionRef = (tid) => collection(db, "tournaments", tid, "registrations");
const REPORTS_COLLECTION = collection(db, "reports");
const FRIEND_REQUESTS_COLLECTION = collection(db, "friendRequests");
const ARCHIVE_COLLECTION = collection(db, "esportsArchive");
const BLOG_POSTS_COLLECTION = collection(db, "blogPosts");
const SITE_POPUPS_COLLECTION = collection(db, "sitePopups");
const SITE_ROLES_COLLECTION = collection(db, "siteRoles");
const ARCHIVE_SUBMISSIONS_COLLECTION = collection(db, "archiveSubmissions");
const STAFF_ACTIONS_COLLECTION = collection(db, "staffActions");
const PRIZE_PRESETS = [0, 500, 1000, 2500, 5000, 10000];
const REPORT_REASONS = ["Abuse or harassment", "Scam or fraud", "Inappropriate content", "Other"];

const FONT_LINK_ID = "scoreline-fonts";

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

const LEGACY_GAME_NAMES = { "PUBG Mobile (BGMI)": "BGMI and PUBG Mobile" };

function normalizeGameName(game) {
  return LEGACY_GAME_NAMES[game] || game;
}

function normalizeGameNames(games = []) {
  return [...new Set(games.map(normalizeGameName))];
}

const GAME_PRESETS = [
  "Valorant",
  "League of Legends",
  "CS2",
  "Dota 2",
  "Overwatch 2",
  "Rocket League",
  "Apex Legends",
  "BGMI",
  "PUBG Mobile",
  "PUBG PC",
  "Mobile Legends: Bang Bang",
  "Free Fire",
  "Call of Duty",
  "Fortnite",
  "Rainbow Six Siege",
  "Honor of Kings",
  "Clash Royale",
  "Brawl Stars",
  "StarCraft 2",
  "Teamfight Tactics",
  "Other",
];

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
const TOURNAMENT_ARTWORKS = [
  { icon: "🏆", label: "Championship" },
  { icon: "🌌", label: "Cosmic" },
  { icon: "⚡", label: "Energy" },
  { icon: "🔥", label: "Inferno" },
  { icon: "❄️", label: "Frost" },
  { icon: "🐉", label: "Dragon" },
];
const QUICK_PICK_GAMES = ["Valorant", "BGMI", "PUBG Mobile", "Apex Legends"];
const BIO_EXAMPLES = [
  { label: "Friendly", text: "Here to improve, have fun, and find a friendly squad." },
  { label: "Competitive", text: "Focused on ranked games, clear comms, and steady improvement." },
  { label: "Flexible", text: "Happy to fill roles and play a few games when schedules line up." },
];

const THEME_CSS = "[data-theme=\"glacier\"] {\n  --page-bg: radial-gradient(circle at 12% 0%, rgba(74, 174, 232, 0.16), transparent 28%), linear-gradient(145deg, #EAF6FF 0%, #F7FBFF 52%, #E3F1FF 100%);\n  --page-bg-solid: #EFF8FF;\n  --page-text: #102B45;\n  --panel-bg: rgba(255, 255, 255, 0.94);\n  --panel-raised: #F1F8FF;\n  --input-bg: #F8FBFF;\n  --text-muted: #526C86;\n  --text-dim: #7189A1;\n  --border: #C9DFF1;\n  --border-strong: #AFCBE2;\n  --accent: #087FEA;\n  --accent-secondary: #13AFC7;\n  --accent-contrast: #FFFFFF;\n  --danger: #C83D4A;\n  --danger-border: #E7BDC5;\n  --rank-second: #70889F;\n  --rank-third: #A9653B;\n  --success: #148A72;\n  --google-bg: #FFFFFF;\n  --google-text: #102B45;\n  --panel-shadow: 0 8px 24px rgba(42, 112, 163, 0.10);\n}\n\n[data-theme=\"solar-flare\"] {\n  --page-bg: radial-gradient(circle at 90% 0%, rgba(255, 132, 39, 0.12), transparent 30%), linear-gradient(145deg, #17110F 0%, #1A1412 58%, #211510 100%);\n  --page-bg-solid: #17110F;\n  --page-text: #FFF1E6;\n  --panel-bg: rgba(34, 25, 21, 0.96);\n  --panel-raised: #2B1E19;\n  --input-bg: #1A1411;\n  --text-muted: #C3AA9A;\n  --text-dim: #967D70;\n  --border: #493025;\n  --border-strong: #684534;\n  --accent: #FF8A24;\n  --accent-secondary: #FFC04B;\n  --accent-contrast: #23120B;\n  --danger: #FF6B5D;\n  --danger-border: #673832;\n  --rank-second: #D2B99F;\n  --rank-third: #C8804A;\n  --success: #55CEA2;\n  --google-bg: #F8F7F4;\n  --google-text: #17110F;\n  --panel-shadow: 0 8px 26px rgba(255, 118, 29, 0.10);\n}\n\n[data-theme=\"glacier\"] [style*=\"var(--panel-bg)\"],\n[data-theme=\"solar-flare\"] [style*=\"var(--panel-bg)\"] {\n  box-shadow: var(--panel-shadow);\n}";

const FORMATS = ["Single elimination", "Double elimination", "Round robin", "Swiss", "Group stage"];

const STATUS_COLORS = {
  upcoming: "var(--text-muted)",
  live: "var(--accent-secondary)",
  completed: "var(--accent)",
};

function isTournamentArchived(t) {
  if (t.archived === true || t.status === "completed") return true;
  const date = t.endDate || t.startDate;
  if (!date) return false;
  const cutoff = new Date(`${date}T23:59:59`).getTime() + 7 * 24 * 60 * 60 * 1000;
  return Date.now() > cutoff;
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
      style={{
        width: size,
        height: size,
        display: "inline-grid",
        placeItems: "center",
        flexShrink: 0,
        borderRadius: 8,
        background: "var(--panel-raised)",
        border: "1px solid var(--border)",
        fontSize: Math.round(size * 0.56),
        lineHeight: 1,
      }}
    >
      {GAME_ICONS[game] || "🎮"}
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

function AuthScreen({ onGoogleSignIn, onEmailAuth, authError, authBusy }) {
  const [mode, setMode] = useState("signin"); // 'signin' | 'signup'
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const submit = (e) => {
    e.preventDefault();
    onEmailAuth(mode, { name, email, password });
  };

  return (
    <div
      data-theme="glacier"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        background: "var(--page-bg-solid)",
        color: "var(--page-text)",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <style>{THEME_CSS}</style>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 34, color: "var(--page-text)", letterSpacing: "0.04em" }}>
            GRINDINFO
          </div>
          <Eyebrow color="var(--accent-secondary)">Sign in to upload tournament data</Eyebrow>
        </div>

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
            marginBottom: 16,
          }}
        >
          Continue with Google
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "18px 0" }}>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          <span style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "'JetBrains Mono', monospace" }}>OR</span>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        </div>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {mode === "signup" && (
            <Field label="Display name">
              <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="ghostpeak" required />
            </Field>
          )}
          <Field label="Email">
            <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
          </Field>
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

        <div style={{ textAlign: "center", marginTop: 18, fontSize: 13, color: "var(--text-muted)" }}>
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

function ProfileModal({ initialProfile, defaultDisplayName, onSave, onSkip, onClose }) {
  const [displayName, setDisplayName] = useState(safeProfileName(initialProfile?.displayName, defaultDisplayName));
  const [games, setGames] = useState(normalizeGameNames(initialProfile?.games || []));
  const [region, setRegion] = useState(initialProfile?.region || "");
  const [language, setLanguage] = useState(initialProfile?.language || "");
  const [style, setStyle] = useState(initialProfile?.style || "");
  const [bio, setBio] = useState(initialProfile?.bio || "");
  const [avatar, setAvatar] = useState(initialProfile?.avatar || "🎮");
  const [discoverable, setDiscoverable] = useState(initialProfile?.discoverable === true);
  const [error, setError] = useState("");

  const toggleGame = (g) => {
    setGames((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  };

  const submit = () => {
    if (!displayName.trim() || isEmailLike(displayName)) {
      setError("Choose a player name, not an email address");
      return;
    }
    if (games.length === 0 || !region || !language) {
      setError("Pick at least one game, a region, and a language");
      return;
    }
    onSave({ displayName: displayName.trim(), games, region, language, style, bio: bio.trim(), avatar, discoverable });
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
            <TextInput value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={40} placeholder="ghostpeak" />
          </Field>
          <Field label="Games you play">
            <MultiToggle options={GAME_PRESETS} selected={games} onToggle={toggleGame} />
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

function PlayerCard({ player, currentUid, friendRequest, onFriendRequest, onFriendDecision, onReport }) {
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
        <span aria-hidden="true" style={{ width: 38, height: 38, borderRadius: "50%", display: "grid", placeItems: "center", background: "var(--panel-raised)", border: "1px solid var(--border)", fontSize: 20 }}>
          {player.avatar || "🎮"}
        </span>
        {player.displayName}
      </div>
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
      </div>
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
function FindPlayersPage({ currentUid, myProfile, friendRequests = [], onFriendRequest, onFriendDecision, onReport }) {
  const [gameFilters, setGameFilters] = useState([]);
  const [regionFilter, setRegionFilter] = useState("");
  const [languageFilter, setLanguageFilter] = useState("");
  const [styleFilter, setStyleFilter] = useState("");
  const [nameFilter, setNameFilter] = useState("");
  const [players, setPlayers] = useState([]);
  const [playersLoading, setPlayersLoading] = useState(false);
  const [playersError, setPlayersError] = useState("");
  const hasFilters = Boolean(gameFilters.length || regionFilter || languageFilter);
  const useMyInterests = () => {
    setGameFilters(normalizeGameNames(myProfile?.games || []));
    setRegionFilter(myProfile?.region || "");
    setLanguageFilter(myProfile?.language || "");
    setStyleFilter(myProfile?.style || "");
  };

  useEffect(() => {
    setPlayersError("");
    if (!hasFilters) {
      setPlayers([]);
      setPlayersLoading(false);
      return undefined;
    }

    setPlayersLoading(true);
    const filters = [where("discoverable", "==", true)];
    if (gameFilters.length) {
      const queryGames = normalizeGameNames(gameFilters).flatMap((game) =>
        game === "BGMI and PUBG Mobile" ? [game, "PUBG Mobile (BGMI)"] : [game]
      );
      filters.push(where("games", "array-contains-any", [...new Set(queryGames)]));
    }
    if (regionFilter) filters.push(where("region", "==", regionFilter));
    if (languageFilter) filters.push(where("language", "==", languageFilter));

    const playersQuery = query(PLAYERS_COLLECTION, ...filters);
    return onSnapshot(
      playersQuery,
      (snap) => {
        setPlayers(snap.docs.map((d) => ({ uid: d.id, ...d.data() })));
        setPlayersLoading(false);
      },
      () => {
        setPlayersError("Couldn't load players. Check your connection or database indexes, then try again.");
        setPlayersLoading(false);
      }
    );
  }, [gameFilters, regionFilter, languageFilter, hasFilters]);

  const filtered = players.filter((p) => p.uid !== currentUid && (!styleFilter || p.style === styleFilter)
    && (!nameFilter.trim() || (p.displayName || "").toLowerCase().includes(nameFilter.trim().toLowerCase())));

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          padding: "36px 0 20px",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <Eyebrow>Squad up</Eyebrow>
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 44, margin: "4px 0 0" }}>Find players</h1>
        </div>
      </div>

      <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 14, borderLeft: "2px solid var(--accent)", paddingLeft: 12 }}>
        Online teammates are people you may not know. Keep personal contact details private and stop interacting if someone makes you uncomfortable.
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        {myProfile && <Button variant="ghost" onClick={useMyInterests}>Use my interests</Button>}
        <div style={{ width: "100%" }}>
          <Field label="Games (choose any)">
            <MultiToggle
              options={GAME_PRESETS}
              selected={gameFilters}
              onToggle={(game) =>
                setGameFilters((previous) =>
                  previous.includes(game)
                    ? previous.filter((item) => item !== game)
                    : [...previous, game]
                )
              }
            />
          </Field>
        </div>
        <div style={{ minWidth: 160 }}>
          <Select value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)}>
            <option value="">All regions</option>
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
        </div>
        <div style={{ minWidth: 160 }}>
          <Select value={languageFilter} onChange={(e) => setLanguageFilter(e.target.value)}>
            <option value="">All languages</option>
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </Select>
        </div>
        <div style={{ minWidth: 190 }}>
          <Select value={styleFilter} onChange={(e) => setStyleFilter(e.target.value)} aria-label="Playing style">
            <option value="">Any playing style</option>
            {PLAY_STYLES.map((style) => (
              <option key={style} value={style}>
                {style}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div style={{ maxWidth: 360, margin: "8px 0 16px" }}><Field label="Search names in these matches"><TextInput value={nameFilter} onChange={(event) => setNameFilter(event.target.value)} placeholder="Type a player name" /></Field></div>
      {myProfile && (
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>
          “Use my interests” fills these filters from your profile. You can change them before searching.
        </div>
      )}

      {playersError && <div style={{ fontSize: 13, color: "var(--danger)", marginBottom: 14 }}>{playersError}</div>}
      {!hasFilters ? (
        <EmptyState title="Choose a search filter" body="Select one or more games, a region, or a language to search profiles that opted in to discovery. Playing style can narrow your matches." />
      ) : playersLoading ? (
        <div style={{ color: "var(--text-muted)", fontSize: 13, padding: 20 }}>Searching opted-in players…</div>
      ) : filtered.length === 0 ? (
        <EmptyState title="No players match yet" body="Try another game, region, language, or playing style." />
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

function RegistrationPanel({ tournament, requests, currentUserId, currentUserName, isAdmin, onRequest, onDecision }) {
  const mine = requests.find((request) => request.playerId === currentUserId);
  const pending = requests.filter((request) => request.status === "pending");
  const approved = requests.filter((request) => request.status === "approved");
  return (
    <section style={{ marginTop: 20, padding: 16, background: "var(--panel-bg)", border: "1px solid var(--border)" }}>
      <Eyebrow>Free registration</Eyebrow>
      <div style={{ fontSize: 13, color: "var(--text-muted)", margin: "8px 0 12px" }}>
        {mine ? `Your request is ${mine.status}.` : "Request a place. The tournament host or co-host must approve it."}
      </div>
      {!isAdmin && !mine && tournament.registrationOpen !== false && !isTournamentArchived(tournament) && <Button onClick={() => onRequest({ playerId: currentUserId, displayName: currentUserName })}>Request to join</Button>}
      {!isAdmin && (tournament.registrationOpen === false || isTournamentArchived(tournament)) && <div style={{ color: "var(--text-dim)", fontSize: 12 }}>Registration is closed.</div>}
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
    </section>
  );
}

function CoAdminPanel({ tournament, isOwner, onChange }) {
  const [accountId, setAccountId] = useState("");
  if (!isOwner) return null;
  const ids = tournament.coAdminUserIds || [];
  return (
    <section style={{ marginTop: 16, padding: 16, background: "var(--panel-bg)", border: "1px solid var(--border)" }}>
      <Eyebrow>Co-host access</Eyebrow>
      <div style={{ color: "var(--text-muted)", fontSize: 12, margin: "7px 0 10px" }}>Add a trusted player using their Firebase account UID. Co-hosts can manage this tournament; only you can transfer ownership or delete it.</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <TextInput aria-label="Co-host account UID" value={accountId} onChange={(event) => setAccountId(event.target.value)} placeholder="Paste account UID" />
        <Button disabled={!accountId.trim() || ids.includes(accountId.trim())} onClick={() => { onChange([...ids, accountId.trim()]); setAccountId(""); }}>Add co-host</Button>
      </div>
      {ids.map((id) => <div key={id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border)", padding: "8px 0", marginTop: 8, fontSize: 12 }}>{id}<Button variant="danger" onClick={() => onChange(ids.filter((item) => item !== id))}>Remove</Button></div>)}
    </section>
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

function ReportsInbox({ reports, onStatusChange }) {
  return (
    <div style={{ paddingTop: 34 }}>
      <Eyebrow>Owner and support tools · private</Eyebrow>
      <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 42, margin: "4px 0 18px" }}>Safety reports</h1>
      {reports.length === 0 ? <EmptyState title="No reports to review" body="New abuse, scam and inappropriate-content reports appear here." /> : <div style={{ display: "grid", gap: 10 }}>{reports.map((report) => <article key={report.id} style={{ padding: 16, background: "var(--panel-bg)", border: "1px solid var(--border)" }}><Eyebrow>{report.status || "submitted"} · {report.targetType} · {report.reason}</Eyebrow><h2 style={{ fontFamily: "'Bebas Neue', sans-serif", margin: "6px 0", fontSize: 22 }}>{report.targetName || "Reported item"}</h2><p style={{ fontSize: 13, color: "var(--text-muted)", whiteSpace: "pre-wrap" }}>{report.details || "No extra details provided."}</p><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><Button variant="ghost" onClick={() => onStatusChange(report.id, "reviewing")}>Mark reviewing</Button><Button onClick={() => onStatusChange(report.id, "closed")}>Close report</Button></div></article>)}</div>}
    </div>
  );
}

function ArchiveSubmissionInbox({ submissions, onDecision }) {
  const pending = submissions.filter((item) => item.status === "pending");
  return <section>
    <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Review community-submitted historical event records before adding them to the public archive.</p>
    {pending.length === 0 ? <EmptyState title="No archive requests waiting" body="New event submissions will appear here for review." /> : <div style={{ display: "grid", gap: 10 }}>{pending.map((item) => <article key={item.id} style={{ padding: 14, background: "var(--panel-bg)", border: "1px solid var(--border)" }}><Eyebrow>{item.game} · {item.eventDate} · by {item.submitterName || "Player"}</Eyebrow><h2 style={{ fontFamily: "'Bebas Neue', sans-serif", margin: "6px 0" }}>{item.tournament}</h2><p style={{ margin: "6px 0" }}>Winner: {item.winner}{item.runnerUp ? ` · Runner-up: ${item.runnerUp}` : ""}{item.mvp ? ` · MVP: ${item.mvp}` : ""}</p>{item.source && <a href={item.source} target="_blank" rel="noopener noreferrer">Source</a>}<div style={{ display: "flex", gap: 8, marginTop: 10 }}><Button onClick={() => onDecision(item.id, "approved")}>Approve to archive</Button><Button variant="danger" onClick={() => onDecision(item.id, "rejected")}>Decline</Button></div></article>)}</div>}
  </section>;
}

function StaffActivityLog({ actions }) {
  const ordered = [...actions].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 100);
  return <section>
    <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Recent owner and support actions. This log is visible to the owner only.</p>
    {ordered.length === 0 ? <EmptyState title="No staff actions recorded yet" body="Report, blog, archive, popup, and support-access decisions will appear here." /> : <div style={{ display: "grid", gap: 8 }}>{ordered.map((item) => <article key={item.id} style={{ padding: 12, background: "var(--panel-bg)", border: "1px solid var(--border)" }}><Eyebrow>{new Date(item.createdAt || 0).toLocaleString()} · {item.actorName || "Staff"}</Eyebrow><div style={{ marginTop: 5 }}>{item.summary}</div></article>)}</div>}
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
  const [error, setError] = useState("");
  const selected = candidates.find((post) => post.id === postId);
  const choosePost = (id) => {
    const post = candidates.find((item) => item.id === id);
    setPostId(id); setEventDate(""); setWinner(""); setRunnerUp(""); setMvp(""); setSource(post?.source || ""); setError("");
  };
  return <section style={{ maxWidth: 680 }}>
    <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Turn a published blog into a separate structured archive record. Add the event date and winner before saving.</p>
    {candidates.length === 0 ? <EmptyState title="No published blogs to add" body="Publish a blog first, then you can create an archive record from it." /> : <>
      <Field label="Published blog"><Select value={postId} onChange={(event) => choosePost(event.target.value)}><option value="">Choose a post…</option>{candidates.map((post) => <option key={post.id} value={post.id}>{post.title} · {post.game}</option>)}</Select></Field>
      {selected && <div style={{ display: "grid", gap: 8, marginTop: 10, padding: 14, background: "var(--panel-bg)", border: "1px solid var(--border)" }}>
        <Field label="Event date"><TextInput maxLength={40} value={eventDate} onChange={(event) => setEventDate(event.target.value)} placeholder="YYYY or YYYY-MM-DD" /></Field>
        <Field label="Winner"><TextInput maxLength={100} value={winner} onChange={(event) => setWinner(event.target.value)} /></Field>
        <Field label="Runner-up (optional)"><TextInput maxLength={100} value={runnerUp} onChange={(event) => setRunnerUp(event.target.value)} /></Field>
        <Field label="MVP (optional)"><TextInput maxLength={100} value={mvp} onChange={(event) => setMvp(event.target.value)} /></Field>
        <Field label="Source link (optional)"><TextInput maxLength={500} value={source} onChange={(event) => setSource(event.target.value)} /></Field>
        {error && <div role="alert" style={{ color: "var(--danger)" }}>{error}</div>}
        <Button onClick={async () => { if (!eventDate.trim() || !winner.trim()) { setError("Add the event date and winner."); return; } try { await onPromote(selected, { eventDate, winner, runnerUp, mvp, source }); choosePost(""); } catch { setError("Could not add this record to the archive."); } }}>Add event to archive</Button>
      </div>}
    </>}
  </section>;
}

function ArchiveRequestForm({ user, submissions, onSubmit }) {
  const [form, setForm] = useState({ tournament: "", game: "", eventDate: "", winner: "", runnerUp: "", mvp: "", source: "" });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const ownRequests = submissions.filter((item) => item.submitterId === user.uid).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async () => {
    if (!form.tournament.trim() || !form.game.trim() || !form.eventDate.trim() || !form.winner.trim()) { setError("Add the event name, game, date, and winner."); return; }
    if (form.source.trim() && !/^https:\/\//i.test(form.source.trim())) { setError("Source links must start with https://."); return; }
    try { await onSubmit(form); setForm({ tournament: "", game: "", eventDate: "", winner: "", runnerUp: "", mvp: "", source: "" }); setError(""); setMessage("Archive request sent for review."); }
    catch { setError("Could not send this request. Please try again."); }
  };
  return <section style={{ display: "grid", gap: 8, maxWidth: 680, padding: 16, margin: "16px 0", background: "var(--panel-bg)", border: "1px solid var(--border)" }}>
    <Eyebrow>Suggest an event for the archive</Eyebrow><p style={{ margin: 0, color: "var(--text-muted)", fontSize: 13 }}>Send results for a major, underdog, or lesser-known esports tournament. An owner or support reviewer checks it before it becomes public.</p>
    <Field label="Tournament"><TextInput maxLength={120} value={form.tournament} onChange={(e) => update("tournament", e.target.value)} /></Field>
    <Field label="Game"><TextInput maxLength={60} value={form.game} onChange={(e) => update("game", e.target.value)} /></Field>
    <Field label="Event date"><TextInput maxLength={40} value={form.eventDate} onChange={(e) => update("eventDate", e.target.value)} placeholder="YYYY or YYYY-MM-DD" /></Field>
    <Field label="Winner"><TextInput maxLength={100} value={form.winner} onChange={(e) => update("winner", e.target.value)} /></Field>
    <Field label="Runner-up (optional)"><TextInput maxLength={100} value={form.runnerUp} onChange={(e) => update("runnerUp", e.target.value)} /></Field>
    <Field label="MVP (optional)"><TextInput maxLength={100} value={form.mvp} onChange={(e) => update("mvp", e.target.value)} /></Field>
    <Field label="Reliable source link (optional)"><TextInput maxLength={500} value={form.source} onChange={(e) => update("source", e.target.value)} placeholder="https://" /></Field>
    {error && <div role="alert" style={{ color: "var(--danger)" }}>{error}</div>}{message && <div role="status" style={{ color: "var(--success)" }}>{message}</div>}
    <Button onClick={submit}>Request archive listing</Button>
    {ownRequests.length > 0 && <div style={{ marginTop: 8 }}><Eyebrow>Your archive requests</Eyebrow>{ownRequests.map((item) => <div key={item.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "8px 0", borderTop: "1px solid var(--border)", fontSize: 13 }}><span>{item.tournament}</span><span>{item.status}</span></div>)}</div>}
  </section>;
}

function SitePopup({ popup, onDismiss }) {
  if (!popup) return null;
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="site-popup-title" style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,.66)", display: "grid", placeItems: "center", padding: 18 }}>
      <section style={{ width: "min(100%, 520px)", background: "var(--panel-bg)", color: "var(--page-text)", border: "1px solid var(--border-strong)", boxShadow: "var(--panel-shadow)", padding: 24 }}>
        <Eyebrow color={popup.type === "disclaimer" ? "var(--danger)" : "var(--accent-secondary)"}>{popup.type === "disclaimer" ? "Safety reminder" : "GrindInfo boost"}</Eyebrow>
        <h2 id="site-popup-title" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 30, margin: "8px 0" }}>{popup.title}</h2>
        <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.6, color: "var(--text-muted)" }}>{popup.message}</p>
        <Button onClick={onDismiss}>{popup.type === "disclaimer" ? "I understand" : "Let's go"}</Button>
      </section>
    </div>
  );
}

function OwnerDashboard({ role, reports, onStatusChange, popups, onSavePopup, onDeletePopup, staff, onSetSupport, tournaments, archiveEntries = [], blogPosts, onBlogReview, onPromoteBlog, archiveSubmissions = [], onArchiveDecision, auditLog = [] }) {
  const isOwner = role === "owner";
  const [tab, setTab] = useState("overview");
  const [editing, setEditing] = useState(null);
  const [staffUid, setStaffUid] = useState("");
  const [popupError, setPopupError] = useState("");
  const [staffError, setStaffError] = useState("");
  const activeReports = reports.filter((item) => item.status !== "closed").length;
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
    setEditing(popup ? { ...popup, startsAt: toLocalInput(popup.startsAt), endsAt: toLocalInput(popup.endsAt) } : { id: "", title: "", message: "", type: "motivation", enabled: true, frequency: "daily", startsAt: "", endsAt: "" });
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
      frequency: editing.frequency === "session" ? "session" : "daily",
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
        {["overview", "reports", "blogs", "archive requests", "blog to archive", ...(isOwner ? ["activity log", "popups", "support access"] : [])].map((name) => <Button key={name} variant={tab === name ? "primary" : "ghost"} onClick={() => setTab(name)}>{name[0].toUpperCase() + name.slice(1)}</Button>)}
      </div>
      {tab === "overview" && <>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 18 }}>
          {[["Open reports", activeReports], ["Pending blogs", pendingBlogs], ["Archive requests", pendingArchiveRequests], ["Active tournaments", activeTournaments], ["Archive records", archiveEntries.length]].map(([label, value]) => <article key={label} style={{ padding: 16, background: "var(--panel-bg)", border: "1px solid var(--border)" }}><Eyebrow>{label}</Eyebrow><strong style={{ display: "block", fontSize: 25, marginTop: 8 }}>{value}</strong></article>)}
        </div>
        <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Use the dashboard tabs to review safety reports{isOwner ? ", manage site popups, and control support access." : "."}</p>
      </>}
      {tab === "reports" && <ReportsInbox reports={reports} onStatusChange={onStatusChange} />}
      {tab === "archive requests" && <ArchiveSubmissionInbox submissions={archiveSubmissions} onDecision={onArchiveDecision} />}
      {tab === "blog to archive" && <BlogArchivePromoter posts={blogPosts} onPromote={onPromoteBlog} />}
      {tab === "activity log" && isOwner && <StaffActivityLog actions={auditLog} />}
      {tab === "blogs" && <section><p style={{ color: "var(--text-muted)", fontSize: 13 }}>Preview submitted and published community posts.</p>{blogPosts.length === 0 ? <EmptyState title="No blog posts yet" body="Community submissions will appear here for preview." /> : <div style={{ display: "grid", gap: 10 }}>{[...blogPosts].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 30).map((post) => <article key={post.id} style={{ padding: 14, background: "var(--panel-bg)", border: "1px solid var(--border)" }}><Eyebrow>{post.game} · {post.status} · by {post.authorName || "Player"}</Eyebrow><h2 style={{ fontFamily: "'Bebas Neue', sans-serif", margin: "6px 0" }}>{post.title}</h2><p style={{ whiteSpace: "pre-wrap", color: "var(--text-muted)" }}>{post.content}</p>{post.source && <a href={post.source} target="_blank" rel="noopener noreferrer">Source</a>}{post.status === "pending" && <div style={{ display: "flex", gap: 8, marginTop: 10 }}><Button onClick={() => onBlogReview(post.id, "published")}>Publish</Button><Button variant="danger" onClick={() => onBlogReview(post.id, "rejected")}>Decline</Button></div>}</article>)}</div>}</section>}
      {tab === "popups" && isOwner && <section>
        <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Create plain-text safety reminders and motivation messages. Changes appear on GrindInfo without editing the website code.</p>
        <Button onClick={() => openEditor()}>Add popup</Button>
        {editing && <div style={{ display: "grid", gap: 10, maxWidth: 620, padding: 16, marginTop: 14, background: "var(--panel-bg)", border: "1px solid var(--border)" }}>
          <Field label="Title"><TextInput value={editing.title} maxLength={100} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></Field>
          <Field label="Message"><textarea value={editing.message} maxLength={1000} rows={4} onChange={(e) => setEditing({ ...editing, message: e.target.value })} style={{ ...inputStyle, resize: "vertical" }} /></Field>
          <Field label="Type"><Select value={editing.type} onChange={(e) => setEditing({ ...editing, type: e.target.value })}><option value="motivation">Motivation</option><option value="disclaimer">Safety disclaimer</option></Select></Field>
          <Field label="Show frequency"><Select value={editing.frequency} onChange={(e) => setEditing({ ...editing, frequency: e.target.value })}><option value="daily">Once per day</option><option value="session">Once per browser session</option></Select></Field>
          <Field label="Start showing (optional)"><TextInput type="datetime-local" value={editing.startsAt || ""} onChange={(e) => setEditing({ ...editing, startsAt: e.target.value })} /></Field>
          <Field label="Stop showing (optional)"><TextInput type="datetime-local" value={editing.endsAt || ""} onChange={(e) => setEditing({ ...editing, endsAt: e.target.value })} /></Field>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}><input type="checkbox" checked={editing.enabled} onChange={(e) => setEditing({ ...editing, enabled: e.target.checked })} /> Enabled</label>
          {popupError && <div role="alert" style={{ color: "var(--danger)" }}>{popupError}</div>}
          <div style={{ display: "flex", gap: 8 }}><Button onClick={savePopup}>Save popup</Button><Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button></div>
        </div>}
        <div style={{ display: "grid", gap: 10, marginTop: 14 }}>{popups.map((popup) => <article key={popup.id} style={{ padding: 14, background: "var(--panel-bg)", border: "1px solid var(--border)" }}><Eyebrow>{popup.enabled ? "Enabled" : "Disabled"} · {popup.type}</Eyebrow><h2 style={{ fontFamily: "'Bebas Neue', sans-serif", margin: "5px 0" }}>{popup.title}</h2><p style={{ whiteSpace: "pre-wrap", color: "var(--text-muted)" }}>{popup.message}</p><div style={{ display: "flex", gap: 8 }}><Button variant="ghost" onClick={() => openEditor(popup)}>Edit</Button><Button variant="danger" onClick={() => onDeletePopup(popup.id)}>Delete</Button></div></article>)}</div>
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

function HistoricalArchive({ entries, isModerator, user, submissions, onSubmitRequest, onImport }) {
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState(null);
  const parseCsv = (text) => {
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
    const headers = rows.shift().map((header) => header.toLowerCase());
    const required = ["tournament", "game", "eventdate", "winner"];
    if (required.some((header) => !headers.includes(header))) throw new Error("Required CSV columns: tournament, game, eventDate, winner.");
    return rows.filter((cells) => cells.some(Boolean)).map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] || ""]))).slice(0, 200);
  };
  return (
    <div style={{ paddingTop: 34 }}>
      <Eyebrow>International esports history</Eyebrow>
      <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 42, margin: "4px 0 8px" }}>Past results archive</h1>
      <div style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 18 }}>Browse past events, winners, runners-up and MVPs. To add records, select a CSV with columns tournament, game, eventDate, winner, runnerUp, mvp and source.</div>
      {user && <ArchiveRequestForm user={user} submissions={submissions} onSubmit={onSubmitRequest} />}
      {isModerator && <Field label="Import CSV (up to 200 rows)">
        <input type="file" accept=".csv,text/csv" onChange={async (event) => {
          setError(""); setMessage("");
          const file = event.target.files?.[0]; if (!file) return;
          if (file.size > 1024 * 1024) { setError("Choose a CSV smaller than 1 MB."); return; }
          try {
            const records = parseCsv(await file.text());
            const known = new Set(entries.map((entry) => [entry.tournament, entry.game, entry.eventDate].map((part) => String(part || "").toLowerCase()).join("|")));
            const clean = records.filter((entry) => entry.tournament && entry.game && entry.eventdate && entry.winner).map((entry) => ({
              tournament: entry.tournament.slice(0, 120), game: entry.game.slice(0, 60), eventDate: entry.eventdate.slice(0, 40),
              winner: entry.winner.slice(0, 100), runnerUp: (entry.runnerup || "").slice(0, 100), mvp: (entry.mvp || "").slice(0, 100),
              source: (entry.source || "").trim().slice(0, 500),
            })).filter((entry) => {
              if (entry.source && !/^https:\/\//i.test(entry.source)) throw new Error("Source links must start with https://.");
              const key = [entry.tournament, entry.game, entry.eventDate].map((part) => part.toLowerCase()).join("|");
              if (known.has(key)) return false;
              known.add(key);
              return true;
            });
            if (!clean.length) throw new Error("No new complete records found. Check the required columns and duplicates.");
            setPreview(clean); setMessage("Review the records below, then choose Import to publish them.");
          } catch (issue) { setError(issue.message || "Could not read this CSV."); }
          event.target.value = "";
        }} />
      </Field>}
      {error && <div role="alert" style={{ color: "var(--danger)", marginTop: 10, fontSize: 13 }}>{error}</div>}
      {message && <div role="status" style={{ color: "var(--success)", marginTop: 10, fontSize: 13 }}>{message}</div>}
      {preview && <section style={{ marginTop: 14, padding: 14, border: "1px solid var(--border-strong)", background: "var(--panel-bg)" }}>
        <Eyebrow>Import preview · {preview.length} record(s)</Eyebrow>
        <div style={{ display: "grid", gap: 6, margin: "10px 0 14px", fontSize: 12, color: "var(--text-muted)" }}>
          {preview.slice(0, 8).map((entry, index) => <div key={index}>{entry.eventDate} · {entry.game} · {entry.tournament} · Winner: {entry.winner}</div>)}
          {preview.length > 8 && <div>and {preview.length - 8} more…</div>}
        </div>
        <div style={{ display: "flex", gap: 8 }}><Button onClick={async () => {
          setError(""); setMessage("");
          try { await onImport(preview); setMessage(`Imported ${preview.length} event record(s).`); setPreview(null); }
          catch (issue) { setError(issue.message || "Could not import these records."); }
        }}>Import {preview.length} records</Button><Button variant="ghost" onClick={() => { setPreview(null); setMessage(""); }}>Cancel import</Button></div>
      </section>}
      <div style={{ display: "grid", gap: 10, marginTop: 20 }}>
      {entries.length === 0 ? <EmptyState title="Archive is ready for records" body="Add historical international esports results with the moderator CSV import." /> : entries.map((entry) => <article key={entry.id} style={{ padding: 16, background: "var(--panel-bg)", border: "1px solid var(--border)" }}><Eyebrow>{entry.game} · {entry.eventDate}</Eyebrow><h2 style={{ fontFamily: "'Bebas Neue', sans-serif", margin: "6px 0", fontSize: 24 }}>{entry.tournament}</h2><div>🏆 {entry.winner}{entry.runnerUp ? ` · Runner-up: ${entry.runnerUp
}` : ""}{entry.mvp ? ` · MVP: ${entry.mvp}` : ""}</div>{entry.source && <a href={entry.source} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: 8, color: "var(--accent)" }}>Source</a>}</article>)}
      </div>
    </div>
  );
}

function LoadingScreen({ label }) {
  return <div role="status" aria-live="polite" style={{ minHeight: "60vh", display: "grid", placeItems: "center", background: "var(--page-bg-solid, #101820)", color: "var(--page-text, #EDF1F4)", fontFamily: "'Inter',sans-serif" }}><div style={{ textAlign: "center" }}><div className="grind-loader" aria-hidden="true"><span>G</span></div><div style={{ marginTop: 16 }}>{label}…</div><style>{`.grind-loader{width:68px;height:68px;margin:auto;border:2px solid var(--border,#314);border-top-color:var(--accent,#08f);border-right-color:var(--accent-secondary,#0dc);border-radius:50%;display:grid;place-items:center;animation:grind-spin 1.2s linear infinite}.grind-loader span{font-family:'Bebas Neue',sans-serif;font-size:30px;animation:grind-spin 1.2s linear infinite reverse}@keyframes grind-spin{to{transform:rotate(360deg)}}@media(prefers-reduced-motion:reduce){.grind-loader,.grind-loader span{animation:none}}`}</style></div></div>;
}

function BlogPage({ posts, user, isModerator, onSubmit, onReview, onEdit, onDelete }) {
  const [title, setTitle] = useState("");
  const [game, setGame] = useState("");
  const [content, setContent] = useState("");
  const [source, setSource] = useState("");
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState("");
  const [draft, setDraft] = useState({ title: "", game: "", content: "", source: "" });
  const visible = posts.filter((post) => post.status === "published" || post.authorId === user.uid || (isModerator && post.status === "pending"));
  const submit = async () => {
    if (!title.trim() || !game.trim() || !content.trim()) { setError("Add a title, game, and post text."); return; }
    if (source.trim() && !/^https:\/\//i.test(source.trim())) { setError("Use a secure https source link."); return; }
    try { await onSubmit({ title: title.trim(), game: game.trim(), content: content.trim(), source: source.trim() }); setTitle(""); setGame(""); setContent(""); setSource(""); setError(""); }
    catch { setError("Could not submit this post. Please try again."); }
  };
  const startEdit = (post) => { setEditingId(post.id); setDraft({ title: post.title || "", game: post.game || "", content: post.content || "", source: post.source || "" }); setError(""); };
  const saveEdit = async (post) => {
    if (!draft.title.trim() || !draft.game.trim() || !draft.content.trim()) { setError("Add a title, game, and post text."); return; }
    if (draft.source.trim() && !/^https:\/\//i.test(draft.source.trim())) { setError("Use a secure https source link."); return; }
    try { await onEdit(post, { title: draft.title.trim(), game: draft.game.trim(), content: draft.content.trim(), source: draft.source.trim() }); setEditingId(""); setError(""); }
    catch { setError("Could not save this post. Please try again."); }
  };
  return <div style={{ paddingTop: 32 }}><Eyebrow>Community stories</Eyebrow><h1 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 42 }}>Esports blog</h1><p style={{ color: "var(--text-muted)" }}>Send a tournament recap or esports story to the GrindInfo owner for review before it appears publicly.</p><section style={{ display: "grid", gap: 10, padding: 16, background: "var(--panel-bg)", border: "1px solid var(--border)", maxWidth: 680 }}><Field label="Post title"><TextInput value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} /></Field><Field label="Game"><TextInput value={game} maxLength={60} onChange={(e) => setGame(e.target.value)} placeholder="e.g. Valorant" /></Field><Field label="Story or tournament update"><textarea value={content} maxLength={6000} onChange={(e) => setContent(e.target.value)} rows={6} style={{ ...inputStyle, resize: "vertical" }} /></Field><Field label="Source link (optional)"><TextInput value={source} maxLength={500} onChange={(e) => setSource(e.target.value)} placeholder="https://" /></Field>{error && <span role="alert" style={{ color: "var(--danger)" }}>{error}</span>}<Button onClick={submit}>Request publication</Button></section><div style={{ display: "grid", gap: 12, marginTop: 20 }}>{visible.map((post) => <article key={post.id} style={{ padding: 16, background: "var(--panel-bg)", border: "1px solid var(--border)" }}><Eyebrow>{post.game} · {post.status}</Eyebrow>{editingId === post.id ? <div style={{ display: "grid", gap: 8, marginTop: 8 }}><Field label="Post title"><TextInput maxLength={120} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></Field><Field label="Game"><TextInput maxLength={60} value={draft.game} onChange={(e) => setDraft({ ...draft, game: e.target.value })} /></Field><Field label="Story"><textarea maxLength={6000} rows={6} value={draft.content} onChange={(e) => setDraft({ ...draft, content: e.target.value })} style={{ ...inputStyle, resize: "vertical" }} /></Field><Field label="Source link (optional)"><TextInput maxLength={500} value={draft.source} onChange={(e) => setDraft({ ...draft, source: e.target.value })} /></Field><div style={{ display: "flex", gap: 8 }}><Button onClick={() => saveEdit(post)}>Save changes</Button><Button variant="ghost" onClick={() => setEditingId("")}>Cancel</Button></div></div> : <><h2 style={{ fontFamily: "'Bebas Neue',sans-serif" }}>{post.title}</h2><div style={{ color: "var(--text-muted)", whiteSpace: "pre-wrap" }}>{post.content}</div><div style={{ marginTop: 8, fontSize: 12 }}>By {post.authorName || "Player"}</div>{post.source && <a href={post.source} target="_blank" rel="noopener noreferrer">Source</a>}{isModerator && post.status === "pending" && <div style={{ display: "flex", gap: 8, marginTop: 12 }}><Button onClick={() => onReview(post.id, "published")}>Publish</Button><Button variant="danger" onClick={() => onReview(post.id, "rejected")}>Decline</Button></div>}{(post.authorId === user.uid || isModerator) && <div style={{ display: "flex", gap: 8, marginTop: 12 }}><Button variant="ghost" onClick={() => startEdit(post)}>Edit post</Button><Button variant="danger" onClick={() => { if (window.confirm("Delete this blog post? This cannot be undone.")) onDelete(post); }}>Delete post</Button></div>}{post.authorId === user.uid && post.status === "published" && <small style={{ display: "block", marginTop: 8, color: "var(--text-muted)" }}>Saving an edit sends the post back for review.</small>}</>}{error && editingId === post.id && <div role="alert" style={{ color: "var(--danger)", marginTop: 8 }}>{error}</div>}</article>)}</div></div>;
}



export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem("grindinfo-theme") || "glacier");
  const [tournaments, setTournaments] = useState([]);
  const [selectedTeams, setSelectedTeams] = useState([]);
  const [selectedMatches, setSelectedMatches] = useState([]);
  const [selectedStats, setSelectedStats] = useState([]);
  const [selectedRegistrations, setSelectedRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [view, setView] = useState(() => new URLSearchParams(window.location.search).has("tournament") ? "detail" : "list");
  const [selectedId, setSelectedId] = useState(() => new URLSearchParams(window.location.search).get("tournament"));
  const [detailTab, setDetailTab] = useState("teams");
  const [showNewTournament, setShowNewTournament] = useState(false);
  const [reportTarget, setReportTarget] = useState(null);
  const [isModerator, setIsModerator] = useState(false);
  const [siteRole, setSiteRole] = useState(null);
  const [friendRequests, setFriendRequests] = useState([]);
  const [archiveEntries, setArchiveEntries] = useState([]);
  const [archiveSubmissions, setArchiveSubmissions] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [blogPosts, setBlogPosts] = useState([]);
  const [privateReports, setPrivateReports] = useState([]);
  const [activePopups, setActivePopups] = useState([]);
  const [adminPopups, setAdminPopups] = useState([]);
  const [siteStaff, setSiteStaff] = useState([]);
  const [currentPopup, setCurrentPopup] = useState(null);
  const [popupScanTick, setPopupScanTick] = useState(0);

  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  const handleGoogleSignIn = useCallback(async () => {
    setAuthError("");
    setAuthBusy(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      setAuthError("Couldn't sign in with Google — try again");
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const handleEmailAuth = useCallback(async (mode, { name, email, password }) => {
    setAuthError("");
    setAuthBusy(true);
    try {
      if (mode === "signup") {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        if (name.trim()) {
          await updateProfile(cred.user, { displayName: name.trim() });
        }
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (e) {
      const messages = {
        "auth/email-already-in-use": "That email is already registered — try signing in instead.",
        "auth/invalid-credential": "Incorrect email or password.",
        "auth/weak-password": "Password should be at least 6 characters.",
        "auth/invalid-email": "That email address doesn't look right.",
      };
      setAuthError(messages[e.code] || "Something went wrong — try again.");
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const handleSignOut = useCallback(() => {
    signOut(auth);
  }, []);

  // ---- player profiles ----
  const [section, setSection] = useState("tournaments"); // 'tournaments' | 'players'
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
      const dismissed = localStorage.getItem(`profilePromptDismissed_${user.uid}`);
      if (!profile && !dismissed) {
        setShowProfileModal(true);
      }
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user) { setIsModerator(false); setSiteRole(null); return undefined; }
    const stopRole = onSnapshot(doc(SITE_ROLES_COLLECTION, user.uid), (snapshot) => {
      const data = snapshot.exists() ? snapshot.data() : null;
      setSiteRole(data?.enabled !== false && ["owner", "support"].includes(data?.role) ? data.role : null);
    }, () => setSiteRole(null));
    const stopModerator = onSnapshot(doc(db, "moderators", user.uid), (snapshot) => {
      setIsModerator(snapshot.exists() && snapshot.data().enabled === true);
    }, () => setIsModerator(false));
    return () => { stopRole(); stopModerator(); };
  }, [user]);

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
    if (!user) { setBlogPosts([]); return undefined; }
    let publicPosts = [], ownPosts = [], pendingPosts = [];
    const publish = () => setBlogPosts([...new Map([...publicPosts, ...ownPosts, ...pendingPosts].map((post) => [post.id, post])).values()]);
    const stops = [
      onSnapshot(query(BLOG_POSTS_COLLECTION, where("status", "==", "published")), (snap) => { publicPosts = snap.docs.map((d) => ({ id: d.id, ...d.data() })); publish(); }, () => { publicPosts = []; publish(); }),
      onSnapshot(query(BLOG_POSTS_COLLECTION, where("authorId", "==", user.uid)), (snap) => { ownPosts = snap.docs.map((d) => ({ id: d.id, ...d.data() })); publish(); }, () => { ownPosts = []; publish(); }),
    ];
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
    if (siteRole !== "owner" && siteRole !== "support") { setPrivateReports([]); return undefined; }
    return onSnapshot(REPORTS_COLLECTION, (snapshot) => {
      setPrivateReports(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
    }, () => setPrivateReports([]));
  }, [isModerator, siteRole]);

  useEffect(() => onSnapshot(query(SITE_POPUPS_COLLECTION, where("enabled", "==", true)), (snapshot) => {
    setActivePopups(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
  }, () => setActivePopups([])), []);

  useEffect(() => {
    if (siteRole !== "owner") { setAdminPopups([]); setSiteStaff([]); return undefined; }
    const stopPopups = onSnapshot(SITE_POPUPS_COLLECTION, (snapshot) => setAdminPopups(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))), () => setAdminPopups([]));
    const stopStaff = onSnapshot(SITE_ROLES_COLLECTION, (snapshot) => setSiteStaff(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))), () => setSiteStaff([]));
    return () => { stopPopups(); stopStaff(); };
  }, [siteRole]);

  useEffect(() => {
    if (showProfileModal) { setCurrentPopup(null); return; }
    const now = Date.now();
    const nextBoundary = activePopups
      .flatMap((popup) => [popup.startsAt, popup.endsAt])
      .filter((time) => typeof time === "number" && time > now)
      .sort((a, b) => a - b)[0];
    const timer = nextBoundary
      ? window.setTimeout(() => setPopupScanTick((tick) => tick + 1), Math.min(nextBoundary - now + 50, 2147483000))
      : null;
    const eligible = activePopups.filter((popup) => {
      if (popup.enabled !== true || (popup.startsAt && popup.startsAt > now) || (popup.endsAt && popup.endsAt < now)) return false;
      const version = popup.updatedAt || popup.createdAt || 0;
      const key = `grindinfo-popup:${popup.id}:${version}`;
      const seen = popup.frequency === "session" ? sessionStorage.getItem(key) : localStorage.getItem(key);
      const today = new Date().toISOString().slice(0, 10);
      return !seen || (popup.frequency !== "session" && seen !== today);
    });
    const disclaimers = eligible.filter((popup) => popup.type === "disclaimer");
    const motivations = eligible.filter((popup) => popup.type === "motivation");
    const list = disclaimers.length ? disclaimers : motivations;
    if (!list.length) { setCurrentPopup(null); return () => { if (timer) window.clearTimeout(timer); }; }
    const selected = list[Math.floor(Math.random() * list.length)];
    setCurrentPopup(selected);
    return () => { if (timer) window.clearTimeout(timer); };
  }, [activePopups, popupScanTick, showProfileModal]);

  const skipProfile = useCallback(() => {
    if (user) localStorage.setItem(`profilePromptDismissed_${user.uid}`, "1");
    setShowProfileModal(false);
  }, [user]);

  useEffect(() => {
    localStorage.setItem("grindinfo-theme", theme);
  }, [theme]);

  useEffect(() => {
    ensureFonts();
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

  const showToast = useCallback((msg) => {
    setToast(msg);
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(""), 2200);
  }, []);

  const saveProfile = useCallback(
    async (fields) => {
      if (!user) return;
      try {
        await setDoc(playerDocRef(user.uid), {
          ...fields,
          displayName: safeProfileName(fields.displayName, user.displayName),
          bio: String(fields.bio || "").slice(0, 200),
          discoverable: fields.discoverable === true,
          updatedAt: Date.now(),
        });
        showToast("Profile saved");
      } catch (e) {
        showToast("Couldn't save profile — try again");
      }
      setShowProfileModal(false);
    },
    [user, showToast]
  );

  // ---- mutations (now writing to the tournaments collection + sub-collections) ----
  const addTournament = async (t) => {
    if (!user) return;
    setSaving(true);
    try {
      await addDoc(TOURNAMENTS_COLLECTION, {
        ...t,
        prizeAmount: Number(t.prizeAmount) || 0,
        prizeCurrency: t.prizeCurrency || "INR",
        registrationOpen: true,
        adminUserId: user.uid,
        adminDisplayName: safeProfileName(myProfile?.displayName, user.displayName),
        coAdminUserIds: [],
        status: t.status || "upcoming",
        isLegacyImport: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      showToast("Tournament created");
      setShowNewTournament(false);
    } catch (e) {
      showToast("Couldn't create tournament — try again");
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
      setView("list");
      setSelectedId(null);
      const url = new URL(window.location.href); url.searchParams.delete("tournament"); window.history.replaceState({}, "", url);
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
    try {
      await setDoc(doc(registrationsCollectionRef(tournamentId), user.uid), {
        playerId: user.uid, displayName: safeProfileName(player.displayName),
        status: "pending", requestedAt: Date.now(),
      });
      showToast("Join request sent to the tournament host");
    } catch (e) {
      showToast(e?.code === "permission-denied"
        ? "Firebase blocked the join request. The Firestore rules may need to be published."
        : "Couldn't send the join request. Check whether one is already pending.");
    }
  };

  const decideRegistration = async (tournamentId, requestId, status) => {
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
    try { await updateDoc(tournamentDocRef(tournamentId), { registrationOpen: false, archived: true, archivedAt: Date.now(), updatedAt: Date.now() }); showToast("Tournament closed and moved to archive"); }
    catch (e) { showToast("Couldn\u2019t close tournament. Check Firestore rules."); }
  };

  const submitBlogPost = async (post) => {
    try { await addDoc(BLOG_POSTS_COLLECTION, { ...post, authorId: user.uid, authorName: safeProfileName(myProfile?.displayName, user.displayName), status: "pending", createdAt: Date.now() }); showToast("Blog request sent for review"); }
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

  const updateCoAdmins = async (tournamentId, ids) => {
    try { await updateDoc(tournamentDocRef(tournamentId), { coAdminUserIds: ids, updatedAt: Date.now() }); showToast("Co-host access updated"); }
    catch (e) { showToast("Couldn't update co-host access"); }
  };

  const shareTournament = async (tournament) => {
    const url = new URL(window.location.href);
    url.searchParams.set("tournament", tournament.id);
    try { await navigator.clipboard.writeText(url.toString()); showToast("Tournament link copied"); }
    catch (e) { window.prompt("Copy this tournament link", url.toString()); }
  };

  const requestFriend = async (recipientId) => {
    if (!user || !recipientId || recipientId === user.uid) return;
    try {
      await setDoc(doc(FRIEND_REQUESTS_COLLECTION, `${user.uid}_${recipientId}`), {
        requesterId: user.uid,
        requesterName: safeProfileName(myProfile?.displayName, user.displayName),
        recipientId,
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
    await requestFriend(tournament.adminUserId);
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
    appendStaffAction(batch, "archive_imported", "archive", "csv-import", `Imported ${records.length} esports archive record(s)`);
    await batch.commit();
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
    };
    if (clean.source && !/^https:\/\//i.test(clean.source)) throw new Error("Use a secure https source link.");
    await addDoc(ARCHIVE_SUBMISSIONS_COLLECTION, { ...clean, submitterId: user.uid, submitterName: safeProfileName(myProfile?.displayName, user.displayName), status: "pending", createdAt: Date.now() });
    showToast("Archive request sent for review");
  };

  const decideArchiveSubmission = async (requestId, status) => {
    if (!isSiteStaff || !["approved", "rejected"].includes(status)) return;
    try {
      const submission = archiveSubmissions.find((item) => item.id === requestId);
      if (!submission || submission.status !== "pending") { showToast("This archive request was already reviewed"); return; }
      const batch = writeBatch(db);
      const requestRef = doc(ARCHIVE_SUBMISSIONS_COLLECTION, requestId);
      if (status === "approved") {
        const entryRef = doc(ARCHIVE_COLLECTION);
        batch.set(entryRef, { tournament: submission.tournament, game: submission.game, eventDate: submission.eventDate, winner: submission.winner, runnerUp: submission.runnerUp || "", mvp: submission.mvp || "", source: submission.source || "", createdAt: Date.now(), createdBy: user.uid, submissionId: requestId });
        batch.update(requestRef, { status, reviewedAt: Date.now(), reviewedBy: user.uid, archiveEntryId: entryRef.id });
        appendStaffAction(batch, "archive_request_approved", "archiveSubmission", requestId, `Archive request approved: ${submission.tournament}`);
      } else {
        batch.update(requestRef, { status, reviewedAt: Date.now(), reviewedBy: user.uid });
        appendStaffAction(batch, "archive_request_rejected", "archiveSubmission", requestId, `Archive request declined: ${submission.tournament}`);
      }
      await batch.commit();
      showToast(status === "approved" ? "Event added to the archive" : "Archive request declined");
    } catch (error) {
      console.error("Could not review archive submission", error);
      showToast("Couldn't review this archive request. Check the published Firebase rules and try again.");
    }
  };

  const promoteBlogToArchive = async (post, fields) => {
    if (!isSiteStaff || post.status !== "published") throw new Error("Only staff can promote published posts");
    const source = String(fields.source || "").trim().slice(0, 500);
    if (source && !/^https:\/\//i.test(source)) throw new Error("Use a secure https source link.");
    const batch = writeBatch(db);
    const archiveRef = doc(ARCHIVE_COLLECTION);
    batch.set(archiveRef, {
      tournament: String(post.title || "").trim().slice(0, 120),
      game: String(post.game || "").trim().slice(0, 60),
      eventDate: String(fields.eventDate || "").trim().slice(0, 40),
      winner: String(fields.winner || "").trim().slice(0, 100),
      runnerUp: String(fields.runnerUp || "").trim().slice(0, 100),
      mvp: String(fields.mvp || "").trim().slice(0, 100),
      source, createdAt: Date.now(), createdBy: user.uid, blogPostId: post.id,
    });
    appendStaffAction(batch, "blog_added_to_archive", "archiveEntry", archiveRef.id, `Blog added to archive: ${post.title}`);
    await batch.commit();
    showToast("Structured event added to the archive");
  };

  const updateReportStatus = async (reportId, status) => {
    try { const batch = writeBatch(db); batch.update(doc(REPORTS_COLLECTION, reportId), { status, reviewedAt: Date.now() }); appendStaffAction(batch, "report_reviewed", "report", reportId, `Safety report marked ${status}`); await batch.commit(); }
    catch (e) { showToast("Couldn't update report status"); }
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
    const key = `grindinfo-popup:${currentPopup.id}:${currentPopup.updatedAt || currentPopup.createdAt || 0}`;
    if (currentPopup.frequency === "session") sessionStorage.setItem(key, "seen");
    else localStorage.setItem(key, new Date().toISOString().slice(0, 10));
    setCurrentPopup(null);
    setPopupScanTick((tick) => tick + 1);
  };

  const selected = tournaments.find((t) => t.id === selectedId) || null;
  const isOwner = !!(selected && user && selected.adminUserId === user.uid);
  const isAdmin = !!(selected && user && (isOwner || selected.coAdminUserIds?.includes(user.uid)));
  const isSiteStaff = siteRole === "owner" || siteRole === "support";
  const dashboardRole = isSiteStaff ? siteRole : null;

  useEffect(() => {
    if (!isSiteStaff && section === "dashboard") setSection("tournaments");
  }, [isSiteStaff, section]);

  if (authLoading) {
    return (
      <div style={shellStyle}>
        <div style={{ color: "var(--text-muted)", fontFamily: "'Inter', sans-serif", padding: 40, textAlign: "center" }}>
          <LoadingScreen label="Loading GrindInfo" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={shellStyle}>
        <AuthScreen
          onGoogleSignIn={handleGoogleSignIn}
          onEmailAuth={handleEmailAuth}
          authError={authError}
          authBusy={authBusy}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div style={shellStyle}>
        <div style={{ color: "var(--text-muted)", fontFamily: "'Inter', sans-serif", padding: 40, textAlign: "center" }}>
          <LoadingScreen label="Loading tournaments" />
        </div>
      </div>
    );
  }

  return (
    <div style={shellStyle} data-theme={theme}>
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

        <Header saving={saving} user={user} onSignOut={handleSignOut} theme={theme} setTheme={setTheme} onEditProfile={() => setShowProfileModal(true)} onNavigate={setSection} friendRequestCount={friendRequests.filter((request) => request.recipientId === user.uid && request.status === "pending").length} dashboardRole={dashboardRole} />

      <div style={{ maxWidth: 980, margin: "0 auto", padding: "16px 20px 0" }}>
        <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--border)" }}>
          {[
            { id: "tournaments", label: "Tournaments" },
            { id: "players", label: "Find players" },
            { id: "archive", label: "Esports archive" },
            { id: "blog", label: "Community blog" },
    ].map((s) => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              style={{
                background: "none",
                border: "none",
                borderBottom: section === s.id ? "2px solid var(--accent-secondary)" : "2px solid transparent",
                color: section === s.id ? "var(--page-text)" : "var(--text-muted)",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 12,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                padding: "10px 14px",
                cursor: "pointer",
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 980, margin: "0 auto", padding: "0 20px 80px" }}>
        {section === "players" && (
          <FindPlayersPage currentUid={user.uid} myProfile={myProfile} friendRequests={friendRequests} onFriendRequest={(player) => requestFriend(player.uid)} onFriendDecision={decideFriendRequest} onReport={(player) => setReportTarget({ type: "player", id: player.uid, name: player.displayName })} />
        )}
        {section === "archive" && <HistoricalArchive entries={archiveEntries} isModerator={isSiteStaff || isModerator} user={user} submissions={archiveSubmissions} onSubmitRequest={submitArchiveRequest} onImport={importArchiveEntries} />}
        {section === "blog" && <BlogPage posts={blogPosts} user={user} isModerator={isSiteStaff || isModerator} onSubmit={submitBlogPost} onReview={reviewBlogPost} onEdit={editBlogPost} onDelete={deleteBlogPost} />}
        {section === "requests" && <FriendRequestCenter requests={friendRequests} currentUserId={user.uid} onDecision={decideFriendRequest} />}
        {section === "dashboard" && isSiteStaff && <OwnerDashboard
          role={siteRole || "support"}
          reports={privateReports}
          onStatusChange={updateReportStatus}
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
        />}
        {section === "tournaments" && view === "list" && (
          <TournamentList
            tournaments={tournaments}
            currentUserId={user.uid}
            currentUserName={safeProfileName(myProfile?.displayName, user.displayName)}
            onOpen={(id) => {
              setSelectedId(id);
              setView("detail");
              const url = new URL(window.location.href); url.searchParams.set("tournament", id); window.history.replaceState({}, "", url);
              setDetailTab("teams");
            }}
            onNew={() => setShowNewTournament(true)}
          />
        )}

        {section === "tournaments" && view === "detail" && selected && (
          <TournamentDetail
            tournament={selected}
            teams={selectedTeams}
            matches={selectedMatches}
            stats={selectedStats}
            tab={detailTab}
            setTab={setDetailTab}
            isAdmin={isAdmin}
            isOwner={isOwner}
            currentUserId={user.uid}
            currentUserName={safeProfileName(myProfile?.displayName, user.displayName)}
            registrations={selectedRegistrations}
            onSaveResults={(results) => saveTournamentResults(selected.id, results)}
            onCloseTournament={() => closeTournament(selected.id)}
            onBack={() => { setView("list"); setSelectedId(null); const url = new URL(window.location.href); url.searchParams.delete("tournament"); window.history.replaceState({}, "", url); }}
            onShare={() => shareTournament(selected)}
            onRequestFriend={() => requestHostFriend(selected)}
            onRequestRegistration={(player) => requestRegistration(selected.id, player)}
            onRegistrationDecision={(requestId, status) => decideRegistration(selected.id, requestId, status)}
            onCoAdminsChange={(ids) => updateCoAdmins(selected.id, ids)}
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
        )}
      </div>

      {showNewTournament && (
        <NewTournamentModal onClose={() => setShowNewTournament(false)} onCreate={addTournament} />
      )}

      {showProfileModal && (
        <ProfileModal
          initialProfile={myProfile}
          defaultDisplayName={user.displayName}
          onSave={saveProfile}
          onSkip={skipProfile}
          onClose={() => setShowProfileModal(false)}
        />
      )}

      {reportTarget && <ReportModal target={reportTarget} onClose={() => setReportTarget(null)} onSubmit={submitReport} />}
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

function Header({ saving, user, onSignOut, theme, setTheme, onEditProfile, onNavigate, friendRequestCount, dashboardRole }) {
  const displayName = user?.displayName || user?.email || "Player";
  const initials = safeProfileName(user?.displayName).slice(0, 1).toUpperCase();

  return (
    <div style={{ borderBottom: "1px solid var(--border)" }}>
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "20px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, letterSpacing: "0.04em", color: "var(--page-text)" }}>
            GRINDINFO
          </span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--accent-secondary)", letterSpacing: "0.1em" }}>
            TOURNAMENT OPS
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span aria-live="polite" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: saving ? "var(--accent)" : "var(--text-muted)", minWidth: 70, textAlign: "right" }}>
            {saving ? "SAVING…" : "SAVED"}
          </span>
          <details style={{ position: "relative" }}>
            <summary
              aria-label="Account menu"
              style={{ listStyle: "none", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: "var(--page-text)", border: "1px solid var(--border)", background: "var(--panel-bg)", padding: "6px 9px", fontFamily: "'Inter', sans-serif", fontSize: 12 }}
            >
              {user?.photoURL ? (
                <img src={user.photoURL} alt="" style={{ width: 30, height: 30, objectFit: "cover", borderRadius: "50%" }} />
              ) : (
                <span aria-hidden="true" style={{ width: 30, height: 30, borderRadius: "50%", display: "grid", placeItems: "center", background: "var(--accent)", color: "var(--accent-contrast)", fontWeight: 700 }}>
                  {initials}
                </span>
              )}
              <span style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayName}</span>
              <span aria-hidden="true" style={{ color: "var(--text-muted)" }}>⌄</span>
            </summary>
            <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 60, width: 250, padding: 14, background: "var(--panel-bg)", border: "1px solid var(--border)", boxShadow: "var(--panel-shadow)" }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>{displayName}</div>
              <Button variant="ghost" style={{ width: "100%", marginBottom: 8 }} onClick={(event) => { onEditProfile(); event.currentTarget.closest("details")?.removeAttribute("open"); }}>{user?.displayName ? "Edit my profile" : "Create my profile"}</Button>
              <Button variant="ghost" style={{ width: "100%", marginBottom: 12 }} onClick={(event) => { onNavigate("requests"); event.currentTarget.closest("details")?.removeAttribute("open"); }}>Friend requests{friendRequestCount ? ` (${friendRequestCount})` : ""}</Button>
              {dashboardRole && <Button variant="ghost" style={{ width: "100%", marginBottom: 12 }} onClick={(event) => { onNavigate("dashboard"); event.currentTarget.closest("details")?.removeAttribute("open"); }}>{dashboardRole === "owner" ? "Owner dashboard" : "Support dashboard"}</Button>}
              <Field label="Theme">
                <Select value={theme} onChange={(event) => setTheme(event.target.value)}>
                  <option value="glacier">Glacier (default)</option>
                  <option value="solar-flare">Solar Flare (dark)</option>
                </Select>
              </Field>
              <Button variant="ghost" style={{ width: "100%", marginTop: 14 }} onClick={onSignOut}>
                Sign out
              </Button>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
function TournamentList({ tournaments, currentUserId, currentUserName, onOpen, onNew }) {
  const [showArchived, setShowArchived] = useState(false);
  const visibleTournaments = tournaments.filter((t) => isTournamentArchived(t) === showArchived);
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          padding: "36px 0 20px",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <Eyebrow>Live standings desk</Eyebrow>
          <h1
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 44,
              margin: "4px 0 0",
              letterSpacing: "0.01em",
            }}
          >
            Tournaments
          </h1>
        </div>
        <Button onClick={onNew}>+ New tournament</Button>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}><Button variant={showArchived ? "ghost" : "primary"} onClick={() => setShowArchived(false)}>Active</Button><Button variant={showArchived ? "primary" : "ghost"} onClick={() => setShowArchived(true)}>Archive</Button></div>
      {visibleTournaments.length === 0 ? (
        <EmptyState
          title={showArchived ? "No archived tournaments" : "No active tournaments"}
          body={showArchived ? "Completed or older tournaments will appear here with their results." : "Create your first tournament to start tracking teams, matches, and player stats."}
          actionLabel="+ New tournament"
          onAction={onNew}
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
              <button
                key={t.id}
                className="sl-card"
                onClick={() => onOpen(t.id)}
                style={{
                  textAlign: "left",
                  background: "var(--panel-bg)",
                  border: "1px solid var(--border)",
                  padding: "18px 18px 16px",
                  cursor: "pointer",
                  color: "inherit",
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
                <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "10px 0" }}>
                  <GameIcon game={t.game} size={32} />
                  <Eyebrow color="var(--text-muted)">{t.game || "Game TBD"}</Eyebrow>
                </div>
                <div
                  aria-hidden="true"
                  style={{
                    display: "grid",
                    placeItems: "center",
                    height: 104,
                    margin: "-2px -2px 14px",
                    border: "1px solid var(--border)",
                    background: "linear-gradient(135deg, var(--panel-raised), var(--panel-bg))",
                    fontSize: 48,
                  }}
                >
                  {t.artwork || "🏆"}
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
                  {fmtDate(t.startDate)} {t.endDate ? `– ${fmtDate(t.endDate)}` : ""}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NewTournamentModal({ onClose, onCreate }) {
  const [name, setName] = useState("");
  const [game, setGame] = useState(GAME_PRESETS[0]);
  const [format, setFormat] = useState(FORMATS[0]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [artwork, setArtwork] = useState(TOURNAMENT_ARTWORKS[0].icon);
  const [prizeAmount, setPrizeAmount] = useState("0");
  const [customPrize, setCustomPrize] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    if (!name.trim()) {
      setError("Enter a tournament name first");
      return;
    }
    const amount = prizeAmount === "custom" ? Number(customPrize) : Number(prizeAmount);
    if (!Number.isFinite(amount) || amount < 0 || amount > 100000000) { setError("Enter a valid prize information amount."); return; }
    onCreate({ name: name.trim(), game, format, startDate, endDate, artwork, prizeAmount: amount, prizeCurrency: "INR" });
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
          maxWidth: 460,
        }}
      >
        <Eyebrow>New entry</Eyebrow>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, margin: "4px 0 20px" }}>
          Create tournament
        </div>
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
          <Field label="Tournament artwork">
            <div role="group" aria-label="Choose tournament artwork" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {TOURNAMENT_ARTWORKS.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  title={option.label}
                  aria-label={"Choose " + option.label + " artwork"}
                  aria-pressed={artwork === option.icon}
                  onClick={() => setArtwork(option.icon)}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 8,
                    border: artwork === option.icon ? "2px solid var(--accent)" : "1px solid var(--border)",
                    background: "var(--panel-raised)",
                    color: "var(--page-text)",
                    fontSize: 24,
                    cursor: "pointer",
                  }}
                >
                  {option.icon}
                </button>
              ))}
            </div>
          </Field>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <Field label="Game">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <GameIcon game={game} size={38} />
                  <Select value={game} onChange={(e) => setGame(e.target.value)} style={{ flex: 1 }}>
                    {GAME_PRESETS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </Select>
                </div>
              </Field>
            </div>
            <div style={{ flex: 1 }}>
              <Field label="Format">
                <Select value={format} onChange={(e) => setFormat(e.target.value)}>
                  {FORMATS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </div>
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

  const hasResults = [results?.winner, results?.mvp, results?.runnerUp, results?.secondRunnerUp]
    .some((value) => typeof value === "string" && value.trim());

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
        marginTop: 24,
        padding: 18,
        border: "1px solid var(--border)",
        background: "var(--panel-bg)",
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

function TournamentDetail(props) {
  const {
    tournament,
    teams,
    matches,
    stats,
    tab,
    setTab,
    isAdmin,
    isOwner,
    currentUserId,
    currentUserName,
    registrations,
    onSaveResults,
    onBack,
    onShare,
    onRequestFriend,
    onRequestRegistration,
    onRegistrationDecision,
    onCoAdminsChange,
    onReport,
    onDelete,
    onCloseTournament,
    onAddTeam,
    onDeleteTeam,
    onAddMatch,
    onUpdateMatch,
    onDeleteMatch,
    onAddStat,
    onDeleteStat,
  } = props;

  const tabs = [
    { id: "teams", label: `Teams (${teams.length})` },
    { id: "matches", label: `Matches (${matches.length})` },
    { id: "stats", label: `Player stats (${stats.length})` },
    { id: "leaderboard", label: "Leaderboard" },
  ];

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
          <div
            aria-hidden="true"
            style={{
              width: 88,
              height: 88,
              display: "grid",
              placeItems: "center",
              marginBottom: 12,
              border: "1px solid var(--border)",
              borderRadius: 12,
              background: "linear-gradient(135deg, var(--panel-raised), var(--panel-bg))",
              fontSize: 48,
            }}
          >
            {tournament.artwork || "🏆"}
          </div>
          <Eyebrow color="var(--text-muted)">
            {tournament.game} · {tournament.format}
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
              ADMIN · You manage this tournament
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {isAdmin && !isTournamentArchived(tournament) && <Button variant="ghost" onClick={onCloseTournament}>Close tournament</Button>}
          <Button variant="ghost" onClick={onShare}>Share tournament</Button>
          <Button variant="danger" onClick={onReport}>Report tournament</Button>
          {!isOwner && <Button variant="ghost" onClick={onRequestFriend}>Request host as friend</Button>}
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

      <RegistrationPanel tournament={tournament} requests={registrations || []} currentUserId={currentUserId} currentUserName={currentUserName} isAdmin={isAdmin} onRequest={onRequestRegistration} onDecision={onRegistrationDecision} />
      <CoAdminPanel tournament={tournament} isOwner={isOwner} onChange={onCoAdminsChange} />
      <TournamentResults results={tournament.results} isAdmin={isAdmin} onSave={onSaveResults} />

      <div style={{ display: "flex", gap: 4, marginTop: 28, borderBottom: "1px solid var(--border)", flexWrap: "wrap" }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              background: "none",
              border: "none",
              borderBottom: tab === t.id ? "2px solid var(--accent)" : "2px solid transparent",
              color: tab === t.id ? "var(--page-text)" : "var(--text-muted)",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              padding: "10px 14px",
              cursor: "pointer",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ paddingTop: 26 }}>
        {tab === "teams" && <TeamsPanel teams={teams} isAdmin={isAdmin} onAdd={onAddTeam} onDelete={onDeleteTeam} />}
        {tab === "matches" && (
          <MatchesPanel
            teams={teams}
            matches={matches}
            isAdmin={isAdmin}
            onAdd={onAddMatch}
            onUpdate={onUpdateMatch}
            onDelete={onDeleteMatch}
          />
        )}
        {tab === "stats" && (
          <StatsPanel teams={teams} matches={matches} stats={stats} isAdmin={isAdmin} onAdd={onAddStat} onDelete={onDeleteStat} />
        )}
        {tab === "leaderboard" && <LeaderboardPanel teams={teams} stats={stats} />}
      </div>
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

