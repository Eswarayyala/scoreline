import { useMemo } from "react";
import { useLibraryAssetIndex } from "../../hooks/useMediaLibrary";
import LoadMoreBar, { usePagedVisible } from "../shared/LoadMoreBar";

const PER_GAME = 2;
/** Show a small image grid first; More adds another chunk. */
const PAGE = 6;
const JUNK = /background|wallpaper|setup|desk|room|banner|flyer|poster|landscape|arena|map\b|weapon|gun\b|keyboard|monitor/i;

function looksLikeAvatar(asset) {
  if (asset.kind && asset.kind !== "avatar") return false;
  const hay = [asset.name, asset.title, asset.path, asset.url, asset.collectionTitle].filter(Boolean).join(" ");
  if (JUNK.test(hay)) return false;
  return Boolean(asset.url);
}

/** Cap at two avatars per game, drop junk kinds/labels, respect owner picker blocks. */
export function buildAvatarRoster(assets = []) {
  const counts = new Map();
  const out = [];
  for (const asset of assets) {
    if (!looksLikeAvatar(asset)) continue;
    if (asset.pickerBlocked === true) continue;
    const gameKey = String(asset.game || "other").toLowerCase();
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
    const fromAssets = (assets || []).map((asset) => ({
      ...asset,
      pickerBlocked: blocked.get(asset.collectionId)?.has(asset.id) === true,
    }));
    // Prefer real asset images; fall back to collection covers so the grid never becomes a text list.
    const coverFallback = (collections || [])
      .filter((row) => row.kind === "avatar" && (row.coverUrl || row.defaultUrl))
      .map((row) => ({
        id: `cover-${row.id}`,
        url: row.coverUrl || row.defaultUrl,
        name: row.title || row.game,
        game: row.game,
        kind: "avatar",
        collectionId: row.id,
        collectionTitle: row.title,
        pickerBlocked: false,
      }));
    const merged = [...fromAssets];
    coverFallback.forEach((asset) => {
      if (!merged.some((row) => row.url === asset.url)) merged.push(asset);
    });
    return buildAvatarRoster(merged);
  }, [assets, collections]);
  const page = usePagedVisible(roster.length, PAGE, PAGE);
  const shown = roster.slice(0, page.visible);

  return (
    <div className="space-y-2 rounded-xl border border-white/10 p-3">
      <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">{heading}</p>
      <p className="text-[11px] text-slate-500">
        Image grid · up to {PER_GAME} per game · {PAGE} shown first
      </p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
        {shown.map((asset) => (
          <button
            key={`${asset.collectionId}-${asset.id}`}
            type="button"
            onClick={() => onSelect?.(asset.url)}
            className={`overflow-hidden rounded-lg border bg-slate-950/80 ${value === asset.url ? "border-neon" : "border-white/10"}`}
            title={[asset.game, asset.name || asset.id].filter(Boolean).join(" · ")}
          >
            <img
              src={asset.url}
              alt=""
              className="aspect-square h-auto w-full object-cover"
              loading="lazy"
            />
            {asset.game ? (
              <span className="block truncate px-1 py-0.5 text-center font-mono text-[8px] uppercase tracking-wider text-slate-500">
                {asset.game}
              </span>
            ) : null}
          </button>
        ))}
      </div>
      {!roster.length && (
        <p className="text-xs text-slate-500">No avatar images ready yet. Owner can upload Avatar packs in the media library.</p>
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
