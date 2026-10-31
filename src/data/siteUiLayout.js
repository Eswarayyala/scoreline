/** Owner-controlled guest/user UI surfaces — nav vs home vs off. */

export const UI_LAYOUT_DOC = "uiLayout";
export const UI_PLACES = ["nav", "home", "both", "off"];

export const UI_SURFACES = [
  {
    id: "scrims",
    label: "Scrims",
    to: "/tournaments",
    pathPrefix: "/tournaments",
    copy: "Live and private scrim desk",
  },
  {
    id: "findPlayers",
    label: "Find players",
    to: "/find-players",
    pathPrefix: "/find-players",
    copy: "Matchmaking search",
  },
  {
    id: "vault",
    label: "Vault",
    to: "/vault",
    pathPrefix: "/vault",
    copy: "Esports archive and windows",
  },
  {
    id: "blog",
    label: "Community blog",
    to: "/blog",
    pathPrefix: "/blog",
    overlay: true,
    copy: "Guides and recaps",
  },
  {
    id: "games",
    label: "Games",
    to: "/games",
    pathPrefix: "/games",
    copy: "Game desks (home rail)",
  },
];

const DEFAULT_SURFACE = {
  scrims: { guest: true, user: true, place: "nav" },
  findPlayers: { guest: true, user: true, place: "nav" },
  vault: { guest: true, user: true, place: "home" },
  blog: { guest: true, user: true, place: "home" },
  games: { guest: true, user: true, place: "home" },
};

export function defaultUiLayout() {
  return {
    surfaces: structuredClone(DEFAULT_SURFACE),
    updatedAt: 0,
    updatedBy: "",
  };
}

function normalizePlace(value) {
  return UI_PLACES.includes(value) ? value : "off";
}

export function normalizeUiLayout(raw = {}) {
  const base = defaultUiLayout();
  const incoming = raw?.surfaces && typeof raw.surfaces === "object" ? raw.surfaces : {};
  const surfaces = {};
  for (const item of UI_SURFACES) {
    const row = incoming[item.id] || {};
    surfaces[item.id] = {
      guest: row.guest !== false,
      user: row.user !== false,
      place: normalizePlace(row.place ?? DEFAULT_SURFACE[item.id].place),
    };
  }
  return {
    surfaces,
    updatedAt: Number(raw.updatedAt) || 0,
    updatedBy: String(raw.updatedBy || ""),
  };
}

export function audienceVisible(row, signedIn) {
  if (!row) return false;
  return signedIn ? row.user !== false : row.guest !== false;
}

export function placeIncludes(row, spot) {
  if (!row || row.place === "off") return false;
  if (row.place === "both") return true;
  return row.place === spot;
}

/** Nav links for guest or signed-in audience (Home icon always first). */
export function navLinksFor(layout, signedIn) {
  const surfaces = normalizeUiLayout(layout).surfaces;
  const links = [{ id: "home", to: "/", label: "Home", end: true, icon: "home" }];
  for (const item of UI_SURFACES) {
    const row = surfaces[item.id];
    if (!audienceVisible(row, signedIn) || !placeIncludes(row, "nav")) continue;
    links.push({
      id: item.id,
      to: item.to,
      label: item.label,
      end: false,
      overlay: Boolean(item.overlay),
    });
  }
  return links;
}

/** Home hub tiles (not games rail / vault carousel). */
export function homeHubSectionsFor(layout, signedIn) {
  const surfaces = normalizeUiLayout(layout).surfaces;
  const kickers = {
    findPlayers: "Matchmaking",
    scrims: "Live desk",
    vault: "Archive",
    blog: "Community",
    games: "Desks",
  };
  return UI_SURFACES.filter((item) => {
    const row = surfaces[item.id];
    return audienceVisible(row, signedIn) && placeIncludes(row, "home") && item.id !== "games";
  }).map((item) => ({
    id: item.id,
    to: item.to,
    kicker: kickers[item.id] || "Explore",
    label: item.label,
    copy: item.copy,
    overlay: Boolean(item.overlay),
  }));
}

export function showGamesRail(layout, signedIn) {
  const row = normalizeUiLayout(layout).surfaces.games;
  return audienceVisible(row, signedIn) && placeIncludes(row, "home");
}

export function showVaultOnHome(layout, signedIn) {
  const row = normalizeUiLayout(layout).surfaces.vault;
  return audienceVisible(row, signedIn) && placeIncludes(row, "home");
}

export function canAccessSurface(layout, surfaceId, signedIn) {
  const row = normalizeUiLayout(layout).surfaces[surfaceId];
  if (!row) return true;
  if (row.place === "off") return false;
  return audienceVisible(row, signedIn);
}

export function layoutPayloadForSave(layout, uid) {
  const normalized = normalizeUiLayout(layout);
  return {
    surfaces: normalized.surfaces,
    updatedAt: Date.now(),
    updatedBy: String(uid || ""),
  };
}
