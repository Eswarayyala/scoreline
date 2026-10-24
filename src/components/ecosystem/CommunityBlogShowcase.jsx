import { Newspaper } from "lucide-react";
import { SHOWCASE_BLOGS, bannerForGame } from "../../data/platformShowcase";
import { useGameLibraryAvatar } from "../../hooks/useMediaLibrary";

function ShowcaseCover({ game, coverUrl }) {
  const library = useGameLibraryAvatar(game, coverUrl || "");
  return <img src={library || coverUrl || bannerForGame(game)} alt="" className="h-24 w-24 shrink-0 object-cover" />;
}

export default function CommunityBlogShowcase({ posts = [], onBrowseAll }) {
  const live = posts
    .filter((post) => post.status === "published")
    .slice(0, 3)
    .map((post) => ({
      id: post.id,
      title: post.title,
      game: post.game,
      kicker: "Community",
      excerpt: post.content,
      cover: post.coverUrl || "",
    }));
  const cards = live.length ? live : SHOWCASE_BLOGS;

  return (
    <section className="rounded-3xl border border-white/10 bg-slate-950/60 p-5 backdrop-blur-md md:col-span-2 lg:col-span-1">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-sky-300">Community blog</p>
          <h2 className="font-display text-3xl text-white">Guides & recaps</h2>
        </div>
        <button type="button" onClick={onBrowseAll} className="font-mono text-[11px] uppercase tracking-widest text-neon">Open feed</button>
      </div>
      <div className="grid gap-3">
        {cards.map((post) => (
          <article key={post.id} className="flex gap-3 overflow-hidden rounded-2xl border border-white/10">
            <ShowcaseCover game={post.game} coverUrl={post.cover} />
            <div className="min-w-0 py-2 pr-3">
              <p className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-slate-400">
                <Newspaper size={10} /> {post.kicker} · {post.game}
              </p>
              <h3 className="line-clamp-2 font-display text-xl leading-tight text-white">{post.title}</h3>
              <p className="mt-1 line-clamp-2 text-xs text-slate-400">{post.excerpt}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
