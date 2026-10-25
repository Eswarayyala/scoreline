import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  ROOM_CODE_PRESETS,
  SCRIM_STAGES,
  allocationUnits,
  autoAllocateUnits,
  flattenUnitPlayerIds,
  roomDisplayName,
  stageLabel,
} from "../../data/scrimRooms";
import { gameProcessLabel, internationalPathLabel } from "../../data/hostVerification";

function Button({ children, variant = "primary", ...props }) {
  const base = "inline-flex items-center justify-center rounded-md px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest disabled:opacity-40";
  const styles = variant === "ghost"
    ? "border border-white/15 text-slate-300 hover:border-white/30"
    : variant === "danger"
      ? "border border-rose-500/40 text-rose-300"
      : "border border-neon/40 bg-neon/10 text-neon";
  return <button type="button" className={`${base} ${styles}`} {...props}>{children}</button>;
}

export default function RoomStagesPanel({
  rooms = [],
  promotions = [],
  registrations = [],
  isAdmin = false,
  onAddRoom,
  onActivateRoom,
  onPromote,
  game = "",
  track = null,
}) {
  const [roomCode, setRoomCode] = useState("1");
  const [title, setTitle] = useState("");
  const [stage, setStage] = useState("group");
  const [capacity, setCapacity] = useState("16");
  const [lobbyId, setLobbyId] = useState("");
  const [lobbyPassword, setLobbyPassword] = useState("");
  const [openId, setOpenId] = useState("");
  const [selectedUnits, setSelectedUnits] = useState([]);
  const [allocMode, setAllocMode] = useState("manual");
  const [error, setError] = useState("");

  const ordered = useMemo(
    () => [...rooms].sort((a, b) => (a.index || 0) - (b.index || 0) || String(a.roomCode || "").localeCompare(String(b.roomCode || ""))),
    [rooms],
  );
  const active = ordered.find((room) => room.status === "active");
  const units = useMemo(
    () => allocationUnits(registrations, { roomId: active?.id || "" }),
    [registrations, active?.id],
  );

  const addRoom = async () => {
    setError("");
    const code = roomCode.trim() || String(ordered.length + 1);
    try {
      await onAddRoom?.({
        roomCode: code,
        title: title.trim() || code,
        stage,
        capacity: Math.max(0, Math.min(256, Number(capacity) || 0)),
        index: ordered.length,
      });
      setTitle("");
      const nextPreset = ROOM_CODE_PRESETS.find((item) => !ordered.some((room) => room.roomCode === item) && item !== code);
      if (nextPreset) setRoomCode(nextPreset);
    } catch (issue) {
      setError(issue?.message || "Couldn't add room");
    }
  };

  const activate = async (room) => {
    setError("");
    const nextId = lobbyId.trim();
    const nextPassword = lobbyPassword.trim();
    if (!nextId || !nextPassword) {
      setError("Enter lobby room ID and password to activate.");
      return;
    }
    try {
      await onActivateRoom?.(room.id, { roomId: nextId, roomPassword: nextPassword });
      setLobbyId("");
      setLobbyPassword("");
      setOpenId(room.id);
    } catch (issue) {
      setError(issue?.message || "Couldn't activate room");
    }
  };

  const toggleUnit = (unitId) => {
    setSelectedUnits((list) => (list.includes(unitId) ? list.filter((id) => id !== unitId) : [...list, unitId]));
  };

  const allocate = async (toRoom, mode = allocMode) => {
    if (!active) {
      setError("Activate a source room first, or keep players unassigned for Room 1.");
      return;
    }
    setError("");
    let picked = units.filter((unit) => selectedUnits.includes(unit.id));
    if (mode === "auto") {
      picked = autoAllocateUnits(units, { capacity: Number(toRoom.capacity) || 0 });
    }
    const playerIds = flattenUnitPlayerIds(picked);
    if (!playerIds.length) {
      setError(mode === "auto" ? "No teams available to auto-allocate." : "Select at least one team / player.");
      return;
    }
    try {
      await onPromote?.({
        fromRoomId: active.id,
        toRoomId: toRoom.id,
        playerIds,
        mode,
        unitCount: picked.length,
      });
      setSelectedUnits([]);
    } catch (issue) {
      setError(issue?.message || "Couldn't allocate teams");
    }
  };

  return (
    <section className="mt-4 rounded-xl border border-white/10 bg-slate-950/60 p-4">
      <div className="mb-3">
        <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Multi-room stages</p>
        <h3 className="m-0 font-display text-2xl text-white">Rooms &amp; stages</h3>
        <p className="mt-1 text-xs text-slate-500">
          {game ? `${game} process` : "Game process"}: {internationalPathLabel(game) || "Group → Semis → Finals"}
          {game ? ` · ${gameProcessLabel(game)}` : ""}.
          Activate each stage; collapsing a room marks it complete. Post final results within 24 hours of the last room.
        </p>
        {track ? (
          <p className={`mt-2 font-mono text-[10px] uppercase tracking-widest ${track.complete ? "text-neon" : "text-slate-400"}`}>
            {track.complete
              ? `Complete ${track.game || game || "desk"} process`
              : track.missingStages?.length
                ? `Progress · need ${track.missingStages.join(", ")}`
                : track.reason || "In progress"}
            {track.resultsWithin24h ? " · results on time" : ""}
          </p>
        ) : null}
      </div>

      {isAdmin ? (
        <div className="mb-4 flex flex-wrap items-end gap-2">
          <label className="grid gap-1 font-mono text-[10px] uppercase tracking-widest text-slate-500">
            Room code
            <input
              list="scrim-room-codes"
              className="w-24 rounded border border-white/15 bg-transparent px-2 py-1.5 text-[12px] normal-case tracking-normal text-white"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              placeholder="1a"
            />
            <datalist id="scrim-room-codes">
              {ROOM_CODE_PRESETS.map((code) => <option key={code} value={code} />)}
            </datalist>
          </label>
          <label className="grid gap-1 font-mono text-[10px] uppercase tracking-widest text-slate-500">
            Label
            <input className="min-w-[8rem] rounded border border-white/15 bg-transparent px-2 py-1.5 text-[12px] normal-case tracking-normal text-white" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Optional title" />
          </label>
          <label className="grid gap-1 font-mono text-[10px] uppercase tracking-widest text-slate-500">
            Stage
            <select className="rounded border border-white/15 bg-transparent px-2 py-1.5 text-[12px] normal-case tracking-normal text-white" value={stage} onChange={(e) => setStage(e.target.value)}>
              {SCRIM_STAGES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>
          <label className="grid gap-1 font-mono text-[10px] uppercase tracking-widest text-slate-500">
            Capacity
            <input type="number" min="0" max="256" className="w-20 rounded border border-white/15 bg-transparent px-2 py-1.5 text-[12px] normal-case tracking-normal text-white" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
          </label>
          <Button onClick={addRoom}>Add room</Button>
        </div>
      ) : null}

      {error ? <p className="mb-3 text-sm text-rose-300">{error}</p> : null}

      {ordered.length === 0 ? (
        <p className="text-sm text-slate-500">{isAdmin ? "Add Group first, then Semis, Survival if your game needs it, then Finals." : "Host has not set up staged rooms yet."}</p>
      ) : (
        <div className="grid gap-2">
          {ordered.map((room) => {
            const expanded = openId === room.id || room.status === "active";
            const roomPromos = promotions.filter((row) => row.toRoomId === room.id);
            const assigned = registrations.filter((row) => row.status === "approved" && row.currentRoomId === room.id);
            return (
              <div key={room.id} className={`overflow-hidden rounded-lg border ${room.status === "active" ? "border-neon/40" : "border-white/10"}`}>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
                  onClick={() => setOpenId((id) => (id === room.id ? "" : room.id))}
                >
                  {expanded ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronRight size={14} className="text-slate-500" />}
                  <span className="font-display text-xl text-white">{roomDisplayName(room)}</span>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-slate-400">{stageLabel(room.stage)}</span>
                  <span className="ml-auto font-mono text-[10px] uppercase tracking-widest text-slate-500">
                    {room.status}
                    {room.capacity ? ` · cap ${room.capacity}` : ""}
                    {assigned.length ? ` · ${assigned.length} in` : ""}
                  </span>
                </button>
                {expanded ? (
                  <div className="border-t border-white/10 px-3 py-3">
                    {room.status === "collapsed" ? (
                      <p className="text-xs text-slate-500">Collapsed when the next room went live.</p>
                    ) : null}
                    {room.status === "active" && room.roomId ? (
                      <p className="mb-2 font-mono text-[11px] text-slate-300">Lobby live for this stage · codes posted</p>
                    ) : null}
                    {assigned.length ? (
                      <p className="mb-2 text-xs text-slate-400">
                        Allocated: {assigned.map((row) => row.displayName || row.playerId).slice(0, 12).join(", ")}
                        {assigned.length > 12 ? ` +${assigned.length - 12}` : ""}
                      </p>
                    ) : null}

                    {isAdmin && room.status === "pending" ? (
                      <div className="mb-3 grid gap-2 sm:grid-cols-2">
                        <input className="rounded border border-white/15 bg-transparent px-2 py-1.5 text-sm text-white" placeholder="In-game room ID" value={openId === room.id ? lobbyId : ""} onChange={(e) => { setOpenId(room.id); setLobbyId(e.target.value); }} />
                        <input className="rounded border border-white/15 bg-transparent px-2 py-1.5 text-sm text-white" placeholder="Password" value={openId === room.id ? lobbyPassword : ""} onChange={(e) => { setOpenId(room.id); setLobbyPassword(e.target.value); }} />
                        <Button onClick={() => activate(room)}>Activate &amp; publish lobby</Button>
                      </div>
                    ) : null}

                    {isAdmin && room.status === "pending" && (active || units.length) ? (
                      <div className="mt-2 rounded-lg border border-white/10 p-3">
                        <div className="mb-2 flex flex-wrap gap-2">
                          <Button variant={allocMode === "manual" ? "primary" : "ghost"} onClick={() => setAllocMode("manual")}>Manual</Button>
                          <Button variant={allocMode === "auto" ? "primary" : "ghost"} onClick={() => setAllocMode("auto")}>Auto fill</Button>
                        </div>
                        <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-slate-500">
                          Allocate to {roomDisplayName(room)} from {active ? roomDisplayName(active) : "unassigned / prior"}
                        </p>
                        {allocMode === "manual" ? (
                          <div className="mb-2 flex max-h-40 flex-wrap gap-1 overflow-y-auto">
                            {units.length === 0 ? (
                              <span className="text-xs text-slate-500">No approved teams in the active room yet.</span>
                            ) : units.map((unit) => (
                              <button
                                key={unit.id}
                                type="button"
                                onClick={() => toggleUnit(unit.id)}
                                className={`rounded-full border px-2 py-1 font-mono text-[10px] ${selectedUnits.includes(unit.id) ? "border-neon text-neon" : "border-white/15 text-slate-400"}`}
                              >
                                {unit.kind === "squad" ? "SQ " : ""}{unit.label}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="mb-2 text-xs text-slate-400">
                            Auto fills up to capacity ({room.capacity || "open"}) keeping squads together.
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2">
                          <Button
                            disabled={allocMode === "manual" && !selectedUnits.length}
                            onClick={() => allocate(room, allocMode)}
                          >
                            {allocMode === "auto" ? "Auto-allocate teams" : `Allocate selected (${selectedUnits.length})`}
                          </Button>
                        </div>
                      </div>
                    ) : null}

                    {roomPromos.length ? (
                      <div className="mt-3 border-t border-white/5 pt-2">
                        <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Allocation log</p>
                        {roomPromos.map((row) => (
                          <p key={row.id} className="mt-1 text-xs text-slate-400">
                            {(row.playerIds || []).length} players
                            {row.unitCount ? ` · ${row.unitCount} units` : ""}
                            {row.mode ? ` · ${row.mode}` : ""}
                            {row.at ? ` · ${new Date(row.at).toLocaleString()}` : ""}
                          </p>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
