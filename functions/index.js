import { initializeApp } from "firebase-admin/app";
import { createHash } from "node:crypto";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getDatabase } from "firebase-admin/database";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { defineString } from "firebase-functions/params";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { onValueWritten } from "firebase-functions/v2/database";

initializeApp();
const db = getFirestore();
const RTDB_URL = defineString("GRINDINFO_RTDB_URL");
const WEB_API_KEY = defineString("GRINDINFO_WEB_API_KEY");
const rtdb = () => getDatabase(undefined, RTDB_URL.value());

export const trackActivePresence = onValueWritten("status/{uid}", async (event) => {
  const uid = event.params.uid;
  const after = event.data?.after.val();
  const changedAt = Number(after?.lastChanged) || Date.parse(event.time) || Date.now();
  const isActive = after?.state === "online" || after?.state === "away";
  const stateRef = db.doc(`presenceStates/${uid}`);
  const countRef = db.doc("systemCounters/onlinePlayers");
  await db.runTransaction(async (transaction) => {
    const [state, counter] = await Promise.all([transaction.get(stateRef), transaction.get(countRef)]);
    if (changedAt <= (Number(state.data()?.changedAt) || 0)) return;
    const wasActive = state.data()?.active === true;
    const currentCount = Math.max(0, Number(counter.data()?.count) || 0);
    const nextCount = Math.max(0, currentCount + (isActive === wasActive ? 0 : (isActive ? 1 : -1)));
    transaction.set(stateRef, { active: isActive, changedAt });
    transaction.set(countRef, { count: nextCount, updatedAt: Date.now() });
  });
});

export const getOnlinePlayerCount = onCall({ maxInstances: 5 }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in to check popup availability.");
  if ((await db.doc(`siteBans/${request.auth.uid}`).get()).data()?.active === true) {
    throw new HttpsError("permission-denied", "Banned accounts cannot use GrindInfo.");
  }
  const snapshot = await db.doc("systemCounters/onlinePlayers").get();
  return { count: Math.max(0, Number(snapshot.data()?.count) || 0) };
});

function normalizePlayerName(value) {
  const raw = String(value || "").trim();
  const name = (raw.includes("#") ? raw.slice(0, raw.indexOf("#")) : raw).trim().toLowerCase();
  return /^[a-z0-9_]{3,16}$/.test(name) ? name : "";
}

function handleDocId(name, tag) {
  return `${name}::${tag}`;
}

export const getOrCreatePlayerTag = onCall({ maxInstances: 5 }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in to get your GrindInfo ID.");
  const uid = request.auth.uid;
  const playerRef = db.doc(`players/${uid}`);
  const email = request.auth.token?.firebase?.sign_in_provider === "password"
    ? (request.auth.token?.email || "")
    : "";
  return db.runTransaction(async (transaction) => {
    const player = await transaction.get(playerRef);
    if (!player.exists) throw new HttpsError("failed-precondition", "Save your player profile before creating a GrindInfo ID.");
    const name = normalizePlayerName(player.data()?.displayName);
    if (!name) throw new HttpsError("failed-precondition", "Save a valid player name before creating a GrindInfo ID.");
    const existingTag = player.data()?.playerTag;
    const claim = async (tag) => {
      const handle = `${name}#${tag}`;
      const handleRef = db.doc(`handles/${handleDocId(name, tag)}`);
      const taken = await transaction.get(handleRef);
      if (taken.exists && taken.data()?.uid !== uid) return null;
      transaction.set(handleRef, { uid, handle, createdAt: Date.now() });
      if (email) {
        transaction.set(db.doc("handleSignInLookup/" + handleDocId(name, tag)), {
          uid, email, handle, updatedAt: Date.now(),
        });
      }
      transaction.update(playerRef, { playerTag: tag, handle });
      return { playerTag: tag, handle };
    };
    if (typeof existingTag === "string" && /^\d{4}$|^\d{8}$/.test(existingTag)) {
      const kept = await claim(existingTag);
      if (kept) return kept;
    }
    for (let attempt = 0; attempt < 32; attempt += 1) {
      const tag = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
      const claimed = await claim(tag);
      if (claimed) return claimed;
    }
    throw new HttpsError("already-exists", "That username plus code is taken. Choose another name.");
  });
});


