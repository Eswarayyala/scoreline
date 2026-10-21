import { useMemo } from "react";
import { useLibraryAssetIndex } from "../../hooks/useMediaLibrary";
import LoadMoreBar, { usePagedVisible } from "../shared/LoadMoreBar";

const PER_GAME = 2;
const PAGE = 8;
const JUNK = /background|wallpaper|setup|desk|room|banner|flyer|poster|landscape|stage|arena|map\b|weapon|gun\b|keyboard|monitor/i;

function looksLikeAvatar(asset) {
  if (asset.kind && asset.kind !== "avatar") return false;
  const hay = [asset.name, asset.title, asset.path, asset.url, asset.collectionTitle].filter(Boolean).join(" ");
  if (JUNK.test(hay)) return false;
  return true;
}

/** Cap at two avatars per game, drop junk kinds/labels, respect owner picker blocks. */
export function buildAvatarRoster(assets = []) {
  const counts = new Map();
  const out = [];
  for (const asset of assets) {
    if (!looksLikeAvatar(asset)) continue;
    if (asset.pickerBlocked === true) continue;
    const gameKey = String(asset.game || asset.collectionTitle || "other").toLowerCase();
    const used = counts.get(gameKey) || 0;
    if (used >= PER_GAME) continue;
    counts.set(gameKey, used + 1);
    out.push(asset);
  }
  return out;
}

export default function AvatarRosterPicker({ value, onSelect, heading = "Library avatars · all games" }) {
  const { assets, collections } = useLibraryAssetIndex({ kind: "avatar" });
  const roster = useMemo(() => {
    const blocked = new Map(
      (collections || []).map((row) => [row.id, new Set(row.pickerBlockedIds || [])]),
    );
    const tagged = (assets || []).map((asset) => ({
      ...asset,
      pickerBlocked: blocked.get(asset.collectionId)?.has(asset.id) === true,
    }));
    return buildAvatarRoster(tagged);
  }, [assets, collections]);
  const page = usePagedVisible(roster.length, PAGE, PAGE);
  const shown = roster.slice(0, page.visible);

  return (
    <div className="space-y-2 rounded-xl border border-white/10 p-3">
      <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">{heading}</p>
      <p className="text-[11px] text-slate-500">
        Up to {PER_GAME} avatars per game. Backgrounds and setup shots stay out of this grid.
      </p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
        {shown.map((asset) => (
          <button
            key={`${asset.collectionId}-${asset.id}`}
            type="button"
            onClick={() => onSelect?.(asset.url)}
            className={`overflow-hidden rounded-lg border ${value === asset.url ? "border-neon" : "border-white/10"}`}
            title={[asset.game, asset.name || asset.id].filter(Boolean).join(" · ")}
          >
            <img src={asset.url} alt="" className="aspect-square h-auto w-full object-cover" />
          </button>
        ))}
      </div>
      {!roster.length && (
        <p className="text-xs text-slate-500">No avatar packs ready yet. Owner can upload Avatar images in the media library.</p>
      )}
      <LoadMoreBar
        total={roster.length}
        shown={page.visible}
        pageSize={PAGE}
        initial={PAGE}
        onMore={page.more}
        onAll={page.all}
        onLess={page.less}
      />
    </div>
  );
}
