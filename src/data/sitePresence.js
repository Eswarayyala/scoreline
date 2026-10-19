export const SOCIAL_PLATFORMS = [
  { id: "instagram", label: "Instagram", host: /^(https:\/\/)?(www\.)?(instagram\.com)\//i, build: (v) => `https://instagram.com/${v}` },
  { id: "twitter", label: "X / Twitter", host: /^(https:\/\/)?(www\.)?(x\.com|twitter\.com)\//i, build: (v) => `https://x.com/${v}` },
  { id: "youtube", label: "YouTube", host: /^(https:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i, build: (v) => (v.startsWith("http") ? v : `https://youtube.com/@${v}`) },
  { id: "discord", label: "Discord", host: /^(https:\/\/)?(www\.)?(discord\.gg|discord\.com)\//i, build: (v) => (v.startsWith("http") ? v : `https://discord.gg/${v}`) },
  { id: "tiktok", label: "TikTok", host: /^(https:\/\/)?(www\.)?(tiktok\.com)\//i, build: (v) => `https://tiktok.com/@${v}` },
  { id: "twitch", label: "Twitch", host: /^(https:\/\/)?(www\.)?(twitch\.tv)\//i, build: (v) => `https://twitch.tv/${v}` },
];

const EMPTY_PROFILE = {
  label: "",
  instagram: "",
  twitter: "",
  youtube: "",
  discord: "",
  tiktok: "",
  twitch: "",
};

export function emptyPresenceProfile(label = "") {
  return { ...EMPTY_PROFILE, label };
}

export function normalizePresenceProfile(raw = {}, fallbackLabel = "") {
  const next = emptyPresenceProfile(fallbackLabel);
  next.label = String(raw.label || fallbackLabel || "").trim().slice(0, 60);
  SOCIAL_PLATFORMS.forEach(({ id, host, build }) => {
    const value = String(raw[id] || "").trim().slice(0, 300);
    if (!value) {
      next[id] = "";
      return;
    }
    if (/^https:\/\//i.test(value)) {
      next[id] = host.test(value) ? value : "";
      return;
    }
    const handle = value.replace(/^@/, "").replace(/^https?:\/\//i, "").split(/[/?#]/)[0];
    next[id] = handle ? build(handle) : "";
  });
  return next;
}

export function presenceLinks(profile) {
  if (!profile) return [];
  return SOCIAL_PLATFORMS.map((platform) => {
    const href = String(profile[platform.id] || "").trim();
    if (!href) return null;
    return { id: platform.id, label: platform.label, href };
  }).filter(Boolean);
}

export function serializePresenceProfile(profile, uid = "") {
  const clean = normalizePresenceProfile(profile);
  return {
    ...clean,
    updatedAt: Date.now(),
    updatedBy: String(uid || "").slice(0, 128),
  };
}
