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

/** Live circuitCms delete: owner only. Support may still propose cms_delete. */
export function canDeleteCircuitLive(role) {
  return isSiteOwnerRole(role);
}

export function canProposeCmsDelete(role) {
  return isSiteOwnerRole(role) || isSiteSupportRole(role);
}

export function isAllowedSupportAction(action) {
  return SUPPORT_CHANGE_ACTIONS.includes(String(action || ""));
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
