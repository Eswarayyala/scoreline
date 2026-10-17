/** Public scrims use free join (`joinMode: "open"`). Private require host approval. */
export function isPublicScrim(scrim) {
  return String(scrim?.joinMode || "") === "open";
}

export function isPrivateScrim(scrim) {
  return !isPublicScrim(scrim);
}

export function scrimAccessLabel(scrim) {
  return isPublicScrim(scrim) ? "Public" : "Private";
}

export function isApprovedRegistrant(registrations = [], uid) {
  if (!uid) return false;
  return registrations.some((row) => row.playerId === uid && row.status === "approved");
}

/** Room codes: public scrims → any signed-in viewer; private → approved joiners (and hosts in their own UI). */
export function canViewScrimRoom(scrim, { uid, registrations = [], isAdmin = false } = {}) {
  if (isAdmin) return true;
  if (!uid) return false;
  if (isPublicScrim(scrim)) return true;
  return isApprovedRegistrant(registrations, uid);
}

/** Stats / brackets / match details: public scrims, or private with host `publicStats`, or approved joiners. */
export function canViewScrimStats(scrim, { uid, registrations = [], isAdmin = false } = {}) {
  if (isAdmin) return true;
  if (isPublicScrim(scrim)) return true;
  if (scrim?.publicStats === true) return true;
  return isApprovedRegistrant(registrations, uid);
}
