/** Site theme: light editorial · dark match-desk. Persisted in localStorage. */

export const THEME_STORAGE_KEY = "grindinfo-theme";

export const THEMES = ["light", "dark"];

export function isThemeId(value) {
  return value === "light" || value === "dark";
}

export function readStoredTheme() {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (isThemeId(raw)) return raw;
  } catch {
    /* private mode */
  }
  return null;
}

/** First visit: follow OS when practical; default dark match-desk. */
export function resolvePreferredTheme() {
  const stored = readStoredTheme();
  if (stored) return stored;
  try {
    if (window.matchMedia?.("(prefers-color-scheme: light)")?.matches) return "light";
  } catch {
    /* ignore */
  }
  return "dark";
}

export function applyTheme(themeId) {
  const theme = isThemeId(themeId) ? themeId : "dark";
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  root.style.colorScheme = theme;
  return theme;
}

export function persistTheme(themeId) {
  const theme = applyTheme(themeId);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* private mode */
  }
  return theme;
}

export function factsMuteStorageKey(uid) {
  return `grindinfo-mute-facts:${uid}`;
}

export function readFactsMuted(uid) {
  if (!uid) return false;
  try {
    return localStorage.getItem(factsMuteStorageKey(uid)) === "1";
  } catch {
    return false;
  }
}

export function writeFactsMuted(uid, muted) {
  if (!uid) return;
  try {
    if (muted) localStorage.setItem(factsMuteStorageKey(uid), "1");
    else localStorage.removeItem(factsMuteStorageKey(uid));
  } catch {
    /* private mode */
  }
}
