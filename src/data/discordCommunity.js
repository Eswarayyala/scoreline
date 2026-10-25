/**
 * Soft Discord entry — invite URL only (no bot / FCM).
 * Set VITE_DISCORD_INVITE_URL to a discord.gg (or discord.com/invite) link.
 * Flip DISCORD_SURFACE when ready to air the Discord CTAs.
 */
export const DISCORD_SURFACE = false;

const CHANNEL_BY_GAME = {
  Valorant: "valorant",
  CS2: "cs2",
  "League of Legends": "league",
  "Dota 2": "dota2",
  "Apex Legends": "apex",
  "Overwatch 2": "overwatch",
  "Rocket League": "rocket-league",
  PUBG: "pubg",
  BGMI: "bgmi",
  "Mobile Legends: Bang Bang": "mlbb",
  "Free Fire": "free-fire",
  Fortnite: "fortnite",
  "Call of Duty": "cod",
  "Rainbow Six Siege": "r6",
  "Honor of Kings": "hok",
  "Street Fighter 6": "sf6",
  "Tekken 8": "tekken",
  "EA Sports FC": "ea-fc",
  "Teamfight Tactics": "tft",
  "StarCraft II": "sc2",
  Trackmania: "trackmania",
  Rennsport: "rennsport",
  Chess: "chess",
  Crossfire: "crossfire",
  "Standoff 2": "standoff-2",
  "Fatal Fury": "fatal-fury",
  "Clash Royale": "clash-royale",
  "Brawl Stars": "brawl-stars",
};

function slugChannel(game = "") {
  const known = CHANNEL_BY_GAME[game];
  if (known) return known;
  return String(game || "general")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32) || "general";
}

export function discordInviteUrl() {
  return String(import.meta.env.VITE_DISCORD_INVITE_URL || "").trim();
}

export function discordForGame(game = "") {
  const channel = slugChannel(game);
  const inviteUrl = discordInviteUrl();
  return {
    inviteUrl,
    channel,
    channelLabel: `#${channel}`,
    headline: game ? `${game} lobby` : "GrindInfo Discord",
    blurb: game
      ? `Voice, LFG, and post-match talk for ${game} — optional, outside the app.`
      : "Optional Discord for voice and LFG. Friends and flyers stay on GrindInfo.",
  };
}
