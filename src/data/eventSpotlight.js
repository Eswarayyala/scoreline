import { editionsNewestFirst } from "./esportsResearch";
import { isEwcEdition } from "./eventScope";

/** Must match EventTabs deep-link keys (`?event=`). */
export function editionEventKey(edition, index = 0) {
  return `${edition?.year}-${edition?.event}-${edition?.eventScope || ""}-${index}`;
}

/** Newest non-EWC edition in the same order EventTabs uses. */
export function pickSpotlightEdition(editions = []) {
  const ordered = editionsNewestFirst(editions || []);
  const index = ordered.findIndex((edition) => !isEwcEdition(edition));
  if (index < 0) return null;
  const edition = ordered[index];
  return {
    edition,
    index,
    key: editionEventKey(edition, index),
  };
}

/**
 * Deep-link into a focused EventTabs edition when the slide has seasons.
 * Live desks, EWC year windows, and blogs stay on the bare vault slug.
 */
export function vaultEventHref(slide = {}) {
  const slug = slide.slug;
  if (!slug) return "/vault";
  if (slide.eventStatus === "live" || slide.surface === "ewc-window" || slide.blog || slide.surface === "blog") {
    return `/vault/${slug}`;
  }
  const key = slide.spotlightEventKey || pickSpotlightEdition(slide.editions)?.key || "";
  if (key) return `/vault/${slug}?event=${encodeURIComponent(key)}`;
  return `/vault/${slug}`;
}

/**
 * One home/catalog window per game: spotlight a recent non-EWC event.
 * Opens `/vault/{slug}?event=…` so the vault lands on that edition.
 */
export function asEventSpotlight(slide = {}) {
  if (!slide || slide.surface === "ewc-window" || slide.blog || slide.surface === "blog") return null;
  const pick = pickSpotlightEdition(slide.editions);
  if (!pick) return null;
  const { edition, key } = pick;
  const champion =
    edition.champion
    || edition.payouts?.[0]?.team
    || edition.payouts?.[0]?.player
    || slide.winners
    || "";
  const runnerUp =
    edition.runnerUp
    || edition.payouts?.[1]?.team
    || edition.payouts?.[1]?.player
    || slide.runnerUps
    || "";

  const eventPoster =
    edition.poster
    || edition.posterUrl
    || (Array.isArray(edition.images) ? edition.images[0] : "")
    || "";

  const next = {
    ...slide,
    spotlight: true,
    spotlightEdition: edition,
    spotlightEventKey: key,
    title: slide.game || slide.title || "Vault",
    eventName: edition.event || "",
    season: edition.year || slide.season,
    eventScope: edition.eventScope || slide.eventScope,
    eventStatus: "completed",
    winners: champion,
    runnerUps: runnerUp,
    mvp: edition.mvp || slide.mvp || "",
    championPrize: edition.payouts?.[0]?.prize || "",
    prizePool: edition.prizePool || slide.prizePool || slide.peakPrizePool || "",
    // Keep edition poster on the window; do not fall back to the game vault banner here
    // (that overwrites official event art with generated / Unsplash game packs).
    poster: eventPoster || slide.poster || "",
    posterUrl: edition.posterUrl || "",
    posterSource: edition.posterSource || (eventPoster ? "event" : slide.posterSource || ""),
    images: Array.isArray(edition.images) ? edition.images : slide.images,
    eventPoster,
  };
  return {
    ...next,
    href: vaultEventHref(next),
  };
}
