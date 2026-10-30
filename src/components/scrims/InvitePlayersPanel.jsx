import { useMemo, useState } from "react";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "../../firebase";
import ShareFlyerBar from "./ShareFlyerBar";

function Button({ children, variant = "primary", disabled, ...props }) {
  const base = "inline-flex items-center justify-center rounded-md px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest disabled:opacity-40";
  const styles = variant === "ghost"
    ? "border border-white/15 text-slate-300"
    : "border border-neon/40 bg-neon/10 text-neon";
  return <button type="button" disabled={disabled} className={`${base} ${styles}`} {...props}>{children}</button>;
}

export default function InvitePlayersPanel({
  tournament,
  friends = [],
  invites = [],
  onInvite,
  closed = false,
}) {
  const [tab, setTab] = useState("friends");
  const [friendUid, setFriendUid] = useState("");
  const [search, setSearch] = useState("");
  const [found, setFound] = useState([]);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState("");

  const eventInvites = useMemo(
    () => invites.filter((item) => item.tournamentId === tournament.id),
    [invites, tournament.id],
  );

  const selectedFriend = friends.find((friend) => friend.uid === friendUid);
  const existingFor = (uid) => eventInvites.find((invite) => invite.inviteeUid === uid);

  if (closed) {
    return (
      <section className="mt-4 rounded-xl border border-white/10 bg-slate-950/60 p-4">
        <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Invite players</p>
        <p className="mt-2 text-sm text-slate-500">Invites are closed for this scrim.</p>
      </section>
    );
  }

  const send = async (player) => {
    if (!player?.uid) return;
    setMessage("");
    try {
      await onInvite?.(player);
      setMessage(`Invite sent to ${player.name || player.displayName}`);
    } catch (issue) {
      setMessage(issue?.message || "Couldn't send invite");
    }
  };

  const runSearch = async () => {
    const raw = search.trim();
    if (raw.length < 2) {
      setMessage("Enter at least 2 characters.");
      return;
    }
    setSearching(true);
    setMessage("");
    try {
      const tag = raw.includes("#") ? raw.split("#").pop()?.trim() : "";
      let rows = [];
      if (tag && /^\d{4}$|^\d{8}$/.test(tag)) {
        const snap = await getDocs(query(collection(db, "players"), where("playerTag", "==", tag), limit(8)));
        rows = snap.docs.map((item) => ({ uid: item.id, ...item.data(), name: item.data().displayName }));
      } else {
        const snap = await getDocs(query(collection(db, "players"), where("discoverable", "==", true), limit(40)));
        const needle = raw.toLowerCase();
        rows = snap.docs
          .map((item) => ({ uid: item.id, ...item.data(), name: item.data().displayName }))
          .filter((player) => String(player.displayName || "").toLowerCase().includes(needle) || String(player.handle || "").toLowerCase().includes(needle))
          .slice(0, 12);
      }
      setFound(rows);
      if (!rows.length) setMessage("No discoverable players matched.");
    } catch {
      setMessage("Search failed. Try again.");
    } finally {
      setSearching(false);
    }
  };

  return (
    <section className="mt-4 rounded-xl border border-white/10 bg-slate-950/60 p-4">
      <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Invite players</p>
      <h3 className="m-0 font-display text-2xl text-white">Friends &amp; Find players</h3>
      <p className="mt-1 text-xs text-slate-500">Invite GrindInfo players. On invite-only scrims they can see the event and join after accepting.</p>
      <ShareFlyerBar tournament={tournament} compact />

      <div className="mt-3 flex gap-2">
        <Button variant={tab === "friends" ? "primary" : "ghost"} onClick={() => setTab("friends")}>Friends</Button>
        <Button variant={tab === "find" ? "primary" : "ghost"} onClick={() => setTab("find")}>Find players</Button>
      </div>

      {tab === "friends" ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {friends.length === 0 ? (
            <p className="text-sm text-slate-500">Add friends first, or search Find players.</p>
          ) : (
            <>
              <select className="min-w-[12rem] rounded border border-white/15 bg-transparent px-2 py-1.5 text-sm text-white" value={friendUid} onChange={(e) => setFriendUid(e.target.value)}>
                <option value="">Choose a friend</option>
                {friends.map((friend) => (
                  <option key={friend.uid} value={friend.uid}>{friend.name}{friend.playerTag ? ` · #${friend.playerTag}` : ""}</option>
                ))}
              </select>
              <Button
                disabled={!selectedFriend || ["pending", "accepted"].includes(existingFor(friendUid)?.status)}
                onClick={() => send(selectedFriend)}
              >
                {existingFor(friendUid)?.status === "pending" ? "Invite pending" : existingFor(friendUid)?.status === "accepted" ? "Invite accepted" : "Send invite"}
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="mt-3 grid gap-2">
          <div className="flex flex-wrap gap-2">
            <input
              className="min-w-[12rem] flex-1 rounded border border-white/15 bg-transparent px-2 py-1.5 text-sm text-white"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name or Name#1234"
            />
            <Button disabled={searching} onClick={runSearch}>{searching ? "Searching…" : "Search"}</Button>
          </div>
          <div className="grid gap-1">
            {found.map((player) => {
              const existing = existingFor(player.uid);
              return (
                <div key={player.uid} className="flex items-center justify-between gap-2 rounded border border-white/10 px-2 py-1.5">
                  <span className="text-sm text-slate-200">{player.name || player.displayName}{player.playerTag ? ` · #${player.playerTag}` : ""}</span>
                  <Button
                    disabled={["pending", "accepted"].includes(existing?.status)}
                    onClick={() => send({ uid: player.uid, name: player.name || player.displayName })}
                  >
                    {existing?.status === "pending" ? "Pending" : existing?.status === "accepted" ? "Accepted" : "Invite"}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {message ? <p className="mt-2 text-xs text-slate-400">{message}</p> : null}

      {eventInvites.length > 0 ? (
        <div className="mt-3 border-t border-white/10 pt-2">
          <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Sent · {eventInvites.length}</p>
          {eventInvites.slice(0, 8).map((invite) => (
            <p key={invite.id} className="mt-1 text-xs text-slate-400">{invite.inviteeName} · {invite.status}</p>
          ))}
        </div>
      ) : null}
    </section>
  );
}
