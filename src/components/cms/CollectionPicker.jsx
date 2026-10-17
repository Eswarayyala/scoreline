import { useMemo, useState } from "react";
import { useCollectionAssets, useCollectionsFor } from "../../hooks/useMediaLibrary";
import { collectionKindLabel } from "../../data/mediaCollections";

export default function CollectionPicker({
  game,
  kinds = ["avatar", "poster", "background", "event", "flyer", "post"],
  tournamentId,
  scope,
  value,
  onSelect,
  heading = "Post from collections",
}) {
  const collections = useCollectionsFor({ game, kinds, tournamentId, scope });
  const [openId, setOpenId] = useState(collections[0]?.id || "");
  const selectedId = collections.some((item) => item.id === openId) ? openId : collections[0]?.id || "";
  const { assets } = useCollectionAssets(selectedId);
  const current = useMemo(() => collections.find((item) => item.id === selectedId), [collections, selectedId]);

  if (!collections.length) {
    return (
      <div className="rounded-xl border border-white/10 p-3">
        <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">{heading}</p>
        <p className="mt-1 text-sm text-slate-400">No collections for this game yet. The owner desk can add them.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-xl border border-white/10 p-3">
      <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">{heading}</p>
      <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
        {collections.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setOpenId(item.id)}
            className={`rounded-lg px-3 py-2 text-left font-mono text-[10px] uppercase tracking-widest ${selectedId === item.id ? "bg-neon text-slate-950" : "border border-white/15 text-slate-300"}`}
          >
            {collectionKindLabel(item.kind)} · {item.title}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {(current?.coverUrl ? [{ id: "cover", url: current.coverUrl }, ...assets] : assets)
          .filter((item, index, list) => list.findIndex((row) => row.url === item.url) === index)
          .map((asset) => (
            <button
              key={asset.id}
              type="button"
              onClick={() => onSelect?.(asset.url)}
              className={`overflow-hidden rounded-lg border ${value === asset.url ? "border-neon" : "border-white/10"}`}
            >
              <img src={asset.url} alt="" className="h-20 w-full object-cover" />
            </button>
          ))}
      </div>
      {!assets.length && <p className="text-xs text-slate-500">This collection still uses the default background until images are added.</p>}
    </div>
  );
}
