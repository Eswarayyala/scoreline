import { useEffect, useMemo, useState } from "react";
import { ImagePlus, Pencil, Plus, RotateCcw, Star, Trash2 } from "lucide-react";
import { FILTER_GAMES } from "../../data/gameCatalog";
import { SITE_COLLECTION_KINDS, TOURNAMENT_COLLECTION_KINDS, collectionKindLabel, siteCollectionId } from "../../data/mediaCollections";
import { useCollectionAssets, useLibraryAssetIndex, useLibraryBinIndex, useMediaArt } from "../../hooks/useMediaLibrary";
import { sortByRecency } from "../../lib/deskSort";
import StickyFilterBar from "../shared/StickyFilterBar";
import {
  createMediaCollection,
  deleteMediaAsset,
  deleteMediaCollection,
  ensureGameCollections,
  moveMediaAsset,
  purgeMediaAsset,
  renameMediaAsset,
  restoreMediaAsset,
  setAvatarPickerBlocked,
  setCollectionCover,
  uploadMediaFiles,
} from "../../services/mediaLibrary";
import DeskSortSelect from "./DeskSortSelect";

const inputClass = "w-full rounded-lg border border-white/15 bg-slate-950/80 px-3 py-2 text-sm text-white outline-none focus:border-neon";
const ALL_KIND = "all";

