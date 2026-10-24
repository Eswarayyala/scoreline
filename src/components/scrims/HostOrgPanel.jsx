import { useMemo, useState } from "react";

export default function HostOrgPanel({
  user,
  myProfile,
  officialHosts = [],
  hostRequests = [],
  isStaff = false,
  followedHosts = [],
  onRequestOfficial,
  onDecideRequest,
  onToggleFollow,
  onOpenHostScrims,
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

  const submit = async () => {
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
      <p className="mt-1 text-xs text-slate-500">Follow verified hosts for regular scrim flyers. Request a badge if you run a recurring desk.</p>

      {user ? (
        <div className="mt-3 rounded-lg border border-white/10 p-3">
          {myOfficial ? (
            <p className="text-sm text-neon">Verified host · {myOfficial.orgName || myOfficial.displayName}</p>
          ) : myRequest?.status === "pending" ? (
            <p className="text-sm text-slate-300">Badge request pending review.</p>
          ) : myRequest?.status === "declined" ? (
            <p className="mb-2 text-sm text-rose-300">Previous request declined. You can submit again.</p>
          ) : null}
          {!myOfficial && myRequest?.status !== "pending" ? (
            <div className="grid gap-2">
              <input className="rounded border border-white/15 bg-transparent px-2 py-1.5 text-sm text-white" value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Org / host name" maxLength={60} />
              <textarea className="rounded border border-white/15 bg-transparent px-2 py-1.5 text-sm text-white" rows={2} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Why should GrindInfo verify this desk?" maxLength={400} />
              <button type="button" disabled={busy} onClick={submit} className="w-fit rounded-md border border-neon/40 bg-neon/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-neon disabled:opacity-40">
                {busy ? "Sending…" : "Request official host badge"}
              </button>
            </div>
          ) : null}
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
                    Scrims
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
                <p className="m-0 text-xs text-slate-500">{row.displayName || row.uid} · {row.message || "No note"}</p>
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
