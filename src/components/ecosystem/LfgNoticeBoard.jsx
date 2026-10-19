import { useEffect, useMemo, useState } from "react";
import { Megaphone, Plus } from "lucide-react";

const STORAGE_KEY = "grindinfo.lfgBoard.v1";

export const LFG_ROLE_TAGS = [
  "IGL",
  "Entry Fragger",
  "Sniper",
  "Support",
  "Flex",
  "Casual",
  "Competitive",
  "Duo",
  "Squad",
  "Ranked",
];

const SEED_POSTS = [
  {
    id: "seed-1",
    author: "Nova",
    game: "Valorant",
    message: "Need IGL for ranked climb tonight.",
    tags: ["IGL", "Competitive", "Duo"],
    discord: "nova#0420",
    createdAt: Date.now() - 1000 * 60 * 25,
  },
  {
    id: "seed-2",
    author: "Rogue",
    game: "BGMI and PUBG Mobile",
    message: "Casual squad, mic on, chill vibes.",
    tags: ["Support", "Casual", "Squad"],
    discord: "rogue.gg",
    createdAt: Date.now() - 1000 * 60 * 80,
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts.slice(0, 40)));
  } catch {
    /* private mode */
  }
}

/**
 * Looking-for-group notice board.
 * Extends Find Players tags; keeps feed in local state (+ localStorage) so it works without new Firestore collections.
 */
export default function LfgNoticeBoard({ profile, gamesList = [] }) {
  const [posts, setPosts] = useState(readPosts);
  const [message, setMessage] = useState("");
  const [game, setGame] = useState(profile?.games?.[0] || gamesList[0] || "");
  const [tags, setTags] = useState([]);
  const [discord, setDiscord] = useState(profile?.discordHandle || "");

  useEffect(() => {
    writePosts(posts);
  }, [posts]);

  useEffect(() => {
    if (profile?.discordHandle) setDiscord(profile.discordHandle);
    if (profile?.games?.[0]) setGame(profile.games[0]);
  }, [profile]);

  const toggleTag = (tag) => {
    setTags((current) => (current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag].slice(0, 4)));
  };

  const publish = () => {
    const text = message.trim().slice(0, 160);
    if (!text) return;
    const next = {
      id: `lfg-${Date.now()}`,
      author: profile?.displayName || "Player",
      game: game || "Any",
      message: text,
      tags,
      discord: String(discord || "").trim().slice(0, 40),
      createdAt: Date.now(),
    };
    setPosts((current) => [next, ...current].slice(0, 40));
    setMessage("");
    setTags([]);
  };

  const ordered = useMemo(() => [...posts].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)), [posts]);

  return (
    <section className="mb-8 rounded-3xl border border-white/10 bg-slate-950/60 p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-volt">
            <Megaphone size={12} /> Looking for group
          </p>
          <h2 className="font-display text-3xl text-white">LFG notice board</h2>
          <p className="mt-1 max-w-xl text-sm text-slate-400">
            Short recruitment cards with role tags and Discord sync. Posts stay on this device so the board works instantly.
          </p>
        </div>
      </div>

      <div className="mb-5 grid gap-3 rounded-2xl border border-white/10 bg-black/30 p-4">
        <label className="grid gap-1 font-mono text-[10px] uppercase tracking-widest text-slate-500">
          Game
          <select
            className="border border-white/15 bg-slate-950 px-2 py-2 text-sm normal-case tracking-normal text-white"
            value={game}
            onChange={(event) => setGame(event.target.value)}
          >
            {(gamesList.length ? gamesList : [game || "Any"]).map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 font-mono text-[10px] uppercase tracking-widest text-slate-500">
          Notice
          <input
            className="border border-white/15 bg-slate-950 px-2 py-2 text-sm normal-case tracking-normal text-white"
            maxLength={160}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Looking for duo / need entry for scrims…"
          />
        </label>
        <label className="grid gap-1 font-mono text-[10px] uppercase tracking-widest text-slate-500">
          Discord sync
          <input
            className="border border-white/15 bg-slate-950 px-2 py-2 text-sm normal-case tracking-normal text-white"
            maxLength={40}
            value={discord}
            onChange={(event) => setDiscord(event.target.value)}
            placeholder="username or name#0000"
          />
        </label>
        <div>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-slate-500">Role & playstyle tags</p>
          <div className="flex flex-wrap gap-2">
            {LFG_ROLE_TAGS.map((tag) => {
              const on = tags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider ${
                    on ? "border-neon text-neon" : "border-white/15 text-slate-400"
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>
        <button
          type="button"
          onClick={publish}
          className="inline-flex w-fit items-center gap-2 rounded-full bg-neon px-4 py-2 text-xs font-semibold text-slate-950"
        >
          <Plus size={14} /> Post LFG
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {ordered.map((post) => (
          <article key={post.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-neon">
              {post.game} · {new Date(post.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
            <h3 className="mt-1 font-display text-2xl text-white">{post.author}</h3>
            <p className="mt-2 text-sm text-slate-300">{post.message}</p>
            {!!post.tags?.length && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {post.tags.map((tag) => (
                  <span key={tag} className="rounded-full border border-white/15 px-2 py-0.5 font-mono text-[10px] uppercase text-slate-300">
                    {tag}
                  </span>
                ))}
              </div>
            )}
            {post.discord && (
              <p className="mt-3 font-mono text-[11px] text-amber-300">Discord · {post.discord}</p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