function AssetEditPanel({ asset, collection, games, onClose, onSaved, onError }) {
  const seeded = asset?.seeded || String(collection?.id || "").startsWith("generated-");
  const [name, setName] = useState(asset?.name || asset?.id || "");
  const [kind, setKind] = useState(collection?.kind || "poster");
  const [busy, setBusy] = useState("");

  const save = async () => {
    setBusy("save");
    try {
      if (!seeded && name.trim() && name.trim() !== asset.name) {
        await renameMediaAsset(collection.id, asset.id, name.trim());
      }
      if (!seeded && kind && kind !== collection.kind) {
        await moveMediaAsset(collection, asset, kind);
      }
      onSaved?.();
      onClose?.();
    } catch (issue) {
      onError?.(issue.message || "Could not update this image.");
    } finally {
      setBusy("");
    }
  };

  const toBin = async () => {
    setBusy("bin");
    try {
      await deleteMediaAsset(collection.id, asset, collection);
      onSaved?.();
      onClose?.();
    } catch (issue) {
      onError?.(issue.message || "Could not move this image to the bin.");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md space-y-3 rounded-2xl border border-white/15 bg-slate-950 p-4"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="font-mono text-[10px] uppercase tracking-widest text-neon">Edit image</p>
        <img src={asset.url} alt="" className="h-36 w-full rounded-xl object-cover" />
        <label className="grid gap-1 text-xs text-slate-400">
          Name
          <input
            className={inputClass}
            value={name}
            disabled={seeded || Boolean(busy)}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label className="grid gap-1 text-xs text-slate-400">
          Category
          <select
            className={inputClass}
            value={kind}
            disabled={seeded || Boolean(busy)}
            onChange={(event) => setKind(event.target.value)}
          >
            {SITE_COLLECTION_KINDS.map((item) => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>
        </label>
        {seeded && (
          <p className="text-[11px] text-amber-200/90">
            Generated pack images can only move to Bin. Upload a copy to rename or change category.
          </p>
        )}
        <p className="text-[11px] text-slate-500">{collection?.game || games?.[0] || "Game"} · {collectionKindLabel(collection?.kind)}</p>
        <div className="flex flex-wrap gap-2">
          {!seeded && (
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={save}
              className="rounded-full bg-neon px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-40"
            >
              {busy === "save" ? "Saving…" : "Save"}
            </button>
          )}
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={toBin}
            className="inline-flex items-center gap-1 rounded-full border border-rose-400/40 px-4 py-2 text-sm text-rose-300"
          >
            <Trash2 size={14} /> {busy === "bin" ? "…" : "Move to bin"}
          </button>
          <button type="button" onClick={onClose} className="rounded-full border border-white/15 px-4 py-2 text-sm text-slate-200">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MediaLibraryDesk({
  games = FILTER_GAMES,
  canManage = false,
  tournamentId = "",
  game = "",
  compact = false,
  currentPoster = "",
  onPickPoster,
}) {
  const { collections } = useMediaArt();
  const [activeGame, setActiveGame] = useState(tournamentId ? (game || "") : "");
  const [kind, setKind] = useState(tournamentId ? "poster" : ALL_KIND);
  const [openId, setOpenId] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const showAll = !tournamentId && kind === ALL_KIND;

  useEffect(() => {
    if (!canManage || tournamentId) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const names = games.filter((item) => item && item !== "Other");
        for (let index = 0; index < names.length; index += 8) {
          if (cancelled) return;
          await Promise.all(names.slice(index, index + 8).map((name) => ensureGameCollections(name)));
        }
      } catch (issue) {
        if (!cancelled) setError(issue.message || "Could not seed game collections. Publish Storage and Firestore rules.");
      }
    })();
    return () => { cancelled = true; };
  }, [canManage, games, tournamentId]);

  const [sort, setSort] = useState("newest");
  const [uploadGame, setUploadGame] = useState("");
  const [uploadKind, setUploadKind] = useState("avatar");
  const [uploadCollectionId, setUploadCollectionId] = useState("");

  const showBin = !tournamentId && kind === "bin";
  const { assets: libraryAssetsRaw, collections: visible } = useLibraryAssetIndex({
    game: tournamentId ? "" : activeGame,
    kind: tournamentId ? "poster" : kind,
    tournamentId,
  });
  const libraryAssets = useMemo(
    () => sortByRecency(libraryAssetsRaw, sort, (item) => Number(item.createdAt || 0)),
    [libraryAssetsRaw, sort],
  );
  const libraryBinRaw = useLibraryBinIndex({ game: tournamentId ? "" : activeGame });
  const libraryBin = useMemo(
    () => sortByRecency(libraryBinRaw, sort, (item) => Number(item.createdAt || 0)),
    [libraryBinRaw, sort],
  );

  const filteredCollections = useMemo(() => {
    if (tournamentId) {
      return collections.filter((row) => row.scope === "tournament" && row.tournamentId === tournamentId);
    }
    if (showBin) return [];
    return visible;
  }, [collections, showBin, tournamentId, visible]);

  const selected = filteredCollections.find((item) => item.id === openId) || (!showAll && !showBin ? filteredCollections[0] : null);
  const { assets, binAssets } = useCollectionAssets(selected?.id);
  const sortedAssets = useMemo(
    () => sortByRecency(assets, sort, (item) => Number(item.createdAt || 0)),
    [assets, sort],
  );

  useEffect(() => {
    if (activeGame) setUploadGame(activeGame);
  }, [activeGame]);
  useEffect(() => {
    if (kind !== ALL_KIND && kind !== "bin") setUploadKind(kind);
  }, [kind]);
  useEffect(() => {
    if (selected?.id) setUploadCollectionId(selected.id);
  }, [selected?.id]);

  const uploadTargetCollections = useMemo(() => {
    if (tournamentId) {
      return collections.filter((row) => row.scope === "tournament" && row.tournamentId === tournamentId);
    }
    return collections.filter((row) => (
      row.scope === "site"
      && row.kind === uploadKind
      && (!uploadGame || String(row.game || "").toLowerCase() === String(uploadGame).toLowerCase())
    ));
  }, [collections, tournamentId, uploadGame, uploadKind]);

  const uploadTarget = uploadTargetCollections.find((item) => item.id === uploadCollectionId)
    || uploadTargetCollections[0]
    || selected;

  const canUpload = canManage && (tournamentId
    ? !!uploadTarget
    : !!(uploadGame && uploadKind && uploadKind !== "bin"));

  const resolveUploadCollection = async () => {
    if (tournamentId) {
      if (!uploadTarget) throw new Error("Create or select a poster collection first.");
      return uploadTarget;
    }
    if (!uploadGame) throw new Error("Pick a game section for this upload.");
    if (!uploadKind || uploadKind === ALL_KIND || uploadKind === "bin") {
      throw new Error("Pick a library section (Avatar, Poster, …) for this upload.");
    }
    if (uploadCollectionId) {
      const picked = collections.find((row) => row.id === uploadCollectionId);
      if (picked) return picked;
    }
    await ensureGameCollections(uploadGame);
    const defaultId = siteCollectionId(uploadGame, uploadKind);
    const match = collections.find((row) => row.id === defaultId)
      || collections.find((row) => (
        row.scope === "site"
        && row.kind === uploadKind
        && String(row.game || "").toLowerCase() === String(uploadGame).toLowerCase()
      ));
    if (match) return match;
    return {
      id: defaultId,
      scope: "site",
      kind: uploadKind,
      game: uploadGame,
      tournamentId: "",
      title: `${uploadGame} · ${collectionKindLabel(uploadKind)}`,
      generated: true,
    };
  };

  const addFiles = async (fileList) => {
    if (!canManage || !fileList?.length) return;
    setError("");
    setBusy("upload");
    try {
      const target = await resolveUploadCollection();
      await uploadMediaFiles(target, fileList);
      setOpenId(target.id);
      if (!tournamentId) {
        setKind(target.kind || uploadKind);
        setActiveGame(target.game || uploadGame);
      }
    } catch (issue) {
      setError(issue.message || "Upload failed. Images can still be stored as compressed library entries without Storage.");
    } finally {
      setBusy("");
    }
  };

  const removeAsset = async (asset, pack = selected) => {
    if (!canManage || !pack) return;
    setError("");
    try {
      await deleteMediaAsset(pack.id, asset, pack);
    } catch (issue) {
      setError(issue.message || "Could not remove this image.");
    }
  };

  const makeCover = async (url) => {
    if (!canManage || !selected) return;
    setError("");
    try {
      await setCollectionCover(selected.id, url, selected);
    } catch (issue) {
      setError(issue.message || "Could not set cover.");
    }
  };

  const kindButtons = tournamentId
    ? TOURNAMENT_COLLECTION_KINDS
    : [{ id: ALL_KIND, label: "All" }, ...SITE_COLLECTION_KINDS];

  const openEdit = (asset, pack) => {
    setEditing({
      asset,
      collection: pack || collections.find((row) => row.id === asset.collectionId) || selected,
    });
  };

  return (
    <section className={`space-y-4 ${compact ? "" : "rounded-2xl border border-neon/20 bg-slate-950/80 p-5"}`}>
      {!compact && (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-neon">Image collections</p>
            <h2 className="font-display text-3xl text-white">Library</h2>
            <p className="mt-1 text-sm text-slate-400">
              Browse packs by game. Edit any image to rename, change category, or move it to Bin.
            </p>
          </div>
          {!tournamentId && (
            <button
              type="button"
              onClick={() => {
                setKind("bin");
                setOpenId("");
              }}
              className={`shrink-0 rounded-full px-4 py-2 font-mono text-[11px] uppercase tracking-widest ${
                showBin
                  ? "bg-rose-400 text-slate-950"
                  : "border border-rose-400/50 text-rose-300 hover:border-rose-300"
              }`}
            >
              Bin{libraryBin.length ? ` · ${libraryBin.length}` : ""}
            </button>
          )}
        </div>
      )}
      {tournamentId && (
        <p className="text-sm text-slate-400">Poster collections for this tournament. Only the host or co-host can apply a poster to the listing.</p>
      )}

      <StickyFilterBar
        trailing={!tournamentId && canManage ? (
          <button
            type="button"
            onClick={() => {
              setKind("bin");
              setOpenId("");
            }}
            className={`rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest ${
              showBin ? "bg-rose-400 text-slate-950" : "border border-rose-400/40 text-rose-300"
            }`}
          >
            Bin{libraryBin.length ? ` (${libraryBin.length})` : ""}
          </button>
        ) : null}
      >
        {!tournamentId && (
          <select className={`${inputClass} max-w-[11rem]`} value={activeGame} onChange={(event) => setActiveGame(event.target.value)}>
            <option value="">All games</option>
            {games.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        )}
        {kindButtons.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setKind(item.id);
              setOpenId("");
            }}
            className={`rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest ${kind === item.id ? "bg-neon text-slate-950" : "border border-white/15 text-slate-300"}`}
          >
            {item.label}
          </button>
        ))}
        <DeskSortSelect value={sort} onChange={setSort} />
      </StickyFilterBar>

      {canManage && !showBin && (
        <div className="space-y-3 rounded-xl border border-dashed border-neon/30 bg-slate-950/50 p-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-neon">Upload images</p>
          <div className="flex flex-wrap gap-2">
            {!tournamentId && (
              <>
                <select
                  className={`${inputClass} max-w-[11rem]`}
                  value={uploadGame}
                  onChange={(event) => setUploadGame(event.target.value)}
                  aria-label="Upload game section"
                >
                  <option value="">Game section…</option>
                  {games.filter((name) => name && name !== "Other").map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
                <select
                  className={`${inputClass} max-w-[10rem]`}
                  value={uploadKind}
                  onChange={(event) => {
                    setUploadKind(event.target.value);
                    setUploadCollectionId("");
                  }}
                  aria-label="Upload library section"
                >
                  {SITE_COLLECTION_KINDS.map((item) => (
                    <option key={item.id} value={item.id}>{item.label}</option>
                  ))}
                </select>
              </>
            )}
            <select
              className={`${inputClass} max-w-xs`}
              value={uploadTarget?.id || ""}
              onChange={(event) => setUploadCollectionId(event.target.value)}
              aria-label="Upload collection"
            >
              <option value="">{tournamentId ? "Default poster collection" : "Default pack for section"}</option>
              {uploadTargetCollections.map((item) => (
                <option key={item.id} value={item.id}>{item.title}</option>
              ))}
            </select>
            <label className={`inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-semibold ${canUpload ? "cursor-pointer bg-neon text-slate-950" : "cursor-not-allowed border border-white/15 text-slate-500"}`}>
              <ImagePlus size={14} /> {busy === "upload" ? "Uploading…" : "Upload"}
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={!canUpload || busy === "upload"}
                className="hidden"
                onChange={(event) => {
                  addFiles(event.target.files);
                  event.target.value = "";
                }}
              />
            </label>
          </div>
        </div>
      )}
      {canManage && !showBin && (tournamentId || (kind !== ALL_KIND && activeGame) || uploadGame) && (
        <div className="flex flex-wrap gap-2">
          <input className={`${inputClass} max-w-sm`} placeholder={tournamentId ? "New poster collection name" : "New collection title"} value={newTitle} onChange={(event) => setNewTitle(event.target.value)} />
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-full bg-neon px-3 py-2 text-sm font-semibold text-slate-950"
            onClick={async () => {
              const title = newTitle.trim();
              if (!title) return;
              setError("");
              try {
                const created = await createMediaCollection({
                  scope: tournamentId ? "tournament" : "site",
                  kind: tournamentId ? "poster" : (kind !== ALL_KIND && kind !== "bin" ? kind : uploadKind),
                  game: tournamentId ? game : (activeGame || uploadGame),
                  tournamentId,
                  title,
                });
                setOpenId(created.id);
                setUploadCollectionId(created.id);
                setNewTitle("");
              } catch (issue) {
                setError(issue.message || "Could not create this collection.");
              }
            }}
          >
            <Plus size={14} /> Add collection
          </button>
        </div>
      )}

      {showBin ? (
        <div className="space-y-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-rose-300/90">
            Bin · restore or delete forever{activeGame ? ` · ${activeGame}` : ""} · {libraryBin.length}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {libraryBin.map((asset) => (
              <div key={`${asset.collectionId}-${asset.id}`} className="relative overflow-hidden rounded-xl border border-white/10 opacity-90">
                <img src={asset.url} alt="" className="h-28 w-full object-cover" />
                <p className="truncate px-2 py-1 text-[10px] text-slate-400">
                  {collectionKindLabel(asset.kind)} · {asset.game || asset.collectionTitle || asset.name || asset.id}
                </p>
                {canManage && (
                  <div className="absolute inset-x-1 bottom-1 flex gap-1">
                    <button
                      type="button"
                      className="inline-flex flex-1 items-center justify-center gap-1 rounded-full bg-slate-950/90 px-2 py-1 text-[10px] text-neon"
                      onClick={() => restoreMediaAsset(asset.collection || { id: asset.collectionId }, asset.id, asset).catch((issue) => setError(issue.message))}
                    >
                      <RotateCcw size={10} /> Restore
                    </button>
                    <button
                      type="button"
                      className="inline-flex flex-1 items-center justify-center gap-1 rounded-full bg-slate-950/90 px-2 py-1 text-[10px] text-rose-300"
                      onClick={() => {
                        if (!window.confirm("Permanently delete this image?")) return;
                        purgeMediaAsset(asset.collectionId, asset, asset.collection || { id: asset.collectionId }).catch((issue) => setError(issue.message));
                      }}
                    >
                      <Trash2 size={10} /> Forever
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          {!libraryBin.length && <p className="text-sm text-slate-500">Bin is empty. Use Edit → Move to bin on any image.</p>}
        </div>
      ) : showAll ? (
        <div className="space-y-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
            All images{activeGame ? ` · ${activeGame}` : ""} · {libraryAssets.length}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {libraryAssets.map((asset) => {
              const pack = collections.find((row) => row.id === asset.collectionId) || {
                id: asset.collectionId,
                kind: asset.kind,
                game: asset.game,
                coverUrl: asset.url,
                defaultUrl: "",
                hiddenAssetIds: [],
              };
              return (
                <div key={`${asset.collectionId}-${asset.id}`} className={`relative overflow-hidden rounded-xl border ${currentPoster === asset.url ? "border-neon" : "border-white/10"}`}>
                  <button
                    type="button"
                    className="block w-full"
                    onClick={() => {
                      onPickPoster?.(asset.url);
                      setOpenId(asset.collectionId);
                      if (asset.kind) setKind(asset.kind);
                      if (asset.game) setActiveGame(asset.game);
                    }}
                  >
                    <img src={asset.url} alt="" className="h-28 w-full object-cover" />
                  </button>
                  <p className="truncate px-2 py-1 text-[10px] text-slate-400">
                    {collectionKindLabel(asset.kind)} · {asset.game || asset.collectionTitle || asset.name || asset.id}
                  </p>
                  {canManage && (
                    <div className="absolute right-1 top-1 flex gap-1">
                      <button
                        type="button"
                        aria-label="Edit image"
                        title="Edit image"
                        className="rounded-full bg-slate-950/85 p-1.5 text-neon"
                        onClick={(event) => {
                          event.stopPropagation();
                          openEdit(asset, pack);
                        }}
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        type="button"
                        aria-label="Move to bin"
                        title="Move to bin"
                        className="rounded-full bg-slate-950/85 p-1.5 text-rose-300"
                        onClick={(event) => {
                          event.stopPropagation();
                          removeAsset(asset, pack);
                        }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {!libraryAssets.length && <p className="text-sm text-slate-500">No images yet. Open a category like Avatar or Poster, pick a game, and upload.</p>}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCollections.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setOpenId(item.id)}
                className={`overflow-hidden rounded-xl border text-left ${selected?.id === item.id ? "border-neon" : "border-white/10"}`}
              >
                <img src={item.coverUrl || item.defaultUrl} alt="" className="h-24 w-full object-cover" />
                <span className="block truncate px-2 py-1.5 text-[11px] text-slate-200">{item.title}</span>
              </button>
            ))}
          </div>
          {selected && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
                  {collectionKindLabel(selected.kind)} · {selected.title} · {assets.length} images
                </p>
                <div className="flex gap-2">
                  {canUpload && (
                    <label className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-dashed border-white/20 px-3 py-2 text-xs text-slate-200">
                      <ImagePlus size={12} /> {busy === "upload" ? "Uploading…" : "Add images"}
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(event) => {
                          addFiles(event.target.files);
                          event.target.value = "";
                        }}
                      />
                    </label>
                  )}
                  {canManage && selected.scope === "tournament" && (
                    <button type="button" className="text-xs text-rose-400" onClick={() => deleteMediaCollection(selected.id).catch((issue) => setError(issue.message))}>
                      Delete collection
                    </button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                {sortedAssets.map((asset) => (
                  <div key={asset.id} className={`relative overflow-hidden rounded-xl border ${currentPoster === asset.url || selected.coverUrl === asset.url ? "border-neon" : "border-white/10"}`}>
                    <button type="button" className="block w-full" onClick={() => onPickPoster?.(asset.url)}>
                      <img src={asset.url} alt="" className="h-28 w-full object-cover" />
                    </button>
                    <p className="truncate px-2 py-1 text-[10px] text-slate-400">{asset.name || asset.id}</p>
                    {canManage && (
                      <div className="absolute right-1 top-1 flex flex-col gap-1">
                        {selected.kind === "avatar" && (
                          <button
                            type="button"
                            aria-label={(selected.pickerBlockedIds || []).includes(asset.id) ? "Allow in profile picker" : "Hide from profile picker"}
                            className={`rounded-full bg-slate-950/80 px-1.5 py-1 font-mono text-[8px] uppercase tracking-wider ${(selected.pickerBlockedIds || []).includes(asset.id) ? "text-slate-500" : "text-neon"}`}
                            onClick={() => {
                              const blocked = !(selected.pickerBlockedIds || []).includes(asset.id);
                              setAvatarPickerBlocked(selected, asset.id, blocked).catch((issue) => setError(issue.message));
                            }}
                          >
                            {(selected.pickerBlockedIds || []).includes(asset.id) ? "Off list" : "On list"}
                          </button>
                        )}
                        <div className="flex gap-1 self-end">
                          <button type="button" aria-label="Edit image" title="Edit image" className="rounded-full bg-slate-950/80 p-1.5 text-neon" onClick={() => openEdit(asset, selected)}>
                            <Pencil size={12} />
                          </button>
                          <button type="button" aria-label="Set cover" title="Set as cover" className="rounded-full bg-slate-950/80 p-1.5 text-amber-300" onClick={() => makeCover(asset.url)}>
                            <Star size={12} />
                          </button>
                          <button type="button" aria-label="Move to bin" title="Move to bin" className="rounded-full bg-slate-950/80 p-1.5 text-rose-300" onClick={() => removeAsset(asset)}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {canManage && binAssets.length > 0 && (
                <div className="space-y-2 rounded-xl border border-dashed border-rose-400/30 p-3">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-rose-300/90">Collection bin</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {binAssets.map((asset) => (
                      <div key={asset.id} className="relative overflow-hidden rounded-xl border border-white/10 opacity-80">
                        <img src={asset.url} alt="" className="h-20 w-full object-cover" />
                        <div className="absolute inset-x-1 bottom-1 flex gap-1">
                          <button
                            type="button"
                            className="inline-flex flex-1 items-center justify-center gap-1 rounded-full bg-slate-950/90 px-2 py-1 text-[10px] text-neon"
                            onClick={() => restoreMediaAsset(selected, asset.id, asset).catch((issue) => setError(issue.message))}
                          >
                            <RotateCcw size={10} /> Restore
                          </button>
                          <button
                            type="button"
                            className="inline-flex flex-1 items-center justify-center gap-1 rounded-full bg-slate-950/90 px-2 py-1 text-[10px] text-rose-300"
                            onClick={() => {
                              if (!window.confirm("Permanently delete this image?")) return;
                              purgeMediaAsset(selected.id, asset, selected).catch((issue) => setError(issue.message));
                            }}
                          >
                            <Trash2 size={10} /> Forever
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {!filteredCollections.length && (
            <p className="text-sm text-slate-500">No collections for this filter yet.</p>
          )}
        </>
      )}
      {error && <p className="text-sm text-rose-400">{error}</p>}
      {!canManage && <p className="text-xs text-slate-500">View only. The owner dashboard can edit or bin any collection image.</p>}
      {editing && (
        <AssetEditPanel
          asset={editing.asset}
          collection={editing.collection}
          games={games}
          onClose={() => setEditing(null)}
          onSaved={() => setError("")}
          onError={setError}
        />
      )}
    </section>
  );
}
