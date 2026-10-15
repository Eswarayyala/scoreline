import VaultCarousel from "../vault/VaultCarousel";
import TournamentsShowcase from "../ecosystem/TournamentsShowcase";
import FindPlayersShowcase from "../ecosystem/FindPlayersShowcase";
import CommunityBlogShowcase from "../ecosystem/CommunityBlogShowcase";

export default function PlatformHome({
  tournaments,
  blogPosts,
  onOpenVaultSlide,
  onOpenTournament,
  onOpenTournaments,
  onOpenPlayers,
  onOpenBlog,
  onConnectPlayer,
}) {
  return (
    <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-2">
      <div className="pointer-events-none absolute inset-x-0 -top-8 h-40 bg-[radial-gradient(circle_at_20%_0%,rgba(34,243,196,0.18),transparent_42%),radial-gradient(circle_at_80%_10%,rgba(255,138,36,0.16),transparent_36%)]" />
      <header className="relative z-0 mb-2 border-b border-white/10 pb-10 pt-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-400">GrindInfo · tournament ops</p>
        <h1 className="font-display text-5xl text-white md:text-6xl">Circuit desk</h1>
      </header>
      <VaultCarousel onOpenSlide={onOpenVaultSlide} />
      <div className="relative z-10 grid gap-5 lg:grid-cols-3">
        <TournamentsShowcase tournaments={tournaments} onOpenTournament={onOpenTournament} onBrowseAll={onOpenTournaments} />
        <FindPlayersShowcase onConnect={onConnectPlayer} onBrowseAll={onOpenPlayers} />
        <CommunityBlogShowcase posts={blogPosts} onBrowseAll={onOpenBlog} />
      </div>
    </div>
  );
}
