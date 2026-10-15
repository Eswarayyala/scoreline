import { NavLink, useLocation } from "react-router-dom";

const LINKS = [
  { to: "/", label: "The Vault", end: true },
  { to: "/tournaments", label: "Tournaments" },
  { to: "/find-players", label: "Find players" },
  { to: "/blog", label: "Community blog" },
];

export default function PublicNav() {
  const location = useLocation();
  return (
    <nav className="mx-auto max-w-6xl px-5">
      <div className="flex flex-wrap gap-1 border-b border-white/10">
        {LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) => {
              const on =
                isActive
                || (link.to === "/" && location.pathname.startsWith("/vault"))
                || (link.to === "/tournaments" && location.pathname.startsWith("/tournaments"));
              return `px-3.5 py-2.5 font-mono text-xs uppercase tracking-wider ${on ? "border-b-2 border-amber-400 text-white" : "border-b-2 border-transparent text-stone-400 hover:text-white"}`;
            }}
          >
            {link.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
