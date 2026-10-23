import { useNavigate } from "react-router-dom";

/** Sticky back control so users can return Home without scrolling to the top. */
export default function SectionBackHome({ label = "Home", to = "/" } = {}) {
  const navigate = useNavigate();
  return (
    <div className="sticky top-0 z-40 -mx-1 mb-3 border-b border-white/10 bg-slate-950/95 px-1 py-2 backdrop-blur-md supports-[backdrop-filter]:bg-slate-950/80">
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
