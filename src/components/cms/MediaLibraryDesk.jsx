import { useEffect, useMemo, useState } from "react";
import { ImagePlus, Plus, RotateCcw, Star, Trash2 } from "lucide-react";
import { FILTER_GAMES } from "../../data/gameCatalog";
import { SITE_COLLECTION_KINDS, TOURNAMENT_COLLECTION_KINDS, collectionKindLabel } from "../../data/mediaCollections";
import { useCollectionAssets, useLibraryAssetIndex, useMediaArt } from "../../hooks/useMediaLibrary";
import {
  createMediaCollection,
  deleteMediaAsset,
  deleteMediaCollection,
  ensureGameCollections,
  restoreMediaAsset,
  setCollectionCover,
  uploadMediaFiles,
} from "../../services/mediaLibrary";

const inputClass = "w-full rounded-lg border border-white/15 bg-slate-950/80 px-3 py-2 text-sm text-white outline-none focus:border-neon";
const ALL_KIND = "all";

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

  const { assets: libraryAssets, collections: visible } = useLibraryAssetIndex({
    game: tournamentId ? "" : activeGame,
    kind: tournamentId ? "poster" : kind,
    tournamentId,
  });

  const filteredCollections = useMemo(() => {
    if (tournamentId) {
      return collections.filter((row) => row.scope === "tournament" && row.tournamentId === tournamentId);
    }
    if (kind === "host") {
      return collections.filter((row) => row.scope === "tournament");
    }
    return visible;
  }, [collections, kind, tournamentId, visible]);

  const selected = filteredCollections.find((item) => item.id === openId) || (!showAll ? filteredCollections[0] : null);
  const { assets, hiddenAssets } = useCollectionAssets(selected?.id);

  const canUpload = canManage && selected && (tournamentId || (kind !== "host" && kind !== ALL_KIND && activeGame));

  const addFiles = async (fileList) => {
    if (!canUpload || !selected) return;
    setError("");
    setBusy("upload");
    try {
      await uploadMediaFiles(selected, fileList);
    } catch (issue) {
      setError(issue.message || "Upload failed. Images can still be stored as compressed library entries without Storage.");
    } finally {
      setBusy("");
    }
  };

  const removeAsset = async (asset) => {
    if (!canManage || !selected) return;
    setError("");
    try {
      await deleteMediaAsset(selected.id, asset, selected);
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
    : [{ id: ALL_KIND, label: "All" }, ...SITE_COLLECTION_KINDS, { id: "host", label: "Host posters" }];

  return (
    <section className={`space-y-4 ${compact ? "" : "rounded-2xl border border-neon/20 bg-slate-950/80 p-5"}`}>
      {!compact && (
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-neon">Image collections</p>
          <h2 className="font-display text-3xl text-white">Library</h2>
          <p className="mt-1 text-sm text-slate-400">
            Browse every pack with no filter, or open Avatar / Poster / Flyer by game to upload into that category.
          </p>
        </div>
      )}
      {tournamentId && (
        <p className="text-sm text-slate-400">Host poster collections for this tournament. Only the host or co-host can apply a poster to the listing.</p>
      )}
      <div className="flex flex-wrap gap-2">
        {!tournamentId && (
          <select className={`${inputClass} max-w-xs`} value={activeGame} onChange={(event) => setActiveGame(event.target.value)}>
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
      </div>
      {canManage && !tournamentId && kind !== "host" && kind !== ALL_KIND && !activeGame && (
        <p className="text-xs text-amber-200/90">Pick a game above to upload into the {collectionKindLabel(kind)} category for that title.</p>
      )}
      {canManage && (tournamentId || (kind !== "host" && kind !== ALL_KIND && activeGame)) && (
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
                  kind: tournamentId ? "poster" : kind,
                  game: tournamentId ? game : activeGame,
                  tournamentId,
                  title,
                });
                setOpenId(created.id);
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

      {showAll ? (
        <div className="space-y-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
            All images{activeGame ? ` · ${activeGame}` : ""} · {libraryAssets.length}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {libraryAssets.map((asset) => (
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
              </div>
            ))}
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
                {assets.map((asset) => (
                  <div key={asset.id} className={`relative overflow-hidden rounded-xl border ${currentPoster === asset.url || selected.coverUrl === asset.url ? "border-neon" : "border-white/10"}`}>
                    <button type="button" className="block w-full" onClick={() => onPickPoster?.(asset.url)}>
                      <img src={asset.url} alt="" className="h-28 w-full object-cover" />
                    </button>
                    <p className="truncate px-2 py-1 text-[10px] text-slate-400">{asset.name || asset.id}</p>
                    {canManage && (
                      <div className="absolute right-1 top-1 flex gap-1">
                        <button type="button" aria-label="Set cover" title="Set as cover" className="rounded-full bg-slate-950/80 p-1.5 text-amber-300" onClick={() => makeCover(asset.url)}>
                          <Star size={12} />
                        </button>
                        <button type="button" aria-label="Delete image" title={asset.seeded ? "Remove from pack" : "Delete image"} className="rounded-full bg-slate-950/80 p-1.5 text-rose-300" onClick={() => removeAsset(asset)}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {canManage && hiddenAssets.length > 0 && (
                <div className="space-y-2 rounded-xl border border-white/10 p-3">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Removed from pack · restore anytime</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {hiddenAssets.map((asset) => (
                      <div key={asset.id} className="relative overflow-hidden rounded-xl border border-white/10 opacity-70">
                        <img src={asset.url} alt="" className="h-20 w-full object-cover" />
                        <button
                          type="button"
                          className="absolute inset-x-1 bottom-1 inline-flex items-center justify-center gap-1 rounded-full bg-slate-950/90 px-2 py-1 text-[10px] text-neon"
                          onClick={() => restoreMediaAsset(selected, asset.id).catch((issue) => setError(issue.message))}
                        >
                          <RotateCcw size={10} /> Restore
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {!filteredCollections.length && (
            <p className="text-sm text-slate-500">
              {kind === "host" ? "No host poster collections yet." : "No collections for this filter yet."}
            </p>
          )}
        </>
      )}
      {error && <p className="text-sm text-rose-400">{error}</p>}
      {!canManage && <p className="text-xs text-slate-500">View only. The owner dashboard can add or delete any collection image.</p>}
    </section>
  );
}
