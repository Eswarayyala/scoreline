/** Owner publishes immediately. Support can fill the same desks; those writes wait for owner approval. */
export const CMS_WRITE_ROLES = ["owner", "support"];

/** Actions support may propose; owner approval ignores anything else. */
export const SUPPORT_CHANGE_ACTIONS = [
  "cms_upsert",
  "cms_delete",
  "blog_review",
  "archive_decision",
  "blog_promote",
];

/** Max chars for a single image field in a support change payload (prefer https / library ids). */
export const SUPPORT_IMAGE_MAX_CHARS = 180000;

/** Toggleable support capabilities (owner never grants ban/popups/media-manage via these). */
export const SUPPORT_PERMISSION_KEYS = [
  "vaultEdit",
  "vaultDelete",
  "blogReview",
  "archiveDecide",
  "blogPromote",
  "reportsTriage",
  "supportSocials",
  "libraryView",
  "httpsPostersOnly",
];

export const SUPPORT_PERMISSION_LABELS = {
  vaultEdit: "Vault / windows / scrims edit (propose upsert + event posters)",
  vaultDelete: "Propose deletes (CMS remove)",
  blogReview: "Blog publish / decline (propose)",
  archiveDecide: "Vault archive request approve / reject (propose)",
  blogPromote: "Promote published blog → vault (propose)",
  reportsTriage: "Reports triage (change status)",
  supportSocials: "Edit support socials",
  libraryView: "View media library (no manage)",
  httpsPostersOnly: "HTTPS / library posters only (block data-URL uploads in proposals)",
};

/** Safer defaults for new grants; missing keys on old docs merge to these. */
export const DEFAULT_SUPPORT_PERMISSIONS = {
  vaultEdit: true,
  vaultDelete: false,
  blogReview: true,
  archiveDecide: true,
  blogPromote: true,
  reportsTriage: true,
  supportSocials: true,
  libraryView: true,
  httpsPostersOnly: true,
};

const ACTION_PERMISSION = {
  cms_upsert: "vaultEdit",
  cms_delete: "vaultDelete",
  blog_review: "blogReview",
  archive_decision: "archiveDecide",
  blog_promote: "blogPromote",
};

export function canWriteCircuitContent(role) {
  return CMS_WRITE_ROLES.includes(String(role || "").toLowerCase());
}

export function isSiteOwnerRole(role) {
  return String(role || "").toLowerCase() === "owner";
}

export function isSiteSupportRole(role) {
  return String(role || "").toLowerCase() === "support";
}

/** Site media packs: owner only (Firestore already enforces). */
export function canManageMediaLibrary(role) {
  return isSiteOwnerRole(role);
}

/** Live circuitCms delete: owner only. Support may still propose cms_delete when permitted. */
export function canDeleteCircuitLive(role) {
  return isSiteOwnerRole(role);
}

export function canProposeCmsDelete(role, permissions) {
  if (isSiteOwnerRole(role)) return true;
  if (!isSiteSupportRole(role)) return false;
  return supportHas(permissions, "vaultDelete");
}

export function isAllowedSupportAction(action) {
  return SUPPORT_CHANGE_ACTIONS.includes(String(action || ""));
}

export function normalizeSupportPermissions(input) {
  const raw = input && typeof input === "object" ? input : {};
  const next = { ...DEFAULT_SUPPORT_PERMISSIONS };
  SUPPORT_PERMISSION_KEYS.forEach((key) => {
    if (typeof raw[key] === "boolean") next[key] = raw[key];
  });
  return next;
}

export function supportHas(permissions, key) {
  const perms = normalizeSupportPermissions(permissions);
  return perms[key] === true;
}

export function permissionForSupportAction(action) {
  return ACTION_PERMISSION[String(action || "")] || null;
}

export function supportCanProposeAction(permissions, action) {
  if (!isAllowedSupportAction(action)) return false;
  const key = permissionForSupportAction(action);
  if (!key) return false;
  return supportHas(permissions, key);
}

function sanitizeImageField(value, { httpsOnly = false } = {}) {
  const raw = String(value || "");
  if (!raw) return "";
  if (httpsOnly && raw.startsWith("data:image/")) {
    throw new Error("This support account must use an https URL or media library asset for posters.");
  }
  if (raw.startsWith("data:image/") && raw.length > SUPPORT_IMAGE_MAX_CHARS) {
    throw new Error("Poster image is too large for a support request. Use an https URL or a media library asset.");
  }
  if (raw.length > SUPPORT_IMAGE_MAX_CHARS) {
    throw new Error("Image field exceeds the support change size limit.");
  }
  return raw;
}

function sanitizeEditionImages(edition = {}, options = {}) {
  const next = { ...edition };
  if (next.poster != null) next.poster = sanitizeImageField(next.poster, options);
  if (Array.isArray(next.images)) {
    next.images = next.images.map((src) => sanitizeImageField(src, options)).filter(Boolean).slice(0, 6);
  }
  if (Array.isArray(next.flyers)) {
    next.flyers = next.flyers.map((src) => sanitizeImageField(src, options)).filter(Boolean).slice(0, 6);
  }
  return next;
}

/** Cap poster / image payloads before support queues a change. */
export function sanitizeSupportChangePayload(action, payload = {}, permissions = null) {
  if (!payload || typeof payload !== "object") return {};
  const httpsOnly = permissions ? supportHas(permissions, "httpsPostersOnly") : false;
  const options = { httpsOnly };
  const next = { ...payload };
  if (action === "cms_upsert") {
    if (next.poster != null) next.poster = sanitizeImageField(next.poster, options);
    if (next.avatar != null) next.avatar = sanitizeImageField(next.avatar, options);
    if (Array.isArray(next.flyers)) {
      next.flyers = next.flyers.map((src) => sanitizeImageField(src, options)).filter(Boolean).slice(0, 6);
    }
    if (Array.isArray(next.editions)) {
      next.editions = next.editions.map((edition) => sanitizeEditionImages(edition, options));
    }
  }
  return next;
}

export function staffWriteGate(role) {
  return {
    canWrite: canWriteCircuitContent(role),
    role: role || "guest",
    authHook: "firebase-siteRoles",
  };
}
