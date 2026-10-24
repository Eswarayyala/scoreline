/** Reusable squad roster stored on userPrefs for one-tap scrim join. */

export function normalizeSavedSquad(prefs = {}) {
  const memberIds = Array.isArray(prefs.savedSquadMemberIds)
    ? [...new Set(prefs.savedSquadMemberIds.map(String).filter(Boolean))].slice(0, 7)
    : [];
  return {
    name: String(prefs.savedSquadName || "My squad").slice(0, 40),
    memberIds,
  };
}

export function savedSquadReady(squad, currentUid) {
  const mates = (squad?.memberIds || []).filter((id) => id && id !== currentUid);
  return mates.length >= 1;
}
