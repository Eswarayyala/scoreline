import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { auth, db, storage } from "../firebase";
import { bannerForGame } from "../data/platformShowcase";
import { SITE_COLLECTION_KINDS, siteCollectionId, tournamentCollectionId } from "../data/mediaCollections";

const COLLECTIONS = "mediaCollections";

function uid() {
  return auth.currentUser?.uid || "";
}

function basePayload(record = {}) {
  return {
    scope: record.scope || "site",
    kind: record.kind || "background",
    game: record.game || "",
    tournamentId: record.tournamentId || "",
    title: String(record.title || record.game || "Collection").slice(0, 80),
    defaultUrl: record.defaultUrl || "",
    coverUrl: record.coverUrl || record.defaultUrl || "",
    createdBy: record.createdBy || uid(),
    ...(record.generated ? { generated: true } : {}),
    ...(Array.isArray(record.hiddenAssetIds) ? { hiddenAssetIds: record.hiddenAssetIds } : {}),
    ...(Array.isArray(record.purgedAssetIds) ? { purgedAssetIds: record.purgedAssetIds } : {}),
    ...(Array.isArray(record.pickerBlockedIds) ? { pickerBlockedIds: record.pickerBlockedIds } : {}),
  };
}

/** Owner: keep an avatar in the library but hide it from the profile avatar grid. */
export async function setAvatarPickerBlocked(collectionRecord, assetId, blocked) {
  if (!collectionRecord?.id || !assetId) return;
  const current = new Set(collectionRecord.pickerBlockedIds || []);
  if (blocked) current.add(assetId);
  else current.delete(assetId);
  await upsertMediaCollection(
    collectionRecord.id,
    { pickerBlockedIds: [...current].slice(0, 120) },
    collectionRecord,
  );
}

export async function upsertMediaCollection(id, patch = {}, record = {}) {
  const refDoc = doc(db, COLLECTIONS, id);
  const existing = await getDoc(refDoc);
  if (!existing.exists()) {
    const payload = {
      ...basePayload(record),
      ...patch,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: uid(),
    };
    await setDoc(refDoc, payload);
    return { id, ...payload };
  }
  await updateDoc(refDoc, { ...patch, updatedAt: Date.now() });
  return { id, ...existing.data(), ...patch };
}

export async function ensureGameCollections(game, actorUid = uid()) {
  const titleGame = String(game || "").trim();
  if (!titleGame) return [];
  const created = [];
  const defaultUrl = bannerForGame(titleGame);
  await Promise.all(SITE_COLLECTION_KINDS.map(async (kind) => {
    const id = siteCollectionId(titleGame, kind.id);
    const payload = {
      scope: "site",
      kind: kind.id,
      game: titleGame,
      tournamentId: "",
      title: `${titleGame} · ${kind.label}`,
      defaultUrl,
      updatedAt: Date.now(),
      createdBy: actorUid,
    };
    const refDoc = doc(db, COLLECTIONS, id);
    const existing = await getDoc(refDoc);
    if (!existing.exists()) {
      await setDoc(refDoc, { ...payload, createdAt: Date.now(), coverUrl: defaultUrl });
    }
    created.push({ id, ...payload });
  }));
  return created;
}

export async function createMediaCollection({ scope, kind, game, tournamentId = "", title, defaultUrl = "" }) {
  const actor = uid();
  const id = scope === "tournament"
    ? `${tournamentCollectionId(tournamentId, title)}-${Date.now().toString(36)}`
    : `${siteCollectionId(game, kind)}-${Date.now().toString(36)}`;
  const payload = {
    scope,
    kind,
    game: game || "",
    tournamentId: scope === "tournament" ? tournamentId : "",
    title: String(title || `${game} · ${kind}`).slice(0, 80),
    defaultUrl: defaultUrl || bannerForGame(game),
    coverUrl: defaultUrl || bannerForGame(game),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    createdBy: actor,
  };
  await setDoc(doc(db, COLLECTIONS, id), payload);
  return { id, ...payload };
}

