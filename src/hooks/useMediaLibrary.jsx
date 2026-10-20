import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { collection, collectionGroup, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { FILTER_GAMES } from "../data/gameCatalog";
import { allGeneratedCollections, generatedAssetsFor } from "../data/generatedGameArt";

const MediaArtContext = createContext({ covers: {}, collections: [] });

function coverRank(url, generated) {
  if (!url) return 0;
  if (/firebasestorage|googleapis\.com/i.test(url)) return 3;
  if (generated || url.includes("/media/generated/")) return 2;
  return 1;
}

function coversFrom(rows = []) {
  const next = {};
  const ranks = {};
  rows.forEach((row) => {
    if (row.scope !== "site" || !row.game) return;
    const url = row.coverUrl || row.defaultUrl || "";
    if (!url) return;
    if (!next[row.game]) next[row.game] = {};
    const key = `${row.game}::${row.kind}`;
    const rank = coverRank(url, row.generated);
    if (rank >= (ranks[key] || 0)) {
      ranks[key] = rank;
      next[row.game][row.kind] = url;
    }
  });
  return next;
}

export function useMediaCovers() {
  const [covers, setCovers] = useState(() => coversFrom(allGeneratedCollections(FILTER_GAMES)));
  const [collections, setCollections] = useState(() => allGeneratedCollections(FILTER_GAMES));

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "mediaCollections"), (snap) => {
      const rows = snap.docs.map((item) => ({ id: item.id, ...item.data() }));
      const byId = new Map(allGeneratedCollections(FILTER_GAMES).map((item) => [item.id, item]));
      rows.forEach((row) => byId.set(row.id, { ...byId.get(row.id), ...row }));
      const merged = [...byId.values()];
      setCollections(merged);
      setCovers(coversFrom(merged));
    }, () => {
      setCollections(allGeneratedCollections(FILTER_GAMES));
    });
    return unsub;
  }, []);

  return { covers, collections };
}

export function MediaArtProvider({ children }) {
  const value = useMediaCovers();
  return <MediaArtContext.Provider value={value}>{children}</MediaArtContext.Provider>;
}

export function useMediaArt() {
  return useContext(MediaArtContext);
}

export function useGameBanner(game, fallback) {
  const { covers } = useMediaArt();
  const live = covers?.[game]?.background || covers?.[game]?.poster || covers?.[game]?.flyer;
  return live || fallback;
}

export function useCollectionAssets(collectionId) {
  const { collections } = useMediaArt();
  const row = (collections || []).find((item) => item.id === collectionId);
  const seeded = row?.generated ? row : null;
  const hidden = new Set(row?.hiddenAssetIds || []);
  const purged = new Set(row?.purgedAssetIds || []);
  const seedAssets = seeded
    ? generatedAssetsFor(seeded.game, seeded.kind).filter((asset) => !hidden.has(asset.id) && !purged.has(asset.id))
    : [];
  const hiddenSeedAssets = seeded
    ? generatedAssetsFor(seeded.game, seeded.kind)
      .filter((asset) => hidden.has(asset.id) && !purged.has(asset.id))
      .map((asset) => ({ ...asset, seeded: true }))
    : [];
  const [remote, setRemote] = useState([]);
  useEffect(() => {
    if (!collectionId) {
      setRemote([]);
      return undefined;
    }
    const unsub = onSnapshot(
      collection(db, "mediaCollections", collectionId, "assets"),
      (snap) => setRemote(
        snap.docs
          .map((item) => ({ id: item.id, ...item.data() }))
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)),
      ),
      () => setRemote([]),
    );
    return unsub;
  }, [collectionId]);
  const liveRemote = remote.filter((item) => !item.trashed && !hidden.has(item.id));
  const trashedRemote = remote.filter((item) => item.trashed === true);
  const visible = [
    ...seedAssets,
    ...liveRemote.filter((item) => !seedAssets.some((seed) => seed.url === item.url)),
  ];
  const binAssets = [...hiddenSeedAssets, ...trashedRemote];
  return { assets: visible, hiddenAssets: binAssets, binAssets, collection: row };
}

export function useCollectionsFor({ game, kinds, tournamentId, scope } = {}) {
  const { collections } = useMediaArt();
  return useMemo(() => (collections || []).filter((row) => {
    if (scope && row.scope !== scope) return false;
    if (tournamentId && row.tournamentId !== tournamentId) return false;
    if (game && String(row.game || "").toLowerCase() !== String(game).toLowerCase()) return false;
    if (kinds?.length && !kinds.includes(row.kind)) return false;
    return true;
  }), [collections, game, kinds, scope, tournamentId]);
}

export function useRemoteLibraryAssets() {
  const [remote, setRemote] = useState([]);
  useEffect(() => {
    const unsub = onSnapshot(
      collectionGroup(db, "assets"),
      (snap) => setRemote(
        snap.docs.map((item) => ({
          id: item.id,
          collectionId: item.ref.parent.parent?.id || "",
          ...item.data(),
        })),
      ),
      () => setRemote([]),
    );
    return unsub;
  }, []);
  return remote;
}

/** Flat library assets for the current game/kind filters (seeded packs + uploaded). */
export function useLibraryAssetIndex({ game = "", kind = "", tournamentId = "" } = {}) {
  const { collections } = useMediaArt();
  const remote = useRemoteLibraryAssets();

  return useMemo(() => {
    const visibleCollections = (collections || []).filter((row) => {
      if (tournamentId) return row.scope === "tournament" && row.tournamentId === tournamentId;
      if (kind === "host") return row.scope === "tournament";
      if (row.scope !== "site") return false;
      if (game && String(row.game || "").toLowerCase() !== String(game).toLowerCase()) return false;
      if (kind && kind !== "all" && row.kind !== kind) return false;
      return true;
    });
    const byId = new Map(visibleCollections.map((row) => [row.id, row]));
    const seeded = visibleCollections.flatMap((row) => {
      if (!row.generated) return [];
      const hidden = new Set(row.hiddenAssetIds || []);
      return generatedAssetsFor(row.game, row.kind)
        .filter((asset) => !hidden.has(asset.id))
        .map((asset) => ({
          ...asset,
          collectionId: row.id,
          game: row.game,
          kind: row.kind,
          collectionTitle: row.title,
          seeded: true,
        }));
    });
    const uploaded = remote
      .filter((asset) => byId.has(asset.collectionId) && !asset.trashed)
      .map((asset) => {
        const row = byId.get(asset.collectionId);
        const hidden = new Set(row.hiddenAssetIds || []);
        if (hidden.has(asset.id)) return null;
        return {
          ...asset,
          game: row.game,
          kind: row.kind,
          collectionTitle: row.title,
        };
      })
      .filter(Boolean);
    const merged = [...seeded];
    uploaded.forEach((asset) => {
      if (!merged.some((row) => row.url === asset.url && row.collectionId === asset.collectionId)) {
        merged.push(asset);
      }
    });
    return { assets: merged, collections: visibleCollections };
  }, [collections, game, kind, remote, tournamentId]);
}
