import { useEffect, useMemo, useState } from "react";
import { Megaphone, Plus } from "lucide-react";

const STORAGE_KEY = "grindinfo.lfgBoard.v1";

const SEED_POSTS = [
  {
    id: "seed-1",
    author: "Nova",
    game: "Valorant",
    message: "Need IGL for ranked climb tonight.",
    discord: "nova#0420",
    createdAt: Date.now() - 1000 * 60 * 25,
  },
];

function readPosts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED_POSTS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : SEED_POSTS;
  } catch {
    return SEED_POSTS;
  }
}

function writePosts(posts) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts.slice(0, 20)));
  } catch {
    /* private mode */
  }
}

/** Compact LFG strip on Find Players — short post + recent notices only. */
export default function LfgNoticeBoard({ profile, gamesList = [] }) {
  const [posts, setPosts] = useState(readPosts);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [game, setGame] = useState(profile?.games?.[0] || gamesList[0] || "");

  useEffect(() => {
    writePosts(posts);
  }, [posts]);

  useEffect(() => {
    if (profile?.games?.[0]) setGame(profile.games[0]);
  }, [profile]);

  const publish = () => {
    const text = message.trim().slice(0, 120);
    if (!text) return;
    setPosts((current) => [
      {
        id: `lfg-${Date.now()}`,
        author: profile?.displayName || "Player",
        game: game || "Any",
        message: text,
        discord: String(profile?.discordHandle || "").trim().slice(0, 40),
        createdAt: Date.now(),
      },
      ...current,
    ].slice(0, 20));
    setMessage("");
    setOpen(false);
  };

  const ordered = useMemo(
    () => [...posts].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 4),
    [posts],
  );

  return (
    <section className="mb-4 rounded-xl border border-white/10 bg-slate-950/50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-slate-500">
          <Megaphone size={11} /> LFG · {ordered.length} live
        </p>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-neon"
        >
          <Plus size={11} /> {open ? "Close" : "Post"}
        </button>
      </div>

      {open && (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            className="rounded-lg border border-white/15 bg-slate-950 px-2 py-1.5 text-xs text-white sm:max-w-[9rem]"
            value={game}
            onChange={(event) => setGame(event.target.value)}
            aria-label="LFG game"
          >
            {(gamesList.length ? gamesList : [game || "Any"]).map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <input
            className="min-w-0 flex-1 rounded-lg border border-white/15 bg-slate-950 px-2 py-1.5 text-xs text-white"
            maxLength={120}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Short LFG note…"
          />
          <button
            type="button"
            onClick={publish}
            className="rounded-full bg-neon px-3 py-1.5 text-xs font-semibold text-slate-950"
          >
            Post
          </button>
        </div>
      )}

      <ul className="mt-2 space-y-1.5">
        {ordered.map((post) => (
          <li key={post.id} className="truncate text-xs text-slate-400">
            <span className="text-slate-200">{post.author}</span>
            {" · "}
            {post.game}
            {" — "}
            {post.message}
          </li>
        ))}
      </ul>
    </section>
  );
}
