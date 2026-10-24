import { useLocation, useNavigate } from "react-router-dom";

const PRIMARY = [
  { to: "/", label: "Home", end: true },
  { to: "/vault", label: "Vault", end: false },
  { to: "/blog", label: "Blog", overlay: true },
];

export default function PublicNav({
  pathname = window.location.pathname,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const onVault = pathname === "/vault" || pathname.startsWith("/vault/");
  const onBlog = pathname === "/blog";

  const open = (link) => {
    if (link.overlay) {
      if (pathname === link.to) return;
      navigate(link.to, { state: { background: location } });
      return;
    }
    navigate(link.to);
  };

  return (
    <nav className="relative z-20 mx-auto max-w-6xl px-5">
      <div className="-mx-1 flex flex-nowrap items-center gap-1 overflow-x-auto px-1 pb-0.5 border-b border-white/10 [scrollbar-width:thin]">
        {PRIMARY.map((link) => {
          const on = link.overlay ? onBlog : link.end ? pathname === link.to : onVault;
          return (
            <button
              key={link.to}
              type="button"
              onClick={() => open(link)}
              className={`min-h-10 shrink-0 px-3 py-2.5 font-mono text-[11px] uppercase tracking-wider ${on ? "border-b-2 border-neon text-white" : "border-b-2 border-transparent text-slate-500 hover:text-slate-200"}`}
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
    </nav>
  );
}
