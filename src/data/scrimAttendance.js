/** Check-in / no-show helpers for approved registrants. */

export const ATTENDANCE = {
  pending: "pending",
  checkedIn: "checked_in",
  noShow: "no_show",
};

export function registrationAttendance(row) {
  const value = String(row?.attendance || ATTENDANCE.pending);
  if (value === ATTENDANCE.checkedIn || value === ATTENDANCE.noShow) return value;
  return ATTENDANCE.pending;
}

export function isPlayerCheckedIn(registrations = [], uid) {
  if (!uid) return false;
  const row = registrations.find((item) => item.playerId === uid && item.status === "approved");
  return registrationAttendance(row) === ATTENDANCE.checkedIn;
}

export function attendanceCounts(registrations = []) {
  const approved = registrations.filter((item) => item.status === "approved");
  return {
    approved: approved.length,
    checkedIn: approved.filter((item) => registrationAttendance(item) === ATTENDANCE.checkedIn).length,
    noShow: approved.filter((item) => registrationAttendance(item) === ATTENDANCE.noShow).length,
    pending: approved.filter((item) => registrationAttendance(item) === ATTENDANCE.pending).length,
  };
}

/** Hosts may require check-in before room codes unlock. Defaults on for private/invite. */
export function scrimRequiresCheckIn(scrim) {
  if (scrim?.requireCheckIn === true) return true;
  if (scrim?.requireCheckIn === false) return false;
  return String(scrim?.joinMode || "") !== "open";
}