function parseGrindInfoHandle(value) {
  const match = /^([a-z0-9_]{3,16})#(\d{4}|\d{8})$/i.exec(String(value || "").trim());
  return match ? { name: match[1].toLowerCase(), tag: match[2] } : null;
}

export const syncHandleSignInLookup = onCall({ enforceAppCheck: true, maxInstances: 5 }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in first.");
  const uid = request.auth.uid;
  const [playerSnap, userRecord] = await Promise.all([
    db.doc("players/" + uid).get(),
    getAuth().getUser(uid),
  ]);
  const player = playerSnap.data();
  const handle = parseGrindInfoHandle(player?.handle);
  const name = normalizePlayerName(player?.displayName);
  const email = userRecord.email || "";
  const hasPasswordProvider = userRecord.providerData.some((provider) => provider.providerId === "password");
  if (!playerSnap.exists || !handle || !name || !email || !hasPasswordProvider
      || handle.name !== name || handle.tag !== String(player?.playerTag || "")) {
    return { linked: false };
  }
  const handleRef = db.doc("handles/" + handleDocId(handle.name, handle.tag));
  const publicHandle = await handleRef.get();
  if (!publicHandle.exists || publicHandle.data()?.uid !== uid) {
    throw new HttpsError("failed-precondition", "The GrindInfo ID could not be verified.");
  }
  await db.doc("handleSignInLookup/" + handleDocId(handle.name, handle.tag)).set({
    uid, email, handle: player.handle, updatedAt: Date.now(),
  });
  return { linked: true };
});

export const signInWithHandle = onCall({ enforceAppCheck: true, maxInstances: 5 }, async (request) => {
  const parsed = parseGrindInfoHandle(request.data?.handle);
  const password = request.data?.password;
  if (!parsed || typeof password !== "string" || password.length < 6 || password.length > 128) {
    throw new HttpsError("invalid-argument", "Enter a valid GrindInfo ID and password.");
  }
  const handleId = handleDocId(parsed.name, parsed.tag);
  const lookupSnap = await db.doc("handleSignInLookup/" + handleId).get();
  const lookup = lookupSnap.data();
  if (!lookupSnap.exists || !lookup?.email || !lookup?.uid) {
    throw new HttpsError("failed-precondition", "Sign in with your account email once to link this GrindInfo ID.");
  }
  const response = await fetch(
    "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=" + encodeURIComponent(WEB_API_KEY.value()),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: lookup.email, password, returnSecureToken: false }),
      signal: AbortSignal.timeout(10000),
    },
  );
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.localId !== lookup.uid) {
    throw new HttpsError("unauthenticated", "The GrindInfo ID or password did not match.");
  }
  return { customToken: await getAuth().createCustomToken(lookup.uid) };
});

async function setFriendPresenceLink(firstUid, secondUid, connected) {
  const link = rtdb().ref(`friendConnections/${firstUid}/${secondUid}`);
  if (connected) await link.set(true);
  else await link.remove();
}

async function removeUserPresenceLinks(uid) {
  try {
    const [sent, received] = await Promise.all([
      db.collection("friendRequests").where("requesterId", "==", uid).get(),
      db.collection("friendRequests").where("recipientId", "==", uid).get(),
    ]);
    const friendUids = new Set([...sent.docs, ...received.docs]
      .filter((item) => item.data()?.status === "accepted")
      .map((item) => item.data().requesterId === uid ? item.data().recipientId : item.data().requesterId)
      .filter((friendUid) => typeof friendUid === "string" && friendUid !== uid));
    await Promise.all([
      rtdb().ref(`friendConnections/${uid}`).remove(),
      ...[...friendUids].map((friendUid) => setFriendPresenceLink(friendUid, uid, false)),
    ]);
  } catch (error) {
    // Account access is still disabled and Firestore rules block banned users if RTDB is not configured.
    console.warn("Could not clear presence links for a banned account.", error?.message);
  }
}

