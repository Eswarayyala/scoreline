import { useMemo, useState } from "react";
import { ImagePlus, LayoutGrid, Link2, Upload } from "lucide-react";
import { CMS_GAMES, POSTER_PRESETS } from "../../data/posterPresets";
import { avatarForGame, flyersForGame } from "../../data/platformShowcase";
import { fetchGameArtPack } from "../../services/esportsMedia";
import { readImageFile } from "../../lib/readImageFile";
import CollectionPicker from "./CollectionPicker";

export default function PosterPicker({ game, value, avatar, flyers, posterIndex = 0, onChange }) {
  const [mode, setMode] = useState("flyers");
  const [dragOver, setDragOver] = useState("");
  const [error, setError] = useState("");
  const [urlDraft, setUrlDraft] = useState({ flyer: "", poster: "", avatar: "" });
  const [importing, setImporting] = useState(false);

  const presets = useMemo(() => {
    const fromCatalog = POSTER_PRESETS.filter((item) => !game || item.game === game);
    if (fromCatalog.length >= 3) return fromCatalog;
    return flyersForGame(game, flyers).slice(0, 3).map((src, index) => ({
      id: `${game || "game"}-${index}`,
      game,
      label: `Flyer ${index + 1}`,
      src,
    }));
  }, [flyers, game]);

  const pack = useMemo(() => {
    const selected = value ? [value] : [];
    return flyersForGame(game, [...(flyers || []), ...selected, ...presets.map((item) => item.src)]).slice(0, 6);
  }, [flyers, game, presets, value]);

  const applyFlyer = (src, index, source = "preset") => {
    const nextFlyers = [...new Set([src, ...pack])].slice(0, 6);
    onChange({
      poster: src,
      posterSource: source,
      flyers: nextFlyers,
      posterIndex: index >= 0 ? index : 0,
    });
  };

  const importUrl = (kind) => {
    const url = String(urlDraft[kind] || "").trim();
    setError("");
    if (!/^https:\/\//i.test(url)) {
      setError("Paste a secure https image URL.");
      return;
    }
    if (kind === "avatar") {
      onChange({ avatar: url });
      return;
    }
    if (kind === "poster") {
      onChange({ poster: url, posterSource: "url" });
      return;
    }
    applyFlyer(url, 0, "url");
  };

  const importArtPack = async () => {
    setError("");
    setImporting(true);
    try {
      const packIn = await fetchGameArtPack(game);
      if (!packIn.poster && !(packIn.flyers || []).length && !packIn.avatar) {
        setError("No art pack found for this game yet. Paste URLs or upload files.");
        return;
      }
      const nextFlyers = flyersForGame(game, [...(flyers || []), ...(packIn.flyers || []), packIn.poster].filter(Boolean));
      onChange({
        poster: packIn.poster || value || nextFlyers[0],
        posterSource: "rawg",
        flyers: nextFlyers,
        avatar: packIn.avatar || avatar || avatarForGame(game),
        posterIndex: 0,
      });
    } catch {
      setError("Could not import art for this game.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {[
          ["flyers", LayoutGrid, "Flyers"],
          ["upload", Upload, "Upload"],
          ["urls", Link2, "Import URLs"],
        ].map(([id, Icon, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setMode(id)}
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest ${mode === id ? "bg-neon text-slate-950" : "border border-white/15 text-slate-300"}`}
          >
            <Icon size={12} /> {label}
          </button>
        ))}
        <button
          type="button"
          onClick={importArtPack}
          disabled={importing || !game}
          className="inline-flex items-center gap-1 rounded-full border border-white/15 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-slate-300 disabled:opacity-40"
        >
          {importing ? "Importing…" : "Import game art"}
        </button>
      </div>

      {mode === "flyers" && (
        <div>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-slate-500">Pick a flyer · {game || "this title"} · {pack.length} options</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {pack.map((src, index) => {
              const selected = value === src || Number(posterIndex) === index;
              return (
                <button
                  key={`${src}-${index}`}
                  type="button"
                  onClick={() => applyFlyer(src, index)}
                  className={`overflow-hidden rounded-xl border text-left ${selected ? "border-neon ring-1 ring-neon" : "border-white/10"}`}
                >
                  <img src={src} alt="" className="h-20 w-full object-cover" />
                  <span className="block truncate px-2 py-1.5 text-[11px] text-slate-300">Flyer {index + 1}</span>
                </button>
              );
            })}
          </div>
          {pack.length < 3 && <p className="mt-2 text-sm text-amber-300">Add at least two more flyers with Import URLs or Upload.</p>}
        </div>
      )}

      {mode === "upload" && (
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ["flyer", "Flyer"],
            ["poster", "Poster"],
            ["avatar", "Avatar"],
          ].map(([kind, label]) => (
            <label
              key={kind}
              onDragOver={(event) => { event.preventDefault(); setDragOver(kind); }}
              onDragLeave={() => setDragOver("")}
              onDrop={(event) => {
                event.preventDefault();
                setDragOver("");
                setError("");
                readImageFile(event.dataTransfer.files?.[0], (dataUrl) => {
                  if (kind === "avatar") onChange({ avatar: dataUrl });
                  else if (kind === "poster") onChange({ poster: dataUrl, posterSource: "upload" });
                  else applyFlyer(dataUrl, 0, "upload");
                }, setError);
              }}
              className={`grid cursor-pointer place-items-center rounded-2xl border border-dashed px-3 py-8 ${dragOver === kind ? "border-neon bg-neon/10" : "border-white/20 bg-white/5"}`}
            >
              <ImagePlus className="mb-2 text-neon" size={22} />
              <span className="text-center text-sm text-slate-200">Upload {label.toLowerCase()}</span>
              <span className="mt-1 text-center text-[11px] text-slate-500">PNG / JPG / WebP · 1.5 MB</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(event) => {
                  setError("");
                  readImageFile(event.target.files?.[0], (dataUrl) => {
                    if (kind === "avatar") onChange({ avatar: dataUrl });
                    else if (kind === "poster") onChange({ poster: dataUrl, posterSource: "upload" });
                    else applyFlyer(dataUrl, 0, "upload");
                  }, setError);
                }}
              />
            </label>
          ))}
        </div>
      )}

      {mode === "urls" && (
        <div className="grid gap-3">
          {[
            ["flyer", "Flyer URL"],
            ["poster", "Poster URL"],
            ["avatar", "Avatar URL"],
          ].map(([kind, label]) => (
            <div key={kind} className="flex flex-wrap gap-2">
              <input
                className="min-w-[200px] flex-1 rounded-lg border border-white/15 bg-slate-950/80 px-3 py-2 text-sm text-white outline-none focus:border-neon"
                placeholder={`https:// · ${label}`}
                value={urlDraft[kind]}
                onChange={(event) => setUrlDraft((current) => ({ ...current, [kind]: event.target.value }))}
              />
              <button type="button" onClick={() => importUrl(kind)} className="rounded-full border border-white/15 px-3 py-2 text-xs text-slate-200">
                Import {kind}
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3">
        {(avatar || avatarForGame(game)) && (
          <img src={avatar || avatarForGame(game)} alt="" className="h-14 w-14 rounded-full object-cover ring-1 ring-white/15" />
        )}
        {value && <img src={value} alt="" className="h-28 flex-1 rounded-xl object-cover" />}
      </div>
      <CollectionPicker
        game={game}
        kinds={["flyer", "event", "post", "background"]}
        value={value}
        onSelect={(url) => applyFlyer(url, 0, "library")}
        heading="Post from game collections"
      />
      {error && <p className="text-sm text-rose-400">{error}</p>}
      <p className="font-mono text-[10px] uppercase tracking-widest text-slate-600">{CMS_GAMES.slice(0, 8).join(" · ")}</p>
    </div>
  );
}
