import { isInviteOnlyScrim, isPublicScrim, scrimAccessLabel, scrimIsPaid } from "./scrimAccess";

export function scrimDeskUrl(tournament, { origin, watch = false } = {}) {
  const base = origin || (typeof window !== "undefined" ? window.location.origin : "");
  const id = tournament?.id;
  if (!id) return base || "";
  return watch ? `${base}/tournaments/${id}/watch` : `${base}/tournaments/${id}`;
}

function formatShareDay(value) {
  if (!value) return "";
  const raw = String(value).trim();
  const dt = /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ? new Date(`${raw}T12:00:00`)
    : new Date(raw);
  if (Number.isNaN(dt.getTime())) return raw;
  return dt.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/** One line for share paste — collapses same-day ranges, human dates. */
export function scrimShareWhen(tournament = {}) {
  const start = formatShareDay(tournament.startDate);
  const end = formatShareDay(tournament.endDate);
  if (start && end && start === end) return start;
  if (start && end) return `${start} – ${end}`;
  return start || end || "";
}

/** Plain-text invite paste for Discord / WhatsApp / chat. */
export function scrimInviteCopy(tournament = {}, { origin, watch = false } = {}) {
  const url = scrimDeskUrl(tournament, { origin, watch });
  const access = scrimAccessLabel(tournament) || (isPublicScrim(tournament) ? "Public" : isInviteOnlyScrim(tournament) ? "Invite" : "Private");
  const prize = scrimIsPaid(tournament)
    ? `Prize ₹${Number(tournament.prizeAmount).toLocaleString()}`
    : "Free";
  const when = scrimShareWhen(tournament);
  const lines = [
    tournament.name || "GrindInfo scrim",
    [tournament.game, access, prize].filter(Boolean).join(" · "),
    when || null,
    tournament.adminDisplayName ? `Host ${tournament.adminDisplayName}` : null,
    isInviteOnlyScrim(tournament)
      ? "Invite only — open the link if you were invited, or ask the host."
      : isPublicScrim(tournament)
        ? "Public desk — join from GrindInfo."
        : "Private desk — request a seat from the host.",
    url,
  ].filter(Boolean);
  return lines.join("\n");
}

export function scrimShareLabel(tournament = {}) {
  if (isInviteOnlyScrim(tournament)) return "Copy invite";
  if (isPublicScrim(tournament)) return "Copy flyer link";
  return "Copy desk link";
}

export function canShareFlyerImage(tournament = {}) {
  return isPublicScrim(tournament) || isInviteOnlyScrim(tournament) || tournament?.published === true;
}
