import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getDatabase } from "firebase-admin/database";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { defineString } from "firebase-functions/params";
import { onDocumentWritten } from "firebase-functions/v2/firestore";

initializeApp();
const db = getFirestore();
const RTDB_URL = defineString("GRINDINFO_RTDB_URL");
const rtdb = () => getDatabase(undefined, RTDB_URL.value());

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

export const setPlayerBan = onCall({ maxInstances: 3 }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in to manage player access.");
  const actorUid = request.auth.uid;
  const role = await db.doc(`siteRoles/${actorUid}`).get();
  if (!role.exists || role.data()?.role !== "owner" || role.data()?.enabled !== true) {
    throw new HttpsError("permission-denied", "Only the enabled site owner can ban or unban players.");
  }

  const targetUid = typeof request.data?.targetUid === "string" ? request.data.targetUid.trim() : "";
  const active = request.data?.active;
  const reportId = typeof request.data?.reportId === "string" ? request.data.reportId : "";
  const note = typeof request.data?.note === "string" ? request.data.note.trim().slice(0, 500) : "";
  if (!targetUid || targetUid.length > 128 || targetUid === actorUid || typeof active !== "boolean") {
    throw new HttpsError("invalid-argument", "Choose a different player and specify whether to ban or unban them.");
  }
  const targetRole = await db.doc(`siteRoles/${targetUid}`).get();
  if (targetRole.exists && targetRole.data()?.role === "owner" && targetRole.data()?.enabled === true) {
    throw new HttpsError("failed-precondition", "A site owner account cannot be banned from player reports.");
  }
  if (reportId && !/^[^/]{1,200}$/.test(reportId)) throw new HttpsError("invalid-argument", "Invalid report reference.");

  const auth = getAuth();
  const banRef = db.doc(`siteBans/${targetUid}`);
  const existingBan = await banRef.get();
  if (!active && (!existingBan.exists || existingBan.data()?.active !== true)) {
    throw new HttpsError("failed-precondition", "This player does not have an active GrindInfo ban.");
  }
  let targetAuthUser;
  try {
    targetAuthUser = await auth.getUser(targetUid);
    const disabled = active ? true : existingBan.data()?.disabledBeforeBan === true;
    await auth.updateUser(targetUid, { disabled });
    await auth.revokeRefreshTokens(targetUid);
  } catch (error) {
    if (error?.code === "auth/user-not-found") throw new HttpsError("not-found", "That player account was not found.");
    throw new HttpsError("internal", "Could not update this player's account access.");
  }

  const now = Date.now();
  const auditRef = db.collection("staffActions").doc();
  const batch = db.batch();
  batch.set(banRef, active
    ? { active: true, targetUid, reportId, note, actorUid, disabledBeforeBan: targetAuthUser.disabled === true, createdAt: now, updatedAt: now }
    : { active: false, targetUid, reportId, note, actorUid, updatedAt: now, removedAt: now }, { merge: true });
  batch.set(auditRef, {
    action: active ? "player_banned" : "player_unbanned",
    targetType: "player",
    targetId: targetUid,
    targetLabel: `Player access ${active ? "disabled" : "restored"}`,
    actorUid,
    actorName: "Site owner",
    summary: `${active ? "Banned" : "Unbanned"} player ${targetUid}${note ? `: ${note}` : ""}`.slice(0, 240),
    createdAt: now,
  });
  if (reportId) {
    const reportRef = db.doc(`reports/${reportId}`);
    const report = await reportRef.get();
    if (report.exists && report.data()?.targetType === "player" && report.data()?.targetId === targetUid) {
      batch.update(reportRef, { status: "closed", reviewedAt: now });
    }
  }
  try {
    await batch.commit();
  } catch (error) {
    try { await auth.updateUser(targetUid, { disabled: targetAuthUser.disabled === true }); } catch {}
    throw new HttpsError("internal", "The audit record could not be saved, so the account change was rolled back.");
  }
  if (active) await removeUserPresenceLinks(targetUid);
  return { active, targetUid };
});
