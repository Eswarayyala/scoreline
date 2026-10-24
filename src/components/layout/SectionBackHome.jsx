import { useNavigate } from "react-router-dom";

/** Viewport-fixed Home control — stays visible while the page scrolls. */
export default function SectionBackHome({ label = "Home", to = "/" } = {}) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(to, { replace: to === "/" })}
      aria-label={`Back to ${label}`}
      style={{
        position: "fixed",
        left: 16,
        bottom: 20,
        zIndex: 70,
        display: "inline-flex",
        minHeight: 40,
        alignItems: "center",
        gap: 6,
        padding: "10px 14px",
        cursor: "pointer",
        color: "var(--page-text, #edf1f4)",
        background: "rgba(2, 6, 23, 0.96)",
        border: "1px solid rgba(255,255,255,0.18)",
        boxShadow: "0 8px 28px rgba(0,0,0,0.45)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        fontFamily: "ui-monospace, monospace",
        fontSize: 11,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
      }}
    >
      ← {label}
    </button>
  );
}
