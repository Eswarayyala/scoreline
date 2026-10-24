import { useMemo, useState } from "react";
import { Bell } from "lucide-react";
import { announcementMatchesViewer } from "../../data/scrimAlerts";

export default function ScrimBell({
  announcements = [],
  alerts,
  onOpenTournament,
  onMarkSeen,
  onOpenPrefs,
}) {
  const [open, setOpen] = useState(false);
  const matching = useMemo(
    () =>
      [...announcements]
        .filter((item) => announcementMatchesViewer(item, alerts))
        .sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0))
        .slice(0, 24),
    [announcements, alerts],
  );
  const unread = matching.filter((item) => (item.publishedAt || 0) > (alerts?.lastSeenAt || 0));

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={unread.length ? `${unread.length} scrim alerts` : "Scrim alerts"}
        onClick={() => {
          setOpen((value) => !value);
          if (!open && unread.length) onMarkSeen?.();
        }}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-slate-200 hover:border-neon/50 hover:text-neon"
      >
        <Bell size={16} />
        {unread.length > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-neon px-1 font-mono text-[9px] text-black">
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-white/10 bg-slate-950 shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-slate-400">Scrim flyers</span>
            <button type="button" className="font-mono text-[10px] uppercase tracking-widest text-neon" onClick={() => { onOpenPrefs?.(); setOpen(false); }}>
              Prefs
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {matching.length === 0 ? (
              <p className="px-3 py-4 text-sm text-slate-500">No flyer alerts yet. Follow an official host or enable game alerts.</p>
            ) : (
              matching.map((item) => (
                <button
                  key={item.tournamentId || item.id}
                  type="button"
                  className="flex w-full gap-3 border-b border-white/5 px-3 py-2.5 text-left hover:bg-white/5"
                  onClick={() => {
                    onOpenTournament?.(item.tournamentId);
                    setOpen(false);
                  }}
                >
                  {item.posterUrl ? (
                    <img src={item.posterUrl} alt="" className="h-12 w-9 shrink-0 rounded object-cover" />
                  ) : (
                    <div className="h-12 w-9 shrink-0 rounded bg-white/10" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-lg leading-none text-white">{item.tournamentName}</span>
                    <span className="mt-1 block font-mono text-[10px] uppercase tracking-widest text-slate-500">
                      {item.game}
                      {item.paid ? " · Prize" : " · Public"}
                      {item.hostName ? ` · ${item.hostName}` : ""}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
