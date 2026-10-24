import { SCRIM_ALERT_MODES } from "../../data/scrimAlerts";

export default function ScrimAlertPrefs({
  open,
  onClose,
  alerts,
  gamesList = [],
  officialHosts = [],
  onSave,
  onToggleFollow,
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-xl border border-white/10 bg-slate-950 p-5" onClick={(e) => e.stopPropagation()}>
        <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Scrim alerts</p>
        <h2 className="m-0 font-display text-3xl text-white">Flyer notifications</h2>
        <p className="mt-1 text-sm text-slate-500">Get in-app alerts when hosts publish public or prize flyers for games you follow.</p>

        <label className="mt-4 flex items-center gap-2 text-sm text-slate-200">
          <input
            type="checkbox"
            checked={alerts.enabled}
            onChange={(e) => onSave({ ...alerts, enabled: e.target.checked })}
          />
          Receive scrim flyer alerts
        </label>

        <label className="mt-3 flex items-center gap-2 text-sm text-slate-200">
          <input
            type="checkbox"
            checked={alerts.browserPushOptIn === true}
            onChange={async (e) => {
              const on = e.target.checked;
              if (on && typeof window !== "undefined" && "Notification" in window) {
                const permission = await Notification.requestPermission();
                if (permission !== "granted") {
                  onSave({ ...alerts, browserPushOptIn: false });
                  return;
                }
              }
              onSave({ ...alerts, browserPushOptIn: on });
            }}
          />
          Browser push when a matching flyer publishes
        </label>

        <label className="mt-3 flex items-center gap-2 text-sm text-slate-200">
          <input
            type="checkbox"
            checked={alerts.digestOptIn === true}
            onChange={(e) => onSave({ ...alerts, digestOptIn: e.target.checked })}
          />
          Weekly digest opt-in (email when sender is configured)
        </label>

        <label className="mt-3 grid gap-1 font-mono text-[10px] uppercase tracking-widest text-slate-500">
          Which flyers
          <select
            className="rounded border border-white/15 bg-transparent px-2 py-1.5 text-[12px] normal-case tracking-normal text-white"
            value={alerts.modes}
            onChange={(e) => onSave({ ...alerts, modes: e.target.value })}
          >
            {SCRIM_ALERT_MODES.map((mode) => (
              <option key={mode.id} value={mode.id}>{mode.label}</option>
            ))}
          </select>
        </label>

        <div className="mt-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Games</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {gamesList.slice(0, 24).map((game) => {
              const on = (alerts.games || []).includes(game);
              return (
                <button
                  key={game}
                  type="button"
                  onClick={() => {
                    const next = on
                      ? alerts.games.filter((item) => item !== game)
                      : [...(alerts.games || []), game].slice(0, 20);
                    onSave({ ...alerts, games: next });
                  }}
                  className={`rounded-full border px-2 py-1 font-mono text-[10px] ${on ? "border-neon text-neon" : "border-white/15 text-slate-400"}`}
                >
                  {game}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 border-t border-white/10 pt-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Official hosts</p>
          {officialHosts.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No verified hosts yet. Staff can badge official orgs.</p>
          ) : (
            <div className="mt-2 grid gap-2">
              {officialHosts.map((host) => {
                const following = (alerts.followedHosts || []).includes(host.uid);
                return (
                  <div key={host.uid} className="flex items-center justify-between gap-2 rounded border border-white/10 px-2 py-1.5">
                    <span className="text-sm text-slate-200">{host.orgName || host.displayName || host.uid}</span>
                    <button
                      type="button"
                      className={`font-mono text-[10px] uppercase tracking-widest ${following ? "text-neon" : "text-slate-400"}`}
                      onClick={() => onToggleFollow?.(host.uid, !following)}
                    >
                      {following ? "Following" : "Follow"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-5 flex justify-end">
          <button type="button" className="font-mono text-[10px] uppercase tracking-widest text-slate-400" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
