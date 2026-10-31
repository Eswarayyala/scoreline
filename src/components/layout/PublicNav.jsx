import { useLocation, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import { defaultUiLayout, navLinksFor } from "../../data/siteUiLayout";

function HomeGlyph({ active }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={{ color: active ? "var(--page-text)" : "var(--nav-inactive)" }}
    >
      <path
        d="M4.5 10.8 12 4.5l7.5 6.3V19a1.5 1.5 0 0 1-1.5 1.5h-3.75v-5.25h-4.5V20.5H6A1.5 1.5 0 0 1 4.5 19v-8.2Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function PublicNav({
  pathname = window.location.pathname,
  signedIn = false,
  uiLayout = null,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const reduce = useReducedMotion();
  const links = navLinksFor(uiLayout || defaultUiLayout(), signedIn);
  const onVault = pathname === "/vault" || pathname.startsWith("/vault/");
  const showVaultSubs = onVault && links.some((link) => link.id === "vault");

  const open = (link) => {
    if (link.end) {
      sessionStorage.setItem("grindinfo-default-scrims", "1");
    }
    if (link.overlay) {
      if (pathname === link.to) return;
      navigate(link.to, { state: { background: location } });
      return;
    }
    navigate(link.to);
  };

  const linkActive = (link) => {
    if (link.overlay) return pathname === "/blog";
    if (link.end) return pathname === "/";
    if (link.id === "scrims") return pathname === "/tournaments" || pathname.startsWith("/tournaments/");
    if (link.id === "vault") return onVault;
    if (link.id === "findPlayers") return pathname === "/find-players" || pathname.startsWith("/find-players/");
    if (link.id === "games") return pathname === "/games" || pathname.startsWith("/games/");
    return pathname === link.to || pathname.startsWith(`${link.to}/`);
  };

  return (
    <nav className="relative z-20 mx-auto max-w-6xl px-5" aria-label="Primary">
      <div
        className="-mx-1 flex flex-nowrap items-center gap-1 overflow-x-auto px-1 pb-0.5 [scrollbar-width:thin]"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        {links.map((link) => {
          const on = linkActive(link);
          return (
            <button
              key={link.id || link.to}
              type="button"
              onClick={() => open(link)}
              aria-label={link.icon === "home" ? "Home" : link.label}
              aria-current={on ? "page" : undefined}
              className="relative flex min-h-10 shrink-0 items-center justify-center px-3 py-2.5 font-mono text-[11px] uppercase tracking-wider transition-colors duration-200"
              style={{
                color: on ? "var(--page-text)" : "var(--nav-inactive)",
                background: "transparent",
                border: 0,
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                if (!on) e.currentTarget.style.color = "var(--nav-hover)";
              }}
              onMouseLeave={(e) => {
                if (!on) e.currentTarget.style.color = "var(--nav-inactive)";
              }}
            >
              {link.icon === "home" ? <HomeGlyph active={on} /> : link.label}
              {on ? (
                <motion.span
                  layoutId={reduce ? undefined : "public-nav-underline"}
                  className="absolute inset-x-2 bottom-0 h-0.5"
                  style={{ background: "var(--accent)" }}
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              ) : null}
            </button>
          );
        })}
        {showVaultSubs && (
          <>
            <span className="mx-0.5 shrink-0" style={{ color: "var(--text-dim)" }} aria-hidden="true">/</span>
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
                  className="min-h-10 shrink-0 px-2.5 py-2.5 font-mono text-[10px] uppercase tracking-wider transition-colors duration-200"
                  style={{
                    color: on ? "var(--accent)" : "var(--nav-inactive)",
                    background: "transparent",
                    border: 0,
                    cursor: "pointer",
                  }}
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
