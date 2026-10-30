import { useLocation, useNavigate } from "react-router-dom";

const PRIMARY = [
  { to: "/", label: "Home", end: true },
  { to: "/games", label: "Games", end: false },
  { to: "/tournaments", label: "Scrims", end: false },
  { to: "/vault", label: "Vault", end: false },
  { to: "/blog", label: "Blog", overlay: true },
];

export default function PublicNav({
  pathname = window.location.pathname,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const onVault = pathname === "/vault" || pathname.startsWith("/vault/");
  const onGames = pathname === "/games" || pathname.startsWith("/games/");
  const onScrims = pathname === "/tournaments" || pathname.startsWith("/tournaments/");
  const onBlog = pathname === "/blog";

  const open = (link) => {
    if (link.overlay) {
      if (pathname === link.to) return;
      navigate(link.to, { state: { background: location } });
      return;
    }
    navigate(link.to);
  };

  const linkActive = (link) => {
    if (link.overlay) return onBlog;
    if (link.end) return pathname === link.to;
    if (link.to === "/games") return onGames;
    if (link.to === "/tournaments") return onScrims;
    if (link.to === "/vault") return onVault;
    return pathname === link.to || pathname.startsWith(`${link.to}/`);
  };

  return (
    <nav className="relative z-20 mx-auto max-w-6xl px-5">
      <div className="flex items-center gap-3 border-b border-white/10 py-1">
        <button
          type="button"
          onClick={() => navigate("/")}
          aria-label="GrindInfo home"
          className="flex min-h-10 shrink-0 items-center gap-2 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neon"
        >
          <img src="/favicon.svg" alt="" aria-hidden="true" className="h-8 w-8 shrink-0" />
          <span className="whitespace-nowrap font-display text-[21px] leading-none tracking-[0.06em] text-white">
            GRIND<span className="text-neon">INFO</span>
          </span>
        </button>
        <div className="min-w-0 flex-1">
          <div className="-mx-1 flex flex-nowrap items-center gap-1 overflow-x-auto px-1 pb-0.5 [scrollbar-width:thin]">
        {PRIMARY.map((link) => {
          const on = linkActive(link);
          return (
            <button
              key={link.to}
              type="button"
              onClick={() => open(link)}
              className={`min-h-10 shrink-0 px-3 py-2.5 font-mono text-[11px] uppercase tracking-wider transition-colors duration-200 ${on ? "border-b-2 border-neon text-white" : "border-b-2 border-transparent text-slate-500 hover:text-slate-200"}`}
            >
              {link.label}
            </button>
          );
        })}
        {onVault && !onBlog && (
          <>
            <span className="mx-0.5 shrink-0 text-slate-600" aria-hidden="true">/</span>
            {[
              { to: "/vault/franchises", label: "Franchises" },
              { to: "/vault/players", label: "Players" },
              { to: "/vault/ewc", label: "EWC" },
            ].map((link) => {
              const on = pathname === link.to || pathname.startsWith(`${link.to}/`);
              return (
                <button
                  key={link.to}
                  type="button"
                  onClick={() => navigate(link.to)}
                  className={`min-h-10 shrink-0 px-2.5 py-2.5 font-mono text-[10px] uppercase tracking-wider ${on ? "text-neon" : "text-slate-500 hover:text-slate-300"}`}
                >
                  {link.label}
                </button>
              );
            })}
          </>
        )}
          </div>
        </div>
      </div>
    </nav>
  );
}
