import { isPublicScrim, scrimFlyerBadges, scrimIsPaid } from "./scrimAccess";
import { formatCheckInRosterLine, scrimRequiresCheckIn } from "./scrimAttendance";

function hasPostedResults(scrim = {}) {
  const results = scrim?.results;
  if (!results || typeof results !== "object") return false;
  return Boolean(
    results.champion
    || results.winner
    || (Array.isArray(results.standings) && results.standings.length)
    || (Array.isArray(results.placements) && results.placements.length),
  );
}

function isArchivedScrim(scrim = {}) {
  if (scrim.archived === true || scrim.status === "completed" || scrim.status === "closed") return true;
  const date = scrim.endDate || scrim.startDate;
  if (!date) return false;
  const cutoff = new Date(`${date}T23:59:59`).getTime() + 7 * 24 * 60 * 60 * 1000;
  return Number.isFinite(cutoff) && Date.now() > cutoff;
}

/**
 * Desk-facing phase for a scrim window: live / check-in / open / lobby / results.
 */
export function resolveScrimDeskPhase(scrim = {}) {
  const archived = isArchivedScrim(scrim);
  const statusRaw = String(scrim.status || "").toLowerCase();
  const regOpen = scrim.registrationOpen !== false && !archived;
  const needsCheckIn = scrimRequiresCheckIn(scrim);
  const slots = Number(scrim.maxSlots) || 0;
  const access = isPublicScrim(scrim) ? "Public" : String(scrim.joinMode || "") === "invite" ? "Invite" : "Private";
  const prize = scrimIsPaid(scrim) ? `₹${Number(scrim.prizeAmount).toLocaleString()}` : "";

  if (archived || statusRaw === "completed" || statusRaw === "closed") {
    const results = hasPostedResults(scrim);
    return {
      status: "completed",
      phase: "results",
      statusLabel: results ? "Results" : "Closed",
      ctaLabel: results ? "Open results" : "Open scrim",
      fact: results
        ? [scrim.results?.champion || scrim.results?.winner, prize].filter(Boolean).join(" · ") || "Final standings are up."
        : "This scrim is closed. Hosts can still share recaps from the desk.",
      accent: "slate",
    };
  }

  const rosterLine = formatCheckInRosterLine(scrim);

  if (statusRaw === "live") {
    if (needsCheckIn) {
      return {
        status: "checkin",
        phase: "checkin",
        statusLabel: "Check-in",
        ctaLabel: "I'm in",
        fact: [
          "Check-in open",
          rosterLine,
          access,
          slots ? `${slots} slots` : "",
          "Room codes unlock after you’re here",
        ].filter(Boolean).join(" · "),
        accent: "amber",
      };
    }
    return {
      status: "live",
      phase: "live",
      statusLabel: "Live",
      ctaLabel: "Enter lobby",
      fact: ["Lobby live", rosterLine, access, slots ? `${slots} slots` : "", prize].filter(Boolean).join(" · "),
      accent: "pink",
    };
  }

  if (regOpen) {
    return {
      status: "upcoming",
      phase: "open",
      statusLabel: "Open",
      ctaLabel: "Join scrim",
      fact: [
        "Registration open",
        rosterLine,
        access,
        slots ? `${slots} slots` : "",
        prize,
        needsCheckIn ? "Check-in before room codes" : "",
      ].filter(Boolean).join(" · "),
      accent: "neon",
    };
  }

  return {
    status: "upcoming",
    phase: "lobby",
    statusLabel: "Lobby",
    ctaLabel: "View scrim",
    fact: ["Registration closed", access, "Waiting on host"].filter(Boolean).join(" · "),
    accent: "blue",
  };
}

/** Access / prize / flyer chips — phase stays on the status pill. */
export function scrimDeskBadges(scrim = {}) {
  const phase = resolveScrimDeskPhase(scrim);
  const badges = scrimFlyerBadges(scrim).filter((badge) => badge.id !== "live-flyer");
  if (scrim.published === true && isPublicScrim(scrim) && phase.phase !== "results") {
    badges.push({ id: "live-flyer", label: "Flyer", tone: "blue" });
  }
  if (phase.phase === "checkin") {
    const roster = formatCheckInRosterLine(scrim);
    badges.push({
      id: "checkin",
      label: roster || "Codes after check-in",
      tone: "amber",
    });
  }
  return badges;
}

/** Build TournamentWindowCard slide fields for a scrim. */
export function scrimWindowSlide(scrim = {}, { currentUserId = null, currentUserName = "" } = {}) {
  const phase = resolveScrimDeskPhase(scrim);
  return {
    ...scrim,
    surface: "scrim",
    title: scrim.name,
    eventStatus: phase.status,
    statusLabel: phase.statusLabel,
    ctaLabel: phase.ctaLabel,
    fact: phase.fact,
    phaseAccent: phase.accent,
    kicker: `Hosted by ${scrim.adminDisplayName || (scrim.adminUserId === currentUserId ? currentUserName : "Scrim host")}`,
    region: [scrim.region, scrim.rankBand].filter(Boolean).join(" · ") || scrim.region,
    mode: isPublicScrim(scrim) ? "Public" : "Private",
    flyerBadges: scrimDeskBadges(scrim),
    teamCount: scrim.maxSlots || "",
    startAt: scrim.startDate,
    endAt: scrim.endDate,
    prizePool: Number(scrim.prizeAmount) > 0 ? `₹${Number(scrim.prizeAmount).toLocaleString()}` : "",
  };
}
