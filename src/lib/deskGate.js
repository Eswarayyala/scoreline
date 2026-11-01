const GATE_DOC = "deskGate";
const SESSION_KEY = "grindinfo-desk-unlocked";
const SESSION_MS = 12 * 60 * 60 * 1000;
const LEGACY_PREFIX = "grindinfo-desk-v1:";
const PBKDF2_ITERATIONS = 210_000;

export function deskGateDocPath() {
  return ["siteSettings", GATE_DOC];
}

function bytesToHex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex) {
  const clean = String(hex || "");
  if (!clean || clean.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(clean)) {
    throw new Error("Invalid desk password salt.");
  }
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function normalizePassword(password) {
  return String(password || "").trim();
}

async function legacyHashDeskPassword(password) {
  const data = new TextEncoder().encode(`${LEGACY_PREFIX}${password}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return bytesToHex(buf);
}

async function pbkdf2Hash(password, saltHex) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: hexToBytes(saltHex),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    256,
  );
  return bytesToHex(bits);
}

/** Create a salted PBKDF2 hash for a new desk password. */
export async function createDeskPassword(password) {
  const raw = normalizePassword(password);
  if (!raw || raw.length < 8 || raw.length > 64) {
    throw new Error("Use a desk password between 8 and 64 characters.");
  }
  const salt = bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
  const hash = await pbkdf2Hash(raw, salt);
  return { hash, salt };
}

/** Verify against salted PBKDF2, or legacy unsalted SHA-256 if no salt is stored. */
export async function verifyDeskPassword(password, storedHash, storedSalt = "") {
  const raw = normalizePassword(password);
  const expected = String(storedHash || "");
  if (!raw || !expected) return false;
  if (storedSalt) {
    try {
      return (await pbkdf2Hash(raw, storedSalt)) === expected;
    } catch {
      return false;
    }
  }
  return (await legacyHashDeskPassword(raw)) === expected;
}

/** @deprecated Use createDeskPassword — returns hash only for older call sites. */
export async function hashDeskPassword(password) {
  const { hash } = await createDeskPassword(password);
  return hash;
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

export function saltFieldForRole(role) {
  return role === "owner" ? "ownerSalt" : "supportSalt";
}