export const syncFriendPresenceLinks = onDocumentWritten("friendRequests/{requestId}", async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!after) return;
  const wasAccepted = before?.status === "accepted";
  const isAccepted = after.status === "accepted";
  if (wasAccepted === isAccepted) return;
  const firstUid = after.requesterId;
  const secondUid = after.recipientId;
  if (typeof firstUid !== "string" || typeof secondUid !== "string" || firstUid === secondUid) return;
  const [firstBan, secondBan] = await Promise.all([
    db.doc(`siteBans/${firstUid}`).get(),
    db.doc(`siteBans/${secondUid}`).get(),
  ]);
  const canAppearOnline = isAccepted && firstBan.data()?.active !== true && secondBan.data()?.active !== true;
  await Promise.all([
    setFriendPresenceLink(firstUid, secondUid, canAppearOnline),
    setFriendPresenceLink(secondUid, firstUid, canAppearOnline),
  ]);
});

export const syncMyFriendPresenceLinks = onCall({ maxInstances: 3 }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in to refresh your friends list.");
  if ((await db.doc(`siteBans/${request.auth.uid}`).get()).data()?.active === true) {
    throw new HttpsError("permission-denied", "Banned accounts cannot publish online presence.");
  }
  const friendUids = Array.isArray(request.data?.friendUids)
    ? [...new Set(request.data.friendUids.filter((uid) => typeof uid === "string" && uid.length <= 128 && uid !== request.auth.uid))].slice(0, 100)
    : [];
  const writes = [];
  for (const friendUid of friendUids) {
    const ids = [`${request.auth.uid}_${friendUid}`, `${friendUid}_${request.auth.uid}`];
    const snapshots = await Promise.all(ids.map((id) => db.doc(`friendRequests/${id}`).get()));
    const accepted = snapshots.some((snapshot) => snapshot.exists
      && snapshot.data()?.status === "accepted"
      && [snapshot.data()?.requesterId, snapshot.data()?.recipientId].includes(request.auth.uid)
      && [snapshot.data()?.requesterId, snapshot.data()?.recipientId].includes(friendUid));
    const friendBan = await db.doc(`siteBans/${friendUid}`).get();
    if (accepted && friendBan.data()?.active !== true) writes.push(setFriendPresenceLink(request.auth.uid, friendUid, true), setFriendPresenceLink(friendUid, request.auth.uid, true));
  }
  await Promise.all(writes);
  return { synced: friendUids.length };
});

/** When a host publishes a flyer, stamp a lightweight fan-out marker for client push/digest. */
export const onScrimAnnouncementWritten = onDocumentWritten("scrimAnnouncements/{announcementId}", async (event) => {
  const after = event.data?.after?.data();
  if (!after || after.published !== true) return;
  const before = event.data?.before?.data();
  if (before?.published === true && before?.publishedAt === after.publishedAt) return;
  const announcementId = event.params.announcementId;
  await db.doc(`scrimAnnouncementMeta/${announcementId}`).set({
    tournamentId: after.tournamentId || announcementId,
    tournamentName: String(after.tournamentName || "").slice(0, 120),
    game: String(after.game || "").slice(0, 60),
    hostUid: String(after.hostUid || "").slice(0, 128),
    hostName: String(after.hostName || "").slice(0, 40),
    joinMode: String(after.joinMode || "open").slice(0, 20),
    paid: after.paid === true,
    publishedAt: Number(after.publishedAt) || Date.now(),
    fanOutAt: Date.now(),
  }, { merge: true });
});

