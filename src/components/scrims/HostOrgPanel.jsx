import { useMemo, useState } from "react";
import HostVerifyPrompt from "./HostVerifyPrompt";
import { GAME_VERIFY_PROCESSES, gameVerifyProcess } from "../../data/hostVerification";

export default function HostOrgPanel({
  user,
  myProfile,
  officialHosts = [],
  hostRequests = [],
  isStaff = false,
  followedHosts = [],
  verification = null,
  onRequestOfficial,
  onDecideRequest,
  onToggleFollow,
  onOpenHostScrims,
  onDismissVerifyPrompt = null,
  verifyPromptDismissed = false,
}) {
  const [orgName, setOrgName] = useState(myProfile?.displayName || "");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  const myOfficial = officialHosts.find((host) => host.uid === user?.uid && host.enabled !== false);
  const myRequest = hostRequests.find((row) => row.uid === user?.uid || row.id === user?.uid);
  const pending = useMemo(
    () => hostRequests.filter((row) => row.status === "pending"),
    [hostRequests],
  );
  const eligible = verification?.eligible === true;
  const best = verification?.best;
  const canRequest = Boolean(user && !myOfficial && myRequest?.status !== "pending" && eligible);

  const submit = async () => {
    if (!eligible) {
      setNote(verification?.summary || `Host ${HOST_VERIFY_THRESHOLD_DEFAULT}+ successful scrims with results first.`);
      return;
    }
    if (!orgName.trim()) {
      setNote("Enter an org / host name.");
      return;
    }
    setBusy(true);
    setNote("");
    try {
      await onRequestOfficial?.({
        orgName: orgName.trim().slice(0, 60),
        message: message.trim().slice(0, 400),
        displayName: myProfile?.displayName || "",
        verification,
      });
      setNote("Request sent for owner / support review.");
    } catch (issue) {
      setNote(issue?.message || "Couldn't submit request");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-4 rounded-xl border border-white/10 bg-slate-950/60 p-4">
      <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Official hosts</p>
      <h3 className="m-0 font-display text-2xl text-white">Orgs &amp; verified hosts</h3>
      <p className="mt-1 text-xs text-slate-500">
        Each game has its own process. Run that path end-to-end, post results within 24 hours of the last room,
        hit the game’s desk count, then you’ll be notified for verification review.
      </p>

      {user && !myOfficial ? (
        <HostVerifyPrompt
          evaluation={verification}
          dismissed={verifyPromptDismissed || myRequest?.status === "pending"}
          onDismiss={onDismissVerifyPrompt}
          onRequest={canRequest ? () => {
            const el = document.getElementById("host-badge-request");
            el?.scrollIntoView({ behavior: "smooth", block: "center" });
          } : null}
        />
      ) : null}

      {user ? (
        <div id="host-badge-request" className="mt-3 rounded-lg border border-white/10 p-3">
          {myOfficial ? (
            <p className="text-sm text-neon">Verified host · {myOfficial.orgName || myOfficial.displayName}</p>
          ) : (
            <>
              <p className="m-0 font-mono text-[10px] uppercase tracking-widest text-slate-500">Your hosting track</p>
              <p className="mt-1 text-sm text-slate-300">{verification?.summary || "No successful full-scale scrims yet."}</p>
              {verification?.byGame?.length ? (
                <div className="mt-3 grid gap-2">
                  {verification.byGame.slice(0, 8).map((row) => (
                    <div key={row.game}>
                      <div className="mb-1 flex justify-between gap-2 font-mono text-[10px] uppercase tracking-widest text-slate-500">
                        <span>{row.game}</span>
                        <span className={row.eligible ? "text-neon" : ""}>
                          {row.count}/{row.threshold}
                          {row.eligible ? " · review" : ""}
                        </span>
                      </div>
                      <p className="m-0 mb-1 text-[11px] normal-case tracking-normal text-slate-500">
                        {row.pathLabel || gameVerifyProcess(row.game).stages.join(" → ")}
                      </p>
                      <div className="h-1 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-neon/80"
                          style={{ width: `${Math.round(row.progress * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-2 grid gap-1.5 text-xs text-slate-500">
                  <p className="m-0">Follow the process for the game you host. Examples:</p>
                  {["BGMI", "Valorant", "League of Legends", "Rocket League"].map((game) => {
                    const process = GAME_VERIFY_PROCESSES[game];
                    return (
                      <p key={game} className="m-0 font-mono text-[10px] uppercase tracking-widest text-slate-500">
                        {game} · {process.stages.join(" → ")} · {process.threshold} desks
                      </p>
                    );
                  })}
                </div>
              )}

              {myRequest?.status === "pending" ? (
                <p className="mt-3 text-sm text-slate-300">Badge request pending review.</p>
              ) : null}
              {myRequest?.status === "declined" ? (
                <p className="mt-3 mb-2 text-sm text-rose-300">Previous request declined. You can submit again when eligible.</p>
              ) : null}

              {!myOfficial && myRequest?.status !== "pending" ? (
                <div className="mt-3 grid gap-2">
                  {!eligible ? (
                    <p className="m-0 text-xs text-slate-500">
                      {best
                        ? `Host ${best.remaining} more complete ${best.game} desk${best.remaining === 1 ? "" : "s"} (${best.pathLabel || gameVerifyProcess(best.game).stages.join(" → ")}) to unlock review.`
                        : "Complete a game’s full process with on-time results to unlock verification review."}
                    </p>
                  ) : null}
                  <input
                    className="rounded border border-white/15 bg-transparent px-2 py-1.5 text-sm text-white disabled:opacity-40"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="Org / host name"
                    maxLength={60}
                    disabled={!eligible}
                  />
                  <textarea
                    className="rounded border border-white/15 bg-transparent px-2 py-1.5 text-sm text-white disabled:opacity-40"
                    rows={2}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Optional note for reviewers"
                    maxLength={400}
                    disabled={!eligible}
                  />
                  <button
                    type="button"
                    disabled={busy || !eligible}
                    onClick={submit}
                    className="w-fit rounded-md border border-neon/40 bg-neon/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-neon disabled:opacity-40"
                  >
                    {busy ? "Sending…" : eligible ? "Request verification review" : "Locked · follow your game’s process"}
                  </button>
                </div>
              ) : null}
            </>
          )}
          {note ? <p className="mt-2 text-xs text-slate-400">{note}</p> : null}
        </div>
      ) : null}

      <div className="mt-4 grid gap-2">
        {officialHosts.length === 0 ? (
          <p className="text-sm text-slate-500">No verified hosts yet.</p>
        ) : officialHosts.map((host) => {
          const following = followedHosts.includes(host.uid);
          return (
            <div key={host.uid} className="flex flex-wrap items-center justify-between gap-2 rounded border border-white/10 px-3 py-2">
              <div>
                <p className="m-0 font-display text-xl text-white">{host.orgName || host.displayName || host.uid}</p>
                <p className="m-0 font-mono text-[10px] uppercase tracking-widest text-slate-500">Official host</p>
              </div>
              <div className="flex gap-2">
                {onOpenHostScrims ? (
                  <button type="button" className="font-mono text-[10px] uppercase tracking-widest text-slate-400" onClick={() => onOpenHostScrims(host.uid)}>
                    Profile
                  </button>
                ) : null}
                {user && host.uid !== user.uid ? (
                  <button type="button" className={`font-mono text-[10px] uppercase tracking-widest ${following ? "text-neon" : "text-slate-400"}`} onClick={() => onToggleFollow?.(host.uid, !following)}>
                    {following ? "Following" : "Follow"}
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {isStaff && pending.length > 0 ? (
        <div className="mt-4 border-t border-white/10 pt-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Pending badge requests · {pending.length}</p>
          {pending.map((row) => (
            <div key={row.id || row.uid} className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded border border-white/10 px-3 py-2">
              <div>
                <p className="m-0 text-sm text-white">{row.orgName}</p>
                <p className="m-0 text-xs text-slate-500">
                  {row.displayName || row.uid}
                  {row.qualifyingGame
                    ? ` · ${row.successfulCount || "?"}/${row.threshold || "?"} ${row.qualifyingGame}`
                    : ""}
                  {row.message ? ` · ${row.message}` : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <button type="button" className="font-mono text-[10px] uppercase tracking-widest text-neon" onClick={() => onDecideRequest?.(row, "approved")}>Approve</button>
                <button type="button" className="font-mono text-[10px] uppercase tracking-widest text-rose-300" onClick={() => onDecideRequest?.(row, "declined")}>Decline</button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
