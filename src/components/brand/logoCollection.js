/** Logos from OneDrive Saved Pictures (LOGO / Logo 1 / Logo0). */

export const LOGO_STORAGE_KEY = "grindinfo-logo-id";

export const LOGO_OPTIONS = [
  {
    id: "console-final",
    label: "GrindInfo lockup",
    note: "Local upload · console + GRINDINFO wordmark",
    src: "/brand/collection/logo-new.png",
    markSrc: "/brand/collection/logo-new.png",
  },
  {
    id: "score-rail-black",
    label: "Score-rail mark",
    note: "Neon black G · blue score rail",
    src: "/brand/grindinfo-mark.svg",
    markSrc: "/brand/grindinfo-mark.svg",
  },
  {
    id: "wordmark-ring",
    label: "Ring wordmark",
    note: "Your Logo0 · chrome G + neon type",
    src: "/brand/collection/logo-c.png",
    markSrc: "/brand/collection/logo-c.png",
  },
  {
    id: "slash-blue-pink",
    label: "Angular G slash",
    note: "Sheet · concept 1 · electric blue + pink",
    src: "/brand/collection/grid/slash-blue-pink.png",
    markSrc: "/brand/collection/grid/slash-blue-pink.png",
  },
  {
    id: "shield-blue-pink",
    label: "Esports shield",
    note: "Sheet · concept 2 · blue + pink",
    src: "/brand/collection/grid/shield-blue-pink.png",
    markSrc: "/brand/collection/grid/shield-blue-pink.png",
  },
  {
    id: "console-blue-pink",
    label: "Console (sheet)",
    note: "Sheet · concept 3 · blue + pink",
    src: "/brand/collection/grid/console-blue-pink.png",
    markSrc: "/brand/collection/grid/console-blue-pink.png",
  },
  {
    id: "arena-blue-pink",
    label: "Circular arena",
    note: "Sheet · concept 4 · blue + pink",
    src: "/brand/collection/grid/arena-blue-pink.png",
    markSrc: "/brand/collection/grid/arena-blue-pink.png",
  },
];

/** Latest local upload (Downloads/new logo). */
export const DEFAULT_LOGO_ID = "console-final";
const LOGO_PICK_VERSION = "grindinfo-logo-pick-v6";
const LOGO_PICK_TOKEN = "6";

export function getLogoOption(id) {
  return (
    LOGO_OPTIONS.find((o) => o.id === id)
    || LOGO_OPTIONS.find((o) => o.id === DEFAULT_LOGO_ID)
    || LOGO_OPTIONS[0]
  );
}

export function readStoredLogoId() {
  try {
    // One-time lock-in so browsers that were forced onto the score-rail mark return to the original.
    if (localStorage.getItem(LOGO_PICK_VERSION) !== LOGO_PICK_TOKEN) {
      localStorage.setItem(LOGO_STORAGE_KEY, DEFAULT_LOGO_ID);
      localStorage.setItem(LOGO_PICK_VERSION, LOGO_PICK_TOKEN);
      return DEFAULT_LOGO_ID;
    }
    const id = localStorage.getItem(LOGO_STORAGE_KEY);
    if (id && LOGO_OPTIONS.some((o) => o.id === id)) return id;
  } catch {
    /* ignore */
  }
  return DEFAULT_LOGO_ID;
}

export function writeStoredLogoId(id) {
  try {
    localStorage.setItem(LOGO_STORAGE_KEY, id);
    localStorage.setItem(LOGO_PICK_VERSION, LOGO_PICK_TOKEN);
  } catch {
    /* ignore */
  }
}