export const setPlayerBan = onCall({ maxInstances: 3 }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in to manage player access.");
  const actorUid = request.auth.uid;
  const role = await db.doc(`siteRoles/${actorUid}`).get();
  if (!role.exists || role.data()?.role !== "owner" || role.data()?.enabled !== true) {
    throw new HttpsError("permission-denied", "Only the enabled site owner can ban or restrict players.");
  }

  const targetUid = typeof request.data?.targetUid === "string" ? request.data.targetUid.trim() : "";
  const reportId = typeof request.data?.reportId === "string" ? request.data.reportId : "";
  const note = typeof request.data?.note === "string" ? request.data.note.trim().slice(0, 500) : "";
  const mode = request.data?.mode === "restrict" || request.data?.mode === "clear" || request.data?.mode === "ban"
    ? request.data.mode
    : (request.data?.active === true ? "ban" : "clear");
  if (!targetUid || targetUid.length > 128 || targetUid === actorUid) {
    throw new HttpsError("invalid-argument", "Choose a different player and specify whether to ban, restrict, or restore them.");
  }
  const targetRole = await db.doc(`siteRoles/${targetUid}`).get();
  if (targetRole.exists && targetRole.data()?.role === "owner" && targetRole.data()?.enabled === true) {
    throw new HttpsError("failed-precondition", "A site owner account cannot be banned or restricted from player reports.");
  }
  if (reportId && !/^[^/]{1,200}$/.test(reportId)) throw new HttpsError("invalid-argument", "Invalid report reference.");

  const auth = getAuth();
  const banRef = db.doc(`siteBans/${targetUid}`);
  const existingBan = await banRef.get();
  const existing = existingBan.data() || {};
  if (mode === "clear" && existing.active !== true && existing.restricted !== true) {
    throw new HttpsError("failed-precondition", "This player does not have an active GrindInfo ban or restriction.");
  }
  let targetAuthUser;
  try {
    targetAuthUser = await auth.getUser(targetUid);
    const disabled = mode === "ban" ? true : existing.disabledBeforeBan === true;
    await auth.updateUser(targetUid, { disabled });
    if (mode === "ban" || existing.active === true) await auth.revokeRefreshTokens(targetUid);
  } catch (error) {
    if (error?.code === "auth/user-not-found") throw new HttpsError("not-found", "That player account was not found.");
    throw new HttpsError("internal", "Could not update this player's account access.");
  }

  const now = Date.now();
  const auditRef = db.collection("staffActions").doc();
  const playerRef = db.doc(`players/${targetUid}`);
  const player = await playerRef.get();
  const batch = db.batch();
  const action = mode === "ban" ? "player_banned" : mode === "restrict" ? "player_restricted" : (existing.active === true ? "player_unbanned" : "player_unrestricted");
  batch.set(banRef, mode === "ban"
    ? { active: true, restricted: false, targetUid, reportId, note, actorUid, disabledBeforeBan: targetAuthUser.disabled === true, createdAt: existing.createdAt || now, updatedAt: now }
    : mode === "restrict"
      ? { active: false, restricted: true, targetUid, reportId, note, actorUid, createdAt: existing.createdAt || now, updatedAt: now }
      : { active: false, restricted: false, targetUid, reportId, note, actorUid, updatedAt: now, removedAt: now }, { merge: true });
  batch.set(auditRef, {
    action,
    targetType: "player",
    targetId: targetUid,
    targetLabel: mode === "ban" ? "Player access disabled" : mode === "restrict" ? "Player restricted" : "Player access restored",
    actorUid,
    actorName: "Site owner",
    summary: `${mode === "ban" ? "Banned" : mode === "restrict" ? "Restricted" : "Restored"} player ${targetUid}${note ? `: ${note}` : ""}`.slice(0, 240),
    createdAt: now,
  });
  if (mode === "restrict" && player.exists) {
    batch.update(playerRef, { discoverable: false, updatedAt: now });
  }
  if (reportId) {
    const reportRef = db.doc(`reports/${reportId}`);
    const report = await reportRef.get();
    if (report.exists && report.data()?.targetType === "player" && report.data()?.targetId === targetUid) {
      batch.update(reportRef, { status: "archived", reviewedAt: now });
    }
  }
  try {
    await batch.commit();
  } catch (error) {
    try { await auth.updateUser(targetUid, { disabled: targetAuthUser.disabled === true }); } catch {}
    throw new HttpsError("internal", "The audit record could not be saved, so the account change was rolled back.");
  }
  if (mode === "ban") await removeUserPresenceLinks(targetUid);
  return { active: mode === "ban", restricted: mode === "restrict", targetUid };
});

