/**
 * In-app notification channel prefs (no FCM).
 * Stored on userPrefs alongside scrim alert fields.
 */

export const DEFAULT_NOTIFY_CHANNELS = {
  scrims: true,
  friends: true,
  chats: true,
  blogs: true,
};

export function normalizeNotifyPrefs(prefs = {}) {
  const chosen = prefs.notifyChannelsChosen === true;
  return {
    chosen,
    // Match ScrimBell: off until the player has chosen, then honor the toggle.
    scrims: chosen ? prefs.scrimAlertsEnabled !== false : false,
    friends: prefs.notifyFriends !== false,
    chats: prefs.notifyChats !== false,
    blogs: prefs.notifyBlogs !== false,
  };
}

/** Persistable body fragment for channel toggles. */
export function notifyPrefsWriteBody(channels = {}, extras = {}) {
  return {
    notifyChannelsChosen: channels.chosen === true || extras.notifyChannelsChosen === true,
    scrimAlertsEnabled: channels.scrims !== false,
    notifyFriends: channels.friends !== false,
    notifyChats: channels.chats !== false,
    notifyBlogs: channels.blogs !== false,
    ...extras,
  };
}