export async function updateMediaCollection(id, patch) {
  await updateDoc(doc(db, COLLECTIONS, id), { ...patch, updatedAt: Date.now() });
}

export async function deleteMediaCollection(id) {
  const assets = await getDocs(collection(db, COLLECTIONS, id, "assets"));
  await Promise.all(assets.docs.map((item) => deleteMediaAsset(id, { id: item.id, ...item.data() })));
  await deleteDoc(doc(db, COLLECTIONS, id));
}

function fileToCompressedDataUrl(file, maxChars = 450000, maxEdge = 1400) {
  return new Promise((resolve, reject) => {
    if (!file?.type?.startsWith("image/")) {
      reject(new Error("Choose an image file."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result || "");
      const image = new Image();
      image.onload = () => {
        const scale = Math.min(1, maxEdge / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const ctx = canvas.getContext("2d");
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        let quality = 0.8;
        let out = canvas.toDataURL("image/jpeg", quality);
        while (out.length > maxChars && quality > 0.4) {
          quality -= 0.08;
          out = canvas.toDataURL("image/jpeg", quality);
        }
        if (out.length > maxChars) reject(new Error("Image is still too large after compression."));
        else resolve(out);
      };
      image.onerror = () => reject(new Error("Could not read that image."));
      image.src = src;
    };
    reader.onerror = () => reject(new Error("Could not read that image."));
    reader.readAsDataURL(file);
  });
}

export async function uploadMediaFiles(collectionRecord, files) {
  const actor = uid();
  const list = [...files].filter((file) => file?.type?.startsWith("image/"));
  const uploaded = [];
  const target = collectionRecord.generated
    ? await upsertMediaCollection(collectionRecord.id, {}, collectionRecord)
    : collectionRecord;
  for (const file of list) {
    const safeName = String(file.name || "image").replace(/[^\w.\-]+/g, "_").slice(0, 80);
    const storagePath = target.scope === "tournament"
      ? `media/tournaments/${target.tournamentId}/${target.id}/${Date.now()}-${safeName}`
      : `media/site/${target.id}/${Date.now()}-${safeName}`;
    let url = "";
    let path = storagePath;
    let contentType = file.type;
    let bytes = Number(file.size) || 0;
    try {
      const fileRef = ref(storage, storagePath);
      await uploadBytes(fileRef, file, { contentType: file.type });
      url = await getDownloadURL(fileRef);
    } catch {
      // Spark / no Storage: keep a compressed data URL in Firestore
      url = await fileToCompressedDataUrl(file);
      path = `inline/${target.id}/${Date.now()}-${safeName}`;
      contentType = "image/jpeg";
      bytes = url.length;
    }
    const asset = {
      url,
      path,
      name: safeName,
      contentType,
      bytes,
      createdAt: Date.now(),
      createdBy: actor,
      isDefault: false,
      // Site library uploads stay staff-only until assigned onto a public event.
      // Tournament host uploads stay public so lobby cards can load them.
      visibility: target.scope === "tournament" ? "public" : "staff",
    };
    const saved = await addDoc(collection(db, COLLECTIONS, target.id, "assets"), asset);
    uploaded.push({ id: saved.id, ...asset });
  }
  if (uploaded[0] && !String(collectionRecord.coverUrl || "").includes("firebasestorage")) {
    await setCollectionCover(target.id, uploaded[0].url, target);
  }
  return uploaded;
}

/** Soft-delete: seeded packs hide via hiddenAssetIds; uploads get trashed flags. */
export async function deleteMediaAsset(collectionId, asset, collectionRecord = null) {
  if (asset?.seeded || String(collectionId || "").startsWith("generated-")) {
    const record = collectionRecord || { id: collectionId };
    const hidden = [...new Set([...(record.hiddenAssetIds || []), asset.id].filter(Boolean))];
    const nextCover = record.coverUrl === asset.url ? (record.defaultUrl || "") : undefined;
    await upsertMediaCollection(collectionId, {
      hiddenAssetIds: hidden,
      ...(nextCover !== undefined ? { coverUrl: nextCover } : {}),
    }, record);
    return;
  }
  const assetRef = doc(db, COLLECTIONS, collectionId, "assets", asset.id);
  await updateDoc(assetRef, { trashed: true, trashedAt: Date.now() });
  if (collectionRecord?.coverUrl === asset.url) {
    await upsertMediaCollection(collectionId, { coverUrl: collectionRecord.defaultUrl || "" }, collectionRecord);
  }
}

export async function restoreMediaAsset(collectionRecord, assetId, asset = null) {
  if (asset && !asset.seeded && asset.id) {
    await updateDoc(doc(db, COLLECTIONS, collectionRecord.id, "assets", asset.id), {
      trashed: false,
      trashedAt: 0,
    });
    return;
  }
  const hidden = (collectionRecord.hiddenAssetIds || []).filter((id) => id !== assetId);
  await upsertMediaCollection(collectionRecord.id, { hiddenAssetIds: hidden }, collectionRecord);
}

/** Permanently remove a binned asset (seeded stay hidden forever; uploads leave Storage). */
export async function purgeMediaAsset(collectionId, asset, collectionRecord = null) {
  if (asset?.seeded || String(collectionId || "").startsWith("generated-")) {
    const record = collectionRecord || { id: collectionId };
    const hidden = [...new Set([...(record.hiddenAssetIds || []), asset.id].filter(Boolean))];
    const purged = [...new Set([...(record.purgedAssetIds || []), asset.id].filter(Boolean))];
    await upsertMediaCollection(collectionId, {
      hiddenAssetIds: hidden,
      purgedAssetIds: purged.slice(0, 64),
    }, record);
    return;
  }
  if (asset?.path) {
    try { await deleteObject(ref(storage, asset.path)); } catch { /* already gone */ }
  }
  await deleteDoc(doc(db, COLLECTIONS, collectionId, "assets", asset.id));
}

export async function setCollectionCover(collectionId, url, collectionRecord = null) {
  await upsertMediaCollection(collectionId, { coverUrl: url }, collectionRecord || { id: collectionId, coverUrl: url });
}

/** Rename an uploaded library asset (seeded packs have no Firestore name doc). */
export async function renameMediaAsset(collectionId, assetId, name) {
  if (!collectionId || !assetId) throw new Error("Missing asset.");
  if (String(collectionId).startsWith("generated-")) {
    throw new Error("Generated pack images can’t be renamed — upload a copy first.");
  }
  await updateDoc(doc(db, COLLECTIONS, collectionId, "assets", assetId), {
    name: String(name || "image").replace(/[^\w.\-]+/g, "_").slice(0, 80),
    updatedAt: Date.now(),
  });
}

/**
 * Move an uploaded asset into another site kind pack for the same game.
 * Soft-deletes the source (bin) after copying.
 */
export async function moveMediaAsset(fromCollection, asset, toKind) {
  if (!fromCollection?.id || !asset?.id) throw new Error("Missing asset.");
  if (asset.seeded || String(fromCollection.id).startsWith("generated-")) {
    throw new Error("Generated pack images can’t change category — upload a copy first.");
  }
  const kind = String(toKind || "").trim();
  if (!kind || kind === fromCollection.kind) return fromCollection;
  const game = fromCollection.game || "";
  await ensureGameCollections(game);
  const targetId = siteCollectionId(game, kind);
  const target = await upsertMediaCollection(
    targetId,
    {},
    {
      id: targetId,
      scope: "site",
      kind,
      game,
      title: `${game} · ${kind}`,
      defaultUrl: fromCollection.defaultUrl || "",
      coverUrl: fromCollection.coverUrl || "",
      generated: true,
    },
  );
  const payload = {
    url: asset.url,
    path: asset.path || "",
    name: asset.name || asset.id,
    contentType: asset.contentType || "image/jpeg",
    bytes: Number(asset.bytes) || 0,
    createdAt: Date.now(),
    createdBy: uid(),
    isDefault: false,
    movedFrom: fromCollection.id,
  };
  await addDoc(collection(db, COLLECTIONS, target.id, "assets"), payload);
  await deleteMediaAsset(fromCollection.id, asset, fromCollection);
  return target;
}
