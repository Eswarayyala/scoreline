import { useNavigate } from "react-router-dom";

const btnStyle = {
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
};

/** Fixed bottom-left stack: Back (history) above Home. */
export default function SectionBackHome({ label = "Home", to = "/" } = {}) {
  const navigate = useNavigate();

  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(to, { replace: true });
  };

  return (
    <div
      style={{
        position: "fixed",
        left: 16,
        bottom: 20,
        zIndex: 70,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 8,
      }}
    >
      <button type="button" onClick={goBack} aria-label="Go back" style={btnStyle}>
        ← Back
      </button>
      <button
        type="button"
        onClick={() => navigate(to, { replace: to === "/" })}
        aria-label={`Go to ${label}`}
        style={btnStyle}
      >
        ← {label}
      </button>
    </div>
  );
}
