import { generatedAssetPath, generatedPackName, GENERATED_PACKS } from "./generatedGameArt";
import { isStockBannerUrl } from "./platformShowcase";

function hashSeed(value = "") {
  let hash = 0;
  const raw = String(value || "");
  for (let index = 0; index < raw.length; index += 1) {
    hash = (hash * 31 + raw.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function packAsset(game, kind, index) {
  const pack = generatedPackName(game);
  if (!pack || !GENERATED_PACKS.includes(pack)) return "";
  return generatedAssetPath(pack, kind, index);
}

/** Champion / winner label from an event edition. */
export function eventWinnerOf(edition = {}) {
  return (
    edition.champion
    || edition.payouts?.[0]?.team
    || edition.payouts?.[0]?.player
    || edition.winner
    || edition.mvp
    || ""
  );
}

/** Short highlight beat used as the “moment” on event cards. */
export function eventMomentOf(edition = {}) {
  const highlights = edition.highlights || {};
  return (
    highlights.madeItLookEasy
    || edition.madeItLookEasy
    || highlights.clutchesAndRivalries
    || edition.clutchesAndRivalries
    || edition.bestClutches
    || ""
  );
}

export function eventMvpOf(edition = {}) {
  return String(edition.mvp || "").trim();
}

/**
 * Heuristic: solo / duo names read as players; org-style names as teams.
 * Used only to pick avatar vs poster pack art — not for display copy.
 */
export function eventWinnerLooksLikePlayer(name = "") {
  const raw = String(name || "").trim();
  if (!raw) return false;
  if (
    /\b(team|esports|gaming|clan|org|academy|sports|fc|club|nation|guild)\b/i.test(raw)
    || /\b(falcons|vitality|spirit|navi|natus|faze|g2|liquid|cloud9|c9|sentinels|optic|nrg|mouz|heroic|astralis|ence|furia|mibr|loud|drx|gen\.?g|t1|karmine|mongolz|aurora|unlimit|oblivion|baisha|fnatic|nip|big|og|evil geniuses|100 thieves)\b/i.test(raw)
  ) {
    return false;
  }
  const parts = raw.split(/\s+/).filter(Boolean);
  return parts.length <= 3 && raw.length <= 32;
}

/**
 * Poster for any vault event (EWC or otherwise).
 * Staff art first; else that game's pack art keyed by winner / MVP / moment
 * so cards stay unique — never the game's main vault banner alone.
 */
export function posterForEdition(edition = {}, { game: gameOverride = "" } = {}) {
  const staff = [
    edition.momentPoster,
    edition.winnerPoster,
    edition.posterUrl,
    edition.poster,
    ...(Array.isArray(edition.images) ? edition.images : []),
  ].find((url) => url && !isStockBannerUrl(url));
  if (staff) return staff;

  const winner = eventWinnerOf(edition);
  const mvp = eventMvpOf(edition);
  const moment = eventMomentOf(edition);
  const game = gameOverride || edition.game || "";
  const seed = [game, edition.year, edition.season, winner || mvp, moment.slice(0, 48), edition.event]
    .filter(Boolean)
    .join("|");
  const index = (hashSeed(seed || game || "event") % 3) + 1;

  const preferAvatar = eventWinnerLooksLikePlayer(winner) || eventWinnerLooksLikePlayer(mvp);
  if (preferAvatar) {
    return (
      packAsset(game, "avatar", index)
      || packAsset(game, "poster", index)
      || packAsset(game, "background", index)
      || ""
    );
  }
  return (
    packAsset(game, "poster", index)
    || packAsset(game, "background", index)
    || packAsset(game, "avatar", index)
    || ""
  );
}

/** @deprecated Prefer posterForEdition — kept for EWC call sites. */
export const posterForEwcEdition = posterForEdition;

export function ewcWinnerOf(edition) {
  return eventWinnerOf(edition);
}
export function ewcMomentOf(edition) {
  return eventMomentOf(edition);
}
export function ewcMvpOf(edition) {
  return eventMvpOf(edition);
}
export function ewcWinnerLooksLikePlayer(name) {
  return eventWinnerLooksLikePlayer(name);
}

/** Year-window hero: first title with a winner poster, else first game pack. */
export function posterForEwcChampionship(group = {}) {
  const games = Array.isArray(group.games) ? group.games : [];
  for (const edition of games) {
    const poster = posterForEdition(edition);
    if (poster) return poster;
  }
  return "";
}
