import { NavLink, useLocation } from "react-router-dom";

const LINKS = [
  { to: "/", label: "Home", end: true },
  { to: "/vault", label: "The Vault" },
];

export default function PublicNav() {
  const location = useLocation();
  return (
    <nav className="mx-auto max-w-6xl px-5">
      <div className="flex flex-nowrap gap-1 overflow-x-auto border-b border-white/10">
        {LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) => {
              const on = isActive || (link.to === "/vault" && location.pathname.startsWith("/vault"));
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
