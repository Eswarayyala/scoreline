import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  doc,
  collection,
  onSnapshot,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
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

const GAME_PRESETS = [
  "Valorant",
  "League of Legends",
  "CS2",
  "Dota 2",
  "Overwatch 2",
  "Rocket League",
  "Apex Legends",
  "PUBG Mobile (BGMI)",
  "Mobile Legends: Bang Bang",
  "Free Fire",
  "Call of Duty",
  "Fortnite",
  "Rainbow Six Siege",
  "Honor of Kings",
  "Clash Royale",
  "Brawl Stars",
  "PUBG: Battlegrounds",
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

const FORMATS = ["Single elimination", "Double elimination", "Round robin", "Swiss", "Group stage"];

const STATUS_COLORS = {
  upcoming: "#8B98A5",
  live: "#3FD6C0",
  completed: "#FFC22E",
};

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

function Eyebrow({ children, color = "#FFC22E" }) {
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

function Divider() {
  return <div style={{ height: 1, background: "#232B33", width: "100%" }} />;
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
    primary: { background: "#FFC22E", color: "#0A0E12", borderColor: "#FFC22E" },
    ghost: { background: "transparent", color: "#EDF1F4", borderColor: "#2E3946" },
    danger: { background: "transparent", color: "#FF5C5C", borderColor: "#4A2626" },
  };
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      onFocus={(e) => (e.currentTarget.style.outline = "2px solid #3FD6C0")}
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
      <span style={{ fontSize: 12, color: "#8B98A5", fontWeight: 600 }}>{label}</span>
      {children}
    </label>
  );
}

