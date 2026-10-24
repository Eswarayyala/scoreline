/** Public scrims use free join (`joinMode: "open"`). */
export function isPublicScrim(scrim) {
  return String(scrim?.joinMode || "") === "open";
}

/** Invite-only private events (hidden from public Scrims list). */
export function isInviteOnlyScrim(scrim) {
  return String(scrim?.joinMode || "") === "invite";
}

/** Private request or invite-only (not open). */
export function isPrivateScrim(scrim) {
  return !isPublicScrim(scrim);
}

export function scrimAccessLabel(scrim) {
  if (isPublicScrim(scrim)) return "Public";
  if (isInviteOnlyScrim(scrim)) return "Invite only";
  return "Private";
}

export function isApprovedRegistrant(registrations = [], uid) {
  if (!uid) return false;
  return registrations.some((row) => row.playerId === uid && row.status === "approved");
}

export function isScrimHost(scrim, uid) {
  if (!uid || !scrim) return false;
  if (scrim.adminUserId === uid) return true;
  return Array.isArray(scrim.coAdminUserIds) && scrim.coAdminUserIds.includes(uid);
}

/** Whether this user should see an invite-only / private event in the Scrims list. */
export function canSeeScrimInList(scrim, { uid, invites = [] } = {}) {
  if (!scrim) return false;
  if (!isInviteOnlyScrim(scrim)) return true;
  if (!uid) return false;
  if (isScrimHost(scrim, uid)) return true;
  return invites.some(
    (invite) =>
      invite.tournamentId === scrim.id
      && invite.inviteeUid === uid
      && (invite.status === "pending" || invite.status === "accepted"),
  );
}

/** Room codes: public → signed-in; invite/private → approved joiners (and hosts). */
export function canViewScrimRoom(scrim, { uid, registrations = [], isAdmin = false } = {}) {
  if (isAdmin) return true;
  if (!uid) return false;
  if (isPublicScrim(scrim)) return true;
  return isApprovedRegistrant(registrations, uid);
}

/** Stats / brackets / match details. */
export function canViewScrimStats(scrim, { uid, registrations = [], isAdmin = false } = {}) {
  if (isAdmin) return true;
  if (isPublicScrim(scrim)) return true;
  if (scrim?.publicStats === true) return true;
  return isApprovedRegistrant(registrations, uid);
}

export function scrimIsPaid(scrim) {
  return Number(scrim?.prizeAmount) > 0;
}
