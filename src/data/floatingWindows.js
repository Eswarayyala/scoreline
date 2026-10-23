export const FLOATING_FEATURES = [
  { id: "ewc", label: "EWC championship years" },
  { id: "research", label: "Game vaults" },
  { id: "blog", label: "Published blogs" },
  { id: "vault", label: "Custom vault cards" },
  { id: "tournament", label: "Managed tournaments" },
];

export const DEFAULT_FLOATING_POLICY = {
  ewc: true,
  research: true,
  blog: false,
  vault: false,
  tournament: false,
};

export const HOME_WINDOW_LIMIT = 7;

function slideYear(slide) {
  const editionYear = Number(slide?.editions?.[0]?.year || slide?.championship?.year || slide?.season || 0);
  if (editionYear) return editionYear;
  const match = String(slide?.title || slide?.season || "").match(/(20\d{2})/);
  return match ? Number(match[1]) : 0;
}

function slideGameKey(slide) {
  return String(slide?.game || slide?.fullName || slide?.title || slide?.slug || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Prefer newest years, keep one card per game, hard-cap for home / vault featured rail. */
export function curateHomeWindows(slides = [], limit = HOME_WINDOW_LIMIT) {
  const ranked = [...slides].sort((a, b) => {
    const yearDelta = slideYear(b) - slideYear(a);
    if (yearDelta) return yearDelta;
    return (Number(b.floatingPriority) || 0) - (Number(a.floatingPriority) || 0);
  });
  const picked = [];
  const games = new Set();
  for (const slide of ranked) {
    if (picked.length >= limit) break;
    const game = slideGameKey(slide) || slide.slug || slide.id;
    if (!game || games.has(game)) continue;
    games.add(game);
    picked.push(slide);
  }
  if (picked.length < limit) {
    for (const slide of ranked) {
      if (picked.length >= limit) break;
      const key = slide.slug || slide.id;
      if (!key || picked.some((item) => (item.slug || item.id) === key)) continue;
      picked.push(slide);
    }
  }
  return picked;
}

export function sortVaultCatalog(slides = []) {
  return [...slides].sort((a, b) => {
    const yearDelta = slideYear(b) - slideYear(a);
    if (yearDelta) return yearDelta;
    return String(a.title || a.game || "").localeCompare(String(b.title || b.game || ""));
  });
}

/** Home + vault featured rail: Live windows first, then fill with 2026→past game vaults (one per game). */
export function buildFeaturedWindows({ floating = [], research = [], limit = HOME_WINDOW_LIMIT } = {}) {
  const live = curateHomeWindows(
    floating.filter((slide) => slide.floating === true || slide.surface !== "ewc-window" || slideYear(slide) >= 2026),
    limit,
  );
  if (live.length >= limit) return live;
  const liveKeys = new Set(live.map((slide) => slide.slug || slide.id));
  const liveGames = new Set(live.map(slideGameKey).filter(Boolean));
  const fillers = sortVaultCatalog(research).filter((slide) => {
    const key = slide.slug || slide.id;
    if (!key || liveKeys.has(key)) return false;
    if (slide.surface === "ewc-window") return false;
    const year = slideYear(slide);
    if (year && year < 2026) return false;
    const game = slideGameKey(slide);
    if (game && liveGames.has(game)) return false;
    return true;
  });
  return curateHomeWindows([...live, ...fillers], limit);
}

export const FLOATING_POLICY_ID = "floating-policy";

export function floatingPolicyFromRecords(records = []) {
  const row = records.find((item) => item.id === FLOATING_POLICY_ID || item.surface === "floating-policy");
  return { ...DEFAULT_FLOATING_POLICY, ...(row?.features || {}) };
}

function overlayForWindow(slide, records = []) {
  return records.find((item) => (
    (item.surface === "ewc-window" || item.surface === slide.surface)
    && (item.slug === slide.slug || item.id === slide.slug || item.id === slide.id || (slide.championship?.key && item.championshipKey === slide.championship.key))
  ));
}

export function mergeEwcWindows(generated = [], records = []) {
  return generated.map((slide) => {
    const overlay = overlayForWindow(slide, records);
    if (!overlay) return slide;
    const championship =
      overlay.championship?.games?.length
        ? overlay.championship
        : slide.championship?.games?.length
          ? slide.championship
          : overlay.championship || slide.championship;
    return {
      ...slide,
      ...overlay,
      championship,
      slug: slide.slug,
      surface: "ewc-window",
      eventScope: "ewc",
      floating: overlay.floating === true && overlay.enabled !== false,
    };
  });
}

function dedupeSlides(slides = []) {
  const seen = new Set();
  return slides.filter((slide) => {
    const key = slide.slug || slide.id;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => (Number(b.floatingPriority) || 0) - (Number(a.floatingPriority) || 0));
}

export function assembleFloatingSlides({ policy = DEFAULT_FLOATING_POLICY, ewcWindows = [], records = [], blogSlides = [] }) {
  const slides = [];
  if (policy.ewc) {
    // Only windows explicitly Live (floating === true). Old EWC years default off.
    slides.push(...ewcWindows.filter((slide) => slide.floating === true && slide.enabled !== false));
  }
  if (policy.research) {
    slides.push(...records.filter((item) => (item.research || item.surface === "research") && item.floating === true).map((item) => ({ ...item, floating: true })));
  }
  if (policy.vault) {
    slides.push(...records.filter((item) => item.surface === "vault" && item.floating === true && item.enabled !== false).map((item) => ({ ...item, floating: true })));
  }
  if (policy.blog) {
    const overlays = records.filter((item) => item.surface === "blog-window" && item.floating === true);
    blogSlides.forEach((blog) => {
      const overlay = overlays.find((item) => item.blogId === blog.id || item.slug === blog.slug);
      if (blog.floating === true || overlay?.floating === true) slides.push({ ...blog, ...overlay, floating: true, surface: "blog" });
    });
  }
  if (policy.tournament) {
    slides.push(...records.filter((item) => item.surface === "tournament" && item.floating === true).map((item) => ({ ...item, floating: true })));
  }
  return dedupeSlides(slides);
}
