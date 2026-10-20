const GATE_DOC = "deskGate";
const SESSION_KEY = "grindinfo-desk-unlocked";
const SESSION_MS = 12 * 60 * 60 * 1000;

export function deskGateDocPath() {
  return ["siteSettings", GATE_DOC];
}

export async function hashDeskPassword(password) {
  const raw = String(password || "").trim();
  if (!raw || raw.length < 4 || raw.length > 64) {
    throw new Error("Use a desk password between 4 and 64 characters.");
  }
  const data = new TextEncoder().encode(`grindinfo-desk-v1:${raw}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function readDeskUnlock(role) {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.role !== role) return false;
    if (!Number.isFinite(parsed.at) || Date.now() - parsed.at > SESSION_MS) {
      sessionStorage.removeItem(SESSION_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function writeDeskUnlock(role) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ role, at: Date.now() }));
  } catch {
    /* private mode */
  }
}

export function clearDeskUnlock() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* private mode */
  }
}

export function hashFieldForRole(role) {
  return role === "owner" ? "ownerHash" : "supportHash";
}
