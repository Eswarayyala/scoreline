export const FLOATING_FEATURES = [
  { id: "ewc", label: "EWC championship years" },
  { id: "research", label: "Game vaults" },
  { id: "blog", label: "Published blogs" },
  { id: "vault", label: "Custom vault cards" },
  { id: "tournament", label: "Managed tournaments" },
];

export const DEFAULT_FLOATING_POLICY = {
  ewc: true,
  research: false,
  blog: false,
  vault: false,
  tournament: false,
};

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
      floating: overlay.floating !== false && overlay.enabled !== false,
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
    slides.push(...ewcWindows.filter((slide) => slide.floating !== false && slide.enabled !== false));
  }
  if (policy.research) {
    slides.push(...records.filter((item) => (item.research || item.surface === "research") && item.floating === true).map((item) => ({ ...item, floating: true })));
  }
  if (policy.vault) {
    slides.push(...records.filter((item) => item.surface === "vault" && item.floating !== false && item.enabled !== false).map((item) => ({ ...item, floating: true })));
  }
  if (policy.blog) {
    const overlays = records.filter((item) => item.surface === "blog-window" && item.floating !== false);
    blogSlides.forEach((blog) => {
      const overlay = overlays.find((item) => item.blogId === blog.id || item.slug === blog.slug);
      if (blog.floating || overlay) slides.push({ ...blog, ...overlay, floating: true, surface: "blog" });
    });
  }
  if (policy.tournament) {
    slides.push(...records.filter((item) => item.surface === "tournament" && item.floating === true).map((item) => ({ ...item, floating: true })));
  }
  return dedupeSlides(slides);
}
