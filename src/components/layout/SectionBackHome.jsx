import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";

const btnStyle = {
  display: "inline-flex",
  minHeight: 40,
  alignItems: "center",
  gap: 6,
  padding: "10px 14px",
  cursor: "pointer",
  color: "var(--page-text, #edf1f4)",
  background: "rgba(2, 6, 23, 0.96)",
  border: "1px solid rgba(255,255,255,0.22)",
  boxShadow: "0 8px 28px rgba(0,0,0,0.55)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  fontFamily: "ui-monospace, monospace",
  fontSize: 11,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
};

const FOCUS_PARAMS = ["event", "compare", "details", "game"];

function parentPathFor(pathname = "/", fallback = "/") {
  const path = String(pathname || "/");
  if (/^\/tournaments\/[^/]+/.test(path)) return "/tournaments";
  if (/^\/hosts\/[^/]+/.test(path)) return "/tournaments";
  if (/^\/games\/[^/]+/.test(path)) return "/games";
  if (/^\/vault\/dossier\//.test(path)) return "/vault/franchises";
  if (/^\/vault\/(ewc|legacy|franchises|players)$/.test(path)) return "/vault";
  if (/^\/vault\/[^/]+/.test(path)) return "/vault";
  if (/^\/community/.test(path)) return "/";
  return fallback;
}

function stripFocusSearch(search = "") {
  const params = new URLSearchParams(search);
  let changed = false;
  FOCUS_PARAMS.forEach((key) => {
    if (params.has(key)) {
      params.delete(key);
      changed = true;
    }
  });
  return changed ? params : null;
}

/**
 * Viewport-fixed Back / Home dock.
 * Portaled to document.body so page motion transforms cannot trap `position: fixed`
 * or let window cards paint over the controls.
 *
 * Back order:
 * 1) Real in-app history (home → window returns home). Prefer Router idx over
 *    window.history.length, which is polluted by prior browser tabs.
 * 2) Only if this is the first SPA entry: peel ?event / compare / details so a
 *    cold deep-link still shows the edition stack instead of bouncing out.
 * 3) Section parent path (scrim → /tournaments, vault slug → /vault, …).
 */
export default function SectionBackHome({ label = "Home", to = "/" } = {}) {
  const navigate = useNavigate();
  const location = useLocation();

  const goBack = () => {
    const idx = window.history.state?.idx;
    if (typeof idx === "number" && idx > 0) {
      navigate(-1);
      return;
    }

    const cleared = stripFocusSearch(location.search);
    if (cleared) {
      const search = cleared.toString();
      navigate(
        { pathname: location.pathname, search: search ? `?${search}` : "", hash: location.hash },
        { replace: true },
      );
      return;
    }

    navigate(parentPathFor(location.pathname, to), { replace: true });
  };

  const dock = (
    <div
      data-gi-nav-dock
      style={{
        position: "fixed",
        left: 16,
        bottom: 20,
        zIndex: 200,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 8,
        pointerEvents: "none",
      }}
    >
      <button type="button" onClick={goBack} aria-label="Go back" style={{ ...btnStyle, pointerEvents: "auto" }}>
        ← Back
      </button>
      <button
        type="button"
        onClick={() => navigate(to, { replace: to === "/" })}
        aria-label={`Go to ${label}`}
        style={{ ...btnStyle, pointerEvents: "auto" }}
      >
        ← {label}
      </button>
    </div>
  );

  if (typeof document === "undefined") return dock;
  return createPortal(dock, document.body);
}
