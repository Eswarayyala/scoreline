import { useNavigate } from "react-router-dom";

/** Fixed Home control so it stays visible while the page scrolls. */
export default function SectionBackHome({ label = "Home", to = "/" } = {}) {
  const navigate = useNavigate();
  return (
    <div className="sticky top-0 z-50 mb-3 border-b border-white/10 bg-slate-950/95 py-2 backdrop-blur-md">
      <button
        type="button"
        onClick={() => navigate(to, { replace: to === "/" })}
        className="inline-flex min-h-9 items-center font-mono text-[10px] uppercase tracking-widest text-neon hover:text-neon"
      >
        ← {label}
      </button>
    </div>
  );
}
