import { isInviteOnlyScrim, isPublicScrim, scrimAccessLabel, scrimIsPaid } from "./scrimAccess";

export function scrimDeskUrl(tournament, { origin, watch = false } = {}) {
  const base = origin || (typeof window !== "undefined" ? window.location.origin : "");
  const id = tournament?.id;
  if (!id) return base || "";
  return watch ? `${base}/tournaments/${id}/watch` : `${base}/tournaments/${id}`;
}

/** Plain-text invite paste for Discord / WhatsApp / chat. */
export function scrimInviteCopy(tournament = {}, { origin, watch = false } = {}) {
  const url = scrimDeskUrl(tournament, { origin, watch });
  const access = scrimAccessLabel(tournament) || (isPublicScrim(tournament) ? "Public" : isInviteOnlyScrim(tournament) ? "Invite" : "Private");
  const prize = scrimIsPaid(tournament)
    ? `Prize ₹${Number(tournament.prizeAmount).toLocaleString()}`
    : "Free";
  const when = [tournament.startDate, tournament.endDate].filter(Boolean).join(" – ");
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
