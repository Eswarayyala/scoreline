export const SCRIM_STAGES = [
  { id: "group", label: "Group" },
  { id: "qualifiers", label: "Qualifiers" },
  { id: "round_of_16", label: "Round of 16" },
  { id: "quarters", label: "Quarterfinals" },
  { id: "semifinals", label: "Semifinals" },
  { id: "survival", label: "Survival" },
  { id: "finals", label: "Finals" },
  { id: "grand_finals", label: "Grand finals" },
  { id: "custom", label: "Custom" },
];

/** Map loose stage ids onto the international model keys. */
export function normalizeInternationalStage(stage = "") {
  const raw = String(stage || "").toLowerCase().trim().replace(/\s+/g, "_");
  if (!raw) return "";
  if (raw === "group" || raw === "groups" || raw === "qualifiers" || raw === "qualifier") return "group";
  if (raw === "round_of_16" || raw === "r16" || raw === "ro16") return "round_of_16";
  if (raw === "quarters" || raw === "quarterfinals" || raw === "quarter" || raw === "qf") return "quarters";
  if (raw === "semifinals" || raw === "semi" || raw === "semis" || raw === "sf") return "semifinals";
  if (raw === "survival" || raw === "survial" || raw === "survive") return "survival";
  if (raw === "finals" || raw === "final" || raw === "grand_finals" || raw === "grand_final" || raw === "gf") return "finals";
  return raw;
}

/** Whether a completed stage set satisfies a required stage (with common substitutes). */
export function stageSatisfiesRequirement(completedStages = [], required = "") {
  const set = new Set((completedStages || []).map(normalizeInternationalStage).filter(Boolean));
  const need = normalizeInternationalStage(required);
  if (!need) return false;
  if (set.has(need)) return true;
  if (need === "quarters" && set.has("round_of_16")) return true;
  if (need === "group" && (set.has("qualifiers") || set.has("group"))) return true;
  if (need === "finals" && (set.has("grand_finals") || set.has("finals"))) return true;
  return false;
}

export const ROOM_CODE_PRESETS = ["1", "1a", "1b", "2", "2a", "a1", "a2", "b1", "s1", "s2", "qf1", "sf1", "f1"];

export function stageLabel(stage = "") {
  return SCRIM_STAGES.find((item) => item.id === stage)?.label || stage || "Stage";
}

export function roomDisplayName(room = {}) {
  const code = String(room.roomCode || "").trim();
  const title = String(room.title || "").trim();
  const stage = stageLabel(room.stage);
  if (code && title && title.toLowerCase() !== code.toLowerCase()) return `${code} · ${title}`;
  if (code) return code;
  if (title) return title;
  return `Room ${(Number(room.index) || 0) + 1}`;
}

/** Group approved registrations into allocation units (squad stays together). */
export function allocationUnits(registrations = [], { roomId = "" } = {}) {
  const approved = registrations.filter((row) => row.status === "approved");
  const inRoom = roomId
    ? approved.filter((row) => !row.currentRoomId || row.currentRoomId === roomId)
    : approved;
  const used = new Set();
  const units = [];

  inRoom.forEach((row) => {
    const captain = row.playerId;
    if (!captain || used.has(captain)) return;
    if ((row.entryType === "squad" || row.entryType === "roster") && Array.isArray(row.squadMemberIds) && row.squadMemberIds.length > 1) {
      const members = [...new Set(row.squadMemberIds.map(String).filter(Boolean))];
      members.forEach((id) => used.add(id));
      const labelBase = row.entryType === "roster" && row.rosterName
        ? row.rosterName
        : (row.displayName || "Squad");
      units.push({
        id: `squad:${captain}`,
        kind: "squad",
        label: `${labelBase} (+${Math.max(0, members.length - 1)})`,
        playerIds: members,
      });
      return;
    }
    used.add(captain);
    units.push({
      id: `solo:${captain}`,
      kind: "solo",
      label: row.displayName || captain,
      playerIds: [captain],
    });
  });
  return units;
}

/**
 * Auto-pick units for the next room.
 * strategy: "fill" = first N by registration order until capacity
 *           "top" = same order (hosts can re-order later via manual)
 */
export function autoAllocateUnits(units = [], { capacity = 0, count = 0 } = {}) {
  const list = [...units];
  if (count > 0) return list.slice(0, count);
  if (capacity > 0) {
    const picked = [];
    let seats = 0;
    for (const unit of list) {
      const size = unit.playerIds?.length || 1;
      if (seats + size > capacity && picked.length) break;
      picked.push(unit);
      seats += size;
      if (seats >= capacity) break;
    }
    return picked;
  }
  return list;
}

export function flattenUnitPlayerIds(units = []) {
  return [...new Set(units.flatMap((unit) => unit.playerIds || []))];
}
