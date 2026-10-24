import { useEffect } from "react";

/** Full-viewport blog sheet — keeps the previous page dimmed behind. */
export default function BlogOverlay({ children, onClose }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Esports blog">
      <button
        type="button"
        className="absolute inset-0 border-0 bg-black/75 backdrop-blur-sm"
        aria-label="Close blog"
        onClick={onClose}
      />
      <div className="relative z-10 mx-auto flex h-full w-full max-w-5xl flex-col bg-[var(--page-bg-solid,#020617)] sm:my-3 sm:h-[calc(100%-1.5rem)] sm:overflow-hidden sm:rounded-2xl sm:border sm:border-white/10 sm:shadow-2xl">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-5 py-3">
          <div>
            <p className="m-0 font-mono text-[10px] uppercase tracking-[0.2em] text-neon">Community</p>
            <h1 className="m-0 font-['Bebas_Neue',sans-serif] text-3xl tracking-wide text-white">Esports blog</h1>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-10 shrink-0 px-3 font-mono text-[11px] uppercase tracking-widest text-slate-400 hover:text-white"
          >
            Close
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-28 pt-4">{children}</div>
      </div>
    </div>
  );
}
