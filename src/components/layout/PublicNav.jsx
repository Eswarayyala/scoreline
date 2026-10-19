import { useNavigate } from "react-router-dom";
import StaffSocialLinks from "./StaffSocialLinks";

const PRIMARY = [
  { to: "/", label: "Home", end: true },
  { to: "/vault", label: "The Vault" },
  { to: "/vault/franchises", label: "Franchises" },
  { to: "/vault/players", label: "Players" },
];

export default function PublicNav({
  pathname = window.location.pathname,
  ownerPresence = null,
  supportPresence = null,
}) {
  const navigate = useNavigate();
  return (
    <nav className="relative z-20 mx-auto max-w-6xl px-5">
      <div className="flex flex-nowrap gap-1 overflow-x-auto border-b border-white/10">
        {PRIMARY.map((link) => {
          const on = link.end
            ? pathname === link.to
            : link.to === "/vault"
              ? pathname === "/vault"
              : pathname === link.to || pathname.startsWith(`${link.to}/`);
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
      <StaffSocialLinks ownerProfile={ownerPresence} supportProfile={supportPresence} />
    </nav>
  );
}
