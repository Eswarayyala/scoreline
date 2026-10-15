import { useNavigate } from "react-router-dom";

const PRIMARY = [
  { to: "/", label: "Home", end: true },
  { to: "/vault", label: "The Vault" },
];

const FEATURES = [
  { to: "/find-players", label: "Find players" },
  { to: "/tournaments", label: "Tournaments" },
  { to: "/blog", label: "Community blog" },
];

export default function PublicNav({ pathname = window.location.pathname }) {
  const navigate = useNavigate();
  return (
    <nav className="relative z-20 mx-auto max-w-6xl px-5">
      <div className="flex flex-nowrap gap-1 overflow-x-auto border-b border-white/10">
        {PRIMARY.map((link) => {
          const on = link.end ? pathname === link.to : pathname === link.to || pathname.startsWith(`${link.to}/`);
          return (
            <button
              key={link.to}
              type="button"
              onClick={() => navigate(link.to)}
              className={`px-3.5 py-2.5 font-mono text-xs uppercase tracking-wider ${on ? "border-b-2 border-amber-400 text-white" : "border-b-2 border-transparent text-stone-400 hover:text-white"}`}
            >
              {link.label}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 py-2">
        {FEATURES.map((link) => (
          <button
            type="button"
            key={link.to}
            onClick={() => navigate(link.to)}
            className={`bg-transparent p-0 font-mono text-[11px] uppercase tracking-wider ${pathname === link.to || (link.to === "/tournaments" && pathname.startsWith("/tournaments")) ? "text-amber-300" : "text-stone-500 hover:text-white"}`}
          >
            {link.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
