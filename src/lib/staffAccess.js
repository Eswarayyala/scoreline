/** Owner publishes immediately. Support can fill the same desks; those writes wait for owner approval unless Direct is granted. */
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
  "libraryView",
];

/** Capabilities that can be Propose (queue) or Direct (live write). */
export const SUPPORT_MODE_CAPABILITIES = [
  "vaultEdit",
  "vaultDelete",
  "blogReview",
  "archiveDecide",
  "blogPromote",
];

export const SUPPORT_PERMISSION_LABELS = {
  vaultEdit: "Vault / windows / scrims edit",
  vaultDelete: "CMS deletes",
  blogReview: "Blog publish / decline",
  archiveDecide: "Vault archive approve / reject",
  blogPromote: "Promote published blog → vault",
  reportsTriage: "Reports triage (change status)",
  libraryView: "View media library (no manage)",
};

/** Safer defaults for new grants; missing keys on old docs merge to these. */
export const DEFAULT_SUPPORT_PERMISSIONS = {
  vaultEdit: true,
  vaultDelete: false,
  blogReview: true,
  archiveDecide: true,
  blogPromote: true,
  reportsTriage: true,
  libraryView: true,
  vaultEditMode: "propose",
  vaultDeleteMode: "propose",
  blogReviewMode: "propose",
  archiveDecideMode: "propose",
  blogPromoteMode: "propose",
};

const ACTION_PERMISSION = {
  cms_upsert: "vaultEdit",
  cms_delete: "vaultDelete",
  blog_review: "blogReview",
  archive_decision: "archiveDecide",
  blog_promote: "blogPromote",
};

export function modeKeyForPermission(key) {
  return `${key}Mode`;
}

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

export function supportWritesDirect(role, permissions, key) {
  return isSiteSupportRole(role) && supportAccessMode(permissions, key) === "direct";
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
  SUPPORT_MODE_CAPABILITIES.forEach((key) => {
    const modeKey = modeKeyForPermission(key);
    const mode = String(raw[modeKey] || next[modeKey] || "propose").toLowerCase();
    next[modeKey] = mode === "direct" ? "direct" : "propose";
    if (!next[key]) next[modeKey] = "propose";
  });
  return next;
}

export function supportHas(permissions, key) {
  const perms = normalizeSupportPermissions(permissions);
  return perms[key] === true;
}

export function supportAccessMode(permissions, key) {
  if (!SUPPORT_MODE_CAPABILITIES.includes(key)) return null;
  if (!supportHas(permissions, key)) return null;
  const perms = normalizeSupportPermissions(permissions);
  return perms[modeKeyForPermission(key)] === "direct" ? "direct" : "propose";
}

export function permissionForSupportAction(action) {
  return ACTION_PERMISSION[String(action || "")] || null;
}

export function supportCanProposeAction(permissions, action) {
  if (!isAllowedSupportAction(action)) return false;
  const key = permissionForSupportAction(action);
  if (!key) return false;
  if (!supportHas(permissions, key)) return false;
  return supportAccessMode(permissions, key) !== "direct";
}

export function supportCanDirectAction(permissions, action) {
  if (!isAllowedSupportAction(action)) return false;
  const key = permissionForSupportAction(action);
  if (!key) return false;
  return supportAccessMode(permissions, key) === "direct";
}

function sanitizeImageField(value) {
  const raw = String(value || "");
  if (!raw) return "";
  if (raw.startsWith("data:image/") && raw.length > SUPPORT_IMAGE_MAX_CHARS) {
    throw new Error("Poster image is too large for a support request. Use an https URL or a media library asset.");
  }
  if (raw.length > SUPPORT_IMAGE_MAX_CHARS) {
    throw new Error("Image field exceeds the support change size limit.");
  }
  return raw;
}

function sanitizeEditionImages(edition = {}) {
  const next = { ...edition };
  if (next.poster != null) next.poster = sanitizeImageField(next.poster);
  if (Array.isArray(next.images)) {
    next.images = next.images.map((src) => sanitizeImageField(src)).filter(Boolean).slice(0, 6);
  }
  if (Array.isArray(next.flyers)) {
    next.flyers = next.flyers.map((src) => sanitizeImageField(src)).filter(Boolean).slice(0, 6);
  }
  return next;
}

/** Cap poster / image payloads before support queues a change. */
export function sanitizeSupportChangePayload(action, payload = {}) {
  if (!payload || typeof payload !== "object") return {};
  const next = { ...payload };
  if (action === "cms_upsert") {
    if (next.poster != null) next.poster = sanitizeImageField(next.poster);
    if (next.avatar != null) next.avatar = sanitizeImageField(next.avatar);
    if (Array.isArray(next.flyers)) {
      next.flyers = next.flyers.map((src) => sanitizeImageField(src)).filter(Boolean).slice(0, 6);
    }
    if (Array.isArray(next.editions)) {
      next.editions = next.editions.map((edition) => sanitizeEditionImages(edition));
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
