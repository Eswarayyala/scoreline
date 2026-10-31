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
  const [friendMenuOpen, setFriendMenuOpen] = useState(false);
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
        <Button
          variant={tab === "friends" ? "primary" : "ghost"}
          onClick={() => {
            setTab("friends");
          }}
        >
          Friends
        </Button>
        <Button
          variant={tab === "find" ? "primary" : "ghost"}
          onClick={() => {
            setTab("find");
            setFriendMenuOpen(false);
          }}
        >
          Find players
        </Button>
      </div>

      {tab === "friends" ? (
        <div className="mt-3 grid gap-2">
          {friends.length === 0 ? (
            <p className="text-sm text-slate-500">Add friends first, or search Find players.</p>
          ) : (
            <>
              <p className="m-0 font-mono text-[10px] uppercase tracking-widest text-slate-500">
                Choose a friend · {friends.length}
              </p>
              <div className="relative">
                <button
                  type="button"
                  aria-haspopup="listbox"
                  aria-expanded={friendMenuOpen}
                  onClick={() => setFriendMenuOpen((open) => !open)}
                  className="flex w-full items-center justify-between gap-3 rounded-lg border border-white/15 bg-slate-950 px-3.5 py-2.5 text-left text-sm text-white"
                >
                  <span className="min-w-0 truncate">
                    {selectedFriend
                      ? `${selectedFriend.name || "Player"}${selectedFriend.playerTag ? ` · #${selectedFriend.playerTag}` : ""}`
                      : "Choose a friend"}
                  </span>
                  <span className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-slate-500">
                    {friendMenuOpen ? "Close" : "Open"}
                  </span>
                </button>
                {friendMenuOpen ? (
                  <div
                    role="listbox"
                    aria-label="Choose a friend"
                    className="absolute left-0 right-0 z-20 mt-1 max-h-48 overflow-y-auto rounded-lg border border-white/15 bg-slate-950 shadow-[0_12px_40px_rgba(0,0,0,0.55)]"
                  >
                    {friends.map((friend) => {
                      const selected = friend.uid === friendUid;
                      const status = existingFor(friend.uid)?.status;
                      return (
                        <button
                          key={friend.uid}
                          type="button"
                          role="option"
                          aria-selected={selected}
                          onClick={() => {
                            setFriendUid(friend.uid);
                            setFriendMenuOpen(false);
                          }}
                          className={`flex w-full items-center justify-between gap-3 border-b border-white/10 px-3.5 py-2.5 text-left text-sm last:border-b-0 ${
                            selected ? "bg-neon/15 text-white" : "bg-slate-950 text-slate-200 hover:bg-white/5"
                          }`}
                        >
                          <span className="min-w-0 truncate pl-0.5">
                            {friend.name || "Player"}
                            {friend.playerTag ? ` · #${friend.playerTag}` : ""}
                          </span>
                          {status ? (
                            <span className="shrink-0 font-mono text-[9px] uppercase tracking-widest text-slate-500">
                              {status}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
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
