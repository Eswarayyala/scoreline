import { attendanceSummaryLine, isPlayerCheckedIn, scrimRequiresCheckIn } from "../../data/scrimAttendance";
import { isApprovedRegistrant } from "../../data/scrimAccess";
import { resolveScrimDeskPhase } from "../../data/scrimPhase";

/**
 * One-tap check-in for approved players when the desk is in check-in / live phase.
 */
export default function PlayerCheckInBar({
  tournament,
  registrations = [],
  currentUserId = null,
  isAdmin = false,
  onCheckIn,
  onSignIn,
}) {
  if (!tournament || isAdmin) return null;

  const needCheckIn = scrimRequiresCheckIn(tournament);
  if (!needCheckIn) return null;

  const phase = resolveScrimDeskPhase(tournament).phase;
  if (phase !== "checkin" && phase !== "live" && phase !== "lobby") return null;

  const roster = attendanceSummaryLine(tournament);
  const approved = isApprovedRegistrant(registrations, currentUserId);
  const checkedIn = isPlayerCheckedIn(registrations, currentUserId);
  const mine = registrations.find((row) => row.playerId === currentUserId);
  const mineStatus = mine?.status;

  if (!currentUserId) {
    return (
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border border-amber-400/30 bg-amber-400/5 px-3 py-2.5">
        <div>
          <p className="m-0 font-mono text-[10px] uppercase tracking-widest text-amber-300">Check-in</p>
          <p className="m-0 text-sm text-slate-300">
            Sign in to check in when you have a seat.
            {roster ? ` · ${roster}` : ""}
          </p>
        </div>
        {onSignIn ? (
          <button
            type="button"
            onClick={onSignIn}
            className="rounded-md border border-amber-400/40 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-amber-200"
          >
            Sign in
          </button>
        ) : null}
      </div>
    );
  }

  if (mineStatus && mineStatus !== "approved") {
    return null;
  }

  if (!approved) {
    if (!roster) return null;
    return (
      <div className="mb-4 border border-white/10 px-3 py-2.5">
        <p className="m-0 font-mono text-[10px] uppercase tracking-widest text-slate-500">Roster</p>
        <p className="m-0 text-sm text-slate-400">{roster}</p>
      </div>
    );
  }

  if (checkedIn) {
    return (
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border border-neon/30 bg-neon/5 px-3 py-2.5">
        <div>
          <p className="m-0 font-mono text-[10px] uppercase tracking-widest text-neon">You&apos;re in</p>
          <p className="m-0 text-sm text-slate-300">
            Checked in. Room codes unlock when the host posts them.
            {roster ? ` · ${roster}` : ""}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border border-amber-400/35 bg-amber-400/10 px-3 py-2.5">
      <div>
        <p className="m-0 font-mono text-[10px] uppercase tracking-widest text-amber-300">Check-in open</p>
        <p className="m-0 text-sm text-slate-200">
          One tap to confirm you&apos;re here.
          {roster ? ` · ${roster}` : ""}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onCheckIn?.(tournament.id)}
        className="rounded-md border border-amber-400/50 bg-amber-400/15 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-amber-100"
      >
        I&apos;m in
      </button>
    </div>
  );
}
