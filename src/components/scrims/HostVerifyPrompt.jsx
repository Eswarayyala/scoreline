import { Link } from "react-router-dom";

/** In-app nudge when a host clears a game's verification process bar. */
export default function HostVerifyPrompt({
  evaluation = null,
  dismissed = false,
  onDismiss = null,
  onRequest = null,
  compact = false,
}) {
  if (!evaluation?.eligible || dismissed) return null;
  const best = evaluation.pendingNotify || evaluation.best;
  const extras = (evaluation.eligibleGames || []).filter((row) => row.game !== best?.game);

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 border border-neon/30 bg-neon/5 ${
        compact ? "mb-4 rounded-lg px-3 py-2.5" : "mb-6 rounded-xl px-4 py-3"
      }`}
    >
      <div className="min-w-0">
        <p className="m-0 font-mono text-[10px] uppercase tracking-widest text-neon">Verification review</p>
        <p className={`m-0 text-slate-200 ${compact ? "text-sm" : "mt-0.5 text-sm"}`}>
          {best
            ? `${best.game}: ${best.count}/${best.threshold} complete desks · ${best.pathLabel}. Request official host review.`
            : "You cleared a game process bar. Request official host review."}
        </p>
        {best?.processLabel ? (
          <p className="m-0 mt-1 font-mono text-[10px] uppercase tracking-widest text-slate-500">{best.processLabel}</p>
        ) : null}
        {extras.length ? (
          <p className="m-0 mt-1 text-xs text-slate-500">
            Also ready: {extras.map((row) => row.game).join(", ")}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {onRequest ? (
          <button
            type="button"
            onClick={onRequest}
            className="rounded-md border border-neon/50 bg-neon/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-neon"
          >
            Request review
          </button>
        ) : (
          <Link
            to="/desk"
            className="rounded-md border border-neon/50 bg-neon/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-neon no-underline"
          >
            Open desk
          </Link>
        )}
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-md border border-white/15 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-slate-400"
          >
            Later
          </button>
        ) : null}
      </div>
    </div>
  );
}