const inputStyle = {
  background: "#131920",
  border: "1px solid #2E3946",
  color: "#EDF1F4",
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
        e.currentTarget.style.borderColor = "#3FD6C0";
        props.onFocus && props.onFocus(e);
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = "#2E3946";
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
        e.currentTarget.style.borderColor = "#3FD6C0";
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = "#2E3946";
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
        border: "1px dashed #2E3946",
        padding: "48px 24px",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 14,
      }}
    >
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, color: "#EDF1F4", letterSpacing: "0.02em" }}>
        {title}
      </div>
      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#8B98A5", maxWidth: 380 }}>{body}</div>
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
        background: "#1A222B",
        border: "1px solid #2E3946",
        color: "#EDF1F4",
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
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        background: "#0A0E12",
      }}
    >
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 34, color: "#EDF1F4", letterSpacing: "0.04em" }}>
            GRINDINFO
          </div>
          <Eyebrow color="#3FD6C0">Sign in to upload tournament data</Eyebrow>
        </div>

        <button
          onClick={onGoogleSignIn}
          disabled={authBusy}
          style={{
            width: "100%",
            background: "#EDF1F4",
            color: "#0A0E12",
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
          <div style={{ flex: 1, height: 1, background: "#232B33" }} />
          <span style={{ fontSize: 11, color: "#5B6772", fontFamily: "'JetBrains Mono', monospace" }}>OR</span>
          <div style={{ flex: 1, height: 1, background: "#232B33" }} />
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

          {authError && <div style={{ fontSize: 13, color: "#FF5C5C" }}>{authError}</div>}

          <Button type="submit" disabled={authBusy} style={{ marginTop: 4 }}>
            {mode === "signin" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <div style={{ textAlign: "center", marginTop: 18, fontSize: 13, color: "#8B98A5" }}>
          {mode === "signin" ? (
            <>
              New here?{" "}
              <button
                onClick={() => setMode("signup")}
                style={{ background: "none", border: "none", color: "#3FD6C0", cursor: "pointer", fontSize: 13 }}
              >
                Create an account
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                onClick={() => setMode("signin")}
                style={{ background: "none", border: "none", color: "#3FD6C0", cursor: "pointer", fontSize: 13 }}
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
              border: `1px solid ${active ? "#FFC22E" : "#2E3946"}`,
              background: active ? "rgba(255,194,46,0.12)" : "transparent",
              color: active ? "#FFC22E" : "#8B98A5",
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

function ProfileModal({ initialProfile, onSave, onSkip, onClose }) {
  const [games, setGames] = useState(initialProfile?.games || []);
  const [region, setRegion] = useState(initialProfile?.region || "");
  const [language, setLanguage] = useState(initialProfile?.language || "");
  const [style, setStyle] = useState(initialProfile?.style || "");
  const [error, setError] = useState("");

  const toggleGame = (g) => {
    setGames((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  };

  const submit = () => {
    if (games.length === 0 || !region || !language) {
      setError("Pick at least one game, a region, and a language");
      return;
    }
    onSave({ games, region, language, style });
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
          background: "#12181F",
          border: "1px solid #232B33",
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
        <div style={{ fontSize: 13, color: "#8B98A5", marginBottom: 20 }}>
          Let other players on GRINDINFO find you by game, region, and language. You can skip this and fill it in
          later.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
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
        </div>

        {error && <div style={{ fontSize: 13, color: "#FF5C5C", marginTop: 14 }}>{error}</div>}

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

function PlayerCard({ player }) {
  return (
    <div style={{ background: "#12181F", border: "1px solid #232B33", padding: "16px 18px" }}>
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, letterSpacing: "0.02em" }}>
        {player.displayName}
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "8px 0" }}>
        {(player.games || []).map((g) => (
          <span
            key={g}
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              padding: "3px 8px",
              border: "1px solid #2E3946",
              color: "#3FD6C0",
            }}
          >
            {g}
          </span>
        ))}
      </div>
      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#8B98A5" }}>
        {player.region} · {player.language}
        {player.style ? ` · ${player.style}` : ""}
      </div>
    </div>
  );
}

function FindPlayersPage({ players, currentUid, onEditProfile }) {
  const [gameFilter, setGameFilter] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [languageFilter, setLanguageFilter] = useState("");

  const myPlayerProfile = players.find((p) => p.uid === currentUid) || null;

  const filtered = players
    .filter((p) => p.uid !== currentUid)
    .filter((p) => {
      if (gameFilter && !(p.games || []).includes(gameFilter)) return false;
      if (regionFilter && p.region !== regionFilter) return false;
      if (languageFilter && p.language !== languageFilter) return false;
      return true;
    });

  const hasOwnProfile = !!myPlayerProfile;

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
        <Button onClick={onEditProfile}>{hasOwnProfile ? "Edit my profile" : "+ Create my profile"}</Button>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ minWidth: 160 }}>
          <Select value={gameFilter} onChange={(e) => setGameFilter(e.target.value)}>
            <option value="">All games</option>
            {GAME_PRESETS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </Select>
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
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No players match yet"
          body="Try widening your filters, or be the first to create a profile."
        />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
          {filtered.map((p) => (
            <PlayerCard key={p.uid} player={p} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- app ----------

export default function App() {
  const [tournaments, setTournaments] = useState([]);
  const [selectedTeams, setSelectedTeams] = useState([]);
  const [selectedMatches, setSelectedMatches] = useState([]);
  const [selectedStats, setSelectedStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [view, setView] = useState("list"); // 'list' | 'detail'
  const [selectedId, setSelectedId] = useState(null);
  const [detailTab, setDetailTab] = useState("teams");
  const [showNewTournament, setShowNewTournament] = useState(false);

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
  const [players, setPlayers] = useState([]);
  const [myProfile, setMyProfile] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(PLAYERS_COLLECTION, (snap) => {
      setPlayers(snap.docs.map((d) => ({ uid: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

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

  const skipProfile = useCallback(() => {
    if (user) localStorage.setItem(`profilePromptDismissed_${user.uid}`, "1");
    setShowProfileModal(false);
  }, [user]);

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
          displayName: user.displayName || user.email,
          ...fields,
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
        adminUserId: user.uid,
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

  const deleteTournament = async (id) => {
    setSaving(true);
    try {
      await Promise.all([
        ...selectedTeams.map((t) => deleteDoc(doc(teamsCollectionRef(id), t.id))),
        ...selectedMatches.map((m) => deleteDoc(doc(matchesCollectionRef(id), m.id))),
        ...selectedStats.map((s) => deleteDoc(doc(statsCollectionRef(id), s.id))),
      ]);
      await deleteDoc(tournamentDocRef(id));
      showToast("Tournament deleted");
      setView("list");
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

  const selected = tournaments.find((t) => t.id === selectedId) || null;
  const isAdmin = !!(selected && user && selected.adminUserId === user.uid);

  if (authLoading) {
    return (
      <div style={shellStyle}>
        <div style={{ color: "#8B98A5", fontFamily: "'Inter', sans-serif", padding: 40, textAlign: "center" }}>
          Loading…
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
        <div style={{ color: "#8B98A5", fontFamily: "'Inter', sans-serif", padding: 40, textAlign: "center" }}>
          Loading tournaments…
        </div>
      </div>
    );
  }

  return (
    <div style={shellStyle}>
      <style>{`
        * { box-sizing: border-box; }
        ::selection { background: #FFC22E; color: #0A0E12; }
        button:active { transform: scale(0.98); }
        @media (prefers-reduced-motion: reduce) {
          * { transition: none !important; animation: none !important; }
        }
        .sl-card { animation: sl-fade 260ms ease both; }
        @keyframes sl-fade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
      `}</style>

      <Header saving={saving} user={user} onSignOut={handleSignOut} />

      <div style={{ maxWidth: 980, margin: "0 auto", padding: "16px 20px 0" }}>
        <div style={{ display: "flex", gap: 4, borderBottom: "1px solid #1B222A" }}>
          {[
            { id: "tournaments", label: "Tournaments" },
            { id: "players", label: `Find players (${players.length})` },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              style={{
                background: "none",
                border: "none",
                borderBottom: section === s.id ? "2px solid #3FD6C0" : "2px solid transparent",
                color: section === s.id ? "#EDF1F4" : "#8B98A5",
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
          <FindPlayersPage players={players} currentUid={user.uid} onEditProfile={() => setShowProfileModal(true)} />
        )}
        {section === "tournaments" && view === "list" && (
          <TournamentList
            tournaments={tournaments}
            onOpen={(id) => {
              setSelectedId(id);
              setView("detail");
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
            onBack={() => setView("list")}
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
          onSave={saveProfile}
          onSkip={skipProfile}
          onClose={() => setShowProfileModal(false)}
        />
      )}

      <Toast message={toast} />
    </div>
  );
}

const shellStyle = {
  minHeight: "100vh",
  background: "#0A0E12",
  color: "#EDF1F4",
  fontFamily: "'Inter', sans-serif",
};

function Header({ saving, user, onSignOut }) {
  return (
    <div style={{ borderBottom: "1px solid #1B222A" }}>
      <div
        style={{
          maxWidth: 980,
          margin: "0 auto",
          padding: "20px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 28,
              letterSpacing: "0.04em",
              color: "#EDF1F4",
            }}
          >
            GRINDINFO
          </span>
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              color: "#3FD6C0",
              letterSpacing: "0.1em",
            }}
          >
            TOURNAMENT OPS
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              color: saving ? "#FFC22E" : "#8B98A5",
              minWidth: 70,
              textAlign: "right",
            }}
          >
            {saving ? "SAVING…" : "SAVED"}
          </span>
          {user && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 13,
                  color: "#8B98A5",
                  maxWidth: 140,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={user.displayName || user.email}
              >
                {user.displayName || user.email}
              </span>
              <Button variant="ghost" onClick={onSignOut}>
                Sign out
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TournamentList({ tournaments, onOpen, onNew }) {
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

      {tournaments.length === 0 ? (
        <EmptyState
          title="No tournaments yet"
          body="Create your first tournament to start tracking teams, matches, and player stats."
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
          {tournaments.map((t, i) => {
            return (
              <button
                key={t.id}
                className="sl-card"
                onClick={() => onOpen(t.id)}
                style={{
                  textAlign: "left",
                  background: "#12181F",
                  border: "1px solid #232B33",
                  padding: "18px 18px 16px",
                  cursor: "pointer",
                  color: "inherit",
                  animationDelay: `${i * 30}ms`,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#3FD6C0")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#232B33")}
                onFocus={(e) => (e.currentTarget.style.outline = "2px solid #3FD6C0")}
                onBlur={(e) => (e.currentTarget.style.outline = "none")}
              >
                <Eyebrow color="#8B98A5">{t.game || "Game TBD"}</Eyebrow>
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
                      color: "#5B6772",
                      marginBottom: 6,
                    }}
                  >
                    LEGACY IMPORT
                  </div>
                )}
                <div style={{ marginTop: 12, fontSize: 12, color: "#5B6772" }}>
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
  const [error, setError] = useState("");

  const submit = () => {
    if (!name.trim()) {
      setError("Enter a tournament name first");
      return;
    }
    onCreate({ name: name.trim(), game, format, startDate, endDate });
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
          background: "#12181F",
          border: "1px solid #232B33",
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
          {error && <div style={{ fontSize: 13, color: "#FF5C5C" }}>{error}</div>}
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <Field label="Game">
                <Select value={game} onChange={(e) => setGame(e.target.value)}>
                  {GAME_PRESETS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </Select>
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

function TournamentDetail(props) {
  const {
    tournament,
    teams,
    matches,
    stats,
    tab,
    setTab,
    isAdmin,
    onBack,
    onDelete,
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
          background: "none",
          border: "none",
          color: "#8B98A5",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 12,
          cursor: "pointer",
          padding: 0,
          marginBottom: 18,
        }}
      >
        ← All tournaments
      </button>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div>
          <Eyebrow color="#8B98A5">
            {tournament.game} · {tournament.format}
          </Eyebrow>
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 38, margin: "4px 0 6px" }}>
            {tournament.name}
          </h1>
          <div style={{ fontSize: 13, color: "#5B6772" }}>
            {fmtDate(tournament.startDate)} {tournament.endDate ? `– ${fmtDate(tournament.endDate)}` : ""}
          </div>
          {isAdmin && (
            <div
              style={{
                display: "inline-block",
                marginTop: 10,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                letterSpacing: "0.1em",
                color: "#0A0E12",
                background: "#FFC22E",
                padding: "4px 10px",
              }}
            >
              ADMIN · You manage this tournament
            </div>
          )}
        </div>
        {isAdmin && (
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

      <div style={{ display: "flex", gap: 4, marginTop: 28, borderBottom: "1px solid #1B222A", flexWrap: "wrap" }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              background: "none",
              border: "none",
              borderBottom: tab === t.id ? "2px solid #FFC22E" : "2px solid transparent",
              color: tab === t.id ? "#EDF1F4" : "#8B98A5",
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
      {error && <div style={{ fontSize: 13, color: "#FF5C5C", marginBottom: 14 }}>{error}</div>}

      {teams.length === 0 ? (
        <EmptyState title="No teams yet" body="Add the teams competing in this tournament." />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
          {teams.map((t) => (
            <div
              key={t.id}
              style={{
                background: "#12181F",
                border: "1px solid #232B33",
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
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#3FD6C0" }}>
                    {t.tag}
                  </div>
                )}
              </div>
              {isAdmin && (
                <button
                  onClick={() => onDelete(t.id)}
                  aria-label={`Remove ${t.name}`}
                  style={{ background: "none", border: "none", color: "#5B6772", cursor: "pointer", fontSize: 16 }}
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
      {error && <div style={{ fontSize: 13, color: "#FF5C5C", marginBottom: 14 }}>{error}</div>}

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
        background: "#12181F",
        border: "1px solid #232B33",
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
            color: aWins ? "#FFC22E" : "#EDF1F4",
            flex: 1,
            textAlign: "right",
          }}
        >
          {teamAName} {teamATag && <span style={{ color: "#5B6772", fontSize: 11 }}>({teamATag})</span>}
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
        <span style={{ color: "#5B6772", fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>–</span>
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
            color: bWins ? "#FFC22E" : "#EDF1F4",
            flex: 1,
          }}
        >
          {teamBName} {teamBTag && <span style={{ color: "#5B6772", fontSize: 11 }}>({teamBTag})</span>}
        </span>
      </div>

      {isAdmin ? (
        <Select value={match.status} onChange={(e) => onUpdate({ status: e.target.value })} style={{ width: 130 }}>
          <option value="upcoming">Upcoming</option>
          <option value="live">Live</option>
          <option value="completed">Completed</option>
        </Select>
      ) : (
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, textTransform: "uppercase", color: "#8B98A5" }}>
          {match.status}
        </span>
      )}
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: STATUS_COLORS[match.status] || "#8B98A5",
          flexShrink: 0,
        }}
      />
      <span style={{ fontSize: 12, color: "#5B6772", fontFamily: "'JetBrains Mono', monospace", minWidth: 80 }}>
        {fmtDate(match.date)}
      </span>
      {isAdmin && (
        <button
          onClick={onDelete}
          aria-label="Delete match"
          style={{ background: "none", border: "none", color: "#5B6772", cursor: "pointer", fontSize: 16 }}
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
      {error && <div style={{ fontSize: 13, color: "#FF5C5C", marginBottom: 14 }}>{error}</div>}

      {stats.length === 0 ? (
        <EmptyState title="No stats logged" body="Log kills, deaths, assists, and score per player to build the leaderboard." />
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #232B33", color: "#8B98A5", textAlign: "left" }}>
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
                <tr key={s.id} style={{ borderBottom: "1px solid #1B222A" }}>
                  <td style={{ padding: "8px 10px", fontFamily: "'Inter', sans-serif" }}>{s.player}</td>
                  <td style={{ padding: "8px 10px", color: "#8B98A5" }}>{teamName(s.teamId)}</td>
                  <td style={{ padding: "8px 10px", color: "#5B6772", fontSize: 12 }}>{matchLabel(s.matchId)}</td>
                  <td style={{ padding: "8px 10px", textAlign: "right" }}>{s.kills}</td>
                  <td style={{ padding: "8px 10px", textAlign: "right" }}>{s.deaths}</td>
                  <td style={{ padding: "8px 10px", textAlign: "right" }}>{s.assists}</td>
                  <td style={{ padding: "8px 10px", textAlign: "right", color: "#FFC22E" }}>{s.score}</td>
                  <td style={{ padding: "8px 10px", textAlign: "right" }}>
                    {isAdmin && (
                      <button
                        onClick={() => onDelete(s.id)}
                        aria-label={`Delete stat line for ${s.player}`}
                        style={{ background: "none", border: "none", color: "#5B6772", cursor: "pointer", fontSize: 15 }}
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

  const rankColor = (i) => (i === 0 ? "#FFC22E" : i === 1 ? "#C8D0D8" : i === 2 ? "#C8804A" : "#5B6772");

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "44px 1.6fr 1fr 60px 60px 60px 70px 70px",
          padding: "0 14px 8px",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          color: "#8B98A5",
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
            background: i < 3 ? "#12181F" : "transparent",
            borderBottom: "1px solid #1B222A",
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
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#8B98A5" }}>
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
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, textAlign: "right", color: "#3FD6C0" }}>
            {kda(r.kills, r.deaths, r.assists)}
          </span>
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 13,
              textAlign: "right",
              color: "#FFC22E",
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
