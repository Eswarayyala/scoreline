import { useMemo, useState } from "react";
import { ImagePlus, LayoutGrid, Upload } from "lucide-react";
import { CMS_GAMES, POSTER_PRESETS } from "../../data/posterPresets";

export default function PosterPicker({ game, value, onChange }) {
  const [mode, setMode] = useState("presets");
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const presets = useMemo(
    () => POSTER_PRESETS.filter((item) => !game || item.game === game),
    [game],
  );

  const readFile = (file) => {
    setError("");
    if (!file || !file.type.startsWith("image/")) {
      setError("Choose a PNG, JPG, or WebP image.");
      return;
    }
    if (file.size > 1.5 * 1024 * 1024) {
      setError("Keep posters under 1.5 MB for now.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange({ poster: String(reader.result || ""), posterSource: "upload" });
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button type="button" onClick={() => setMode("presets")} className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest ${mode === "presets" ? "bg-neon text-slate-950" : "border border-white/15 text-slate-300"}`}>
          <LayoutGrid size={12} /> Presets
        </button>
        <button type="button" onClick={() => setMode("upload")} className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest ${mode === "upload" ? "bg-neon text-slate-950" : "border border-white/15 text-slate-300"}`}>
          <Upload size={12} /> Custom upload
        </button>
      </div>

      {mode === "presets" && (
        <div>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-slate-500">In-game posters · {game || "all titles"}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {presets.map((preset) => {
              const selected = value === preset.src;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onChange({ poster: preset.src, posterSource: "preset" })}
                  className={`overflow-hidden rounded-xl border text-left ${selected ? "border-neon ring-1 ring-neon" : "border-white/10"}`}
                >
                  <img src={preset.src} alt="" className="h-20 w-full object-cover" />
                  <span className="block truncate px-2 py-1.5 text-[11px] text-slate-300">{preset.label}</span>
                </button>
              );
            })}
          </div>
          {!presets.length && <p className="text-sm text-slate-400">No presets for this game yet.</p>}
          <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-slate-600">{CMS_GAMES.join(" · ")}</p>
        </div>
      )}

      {mode === "upload" && (
        <label
          onDragOver={(event) => { event.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => { event.preventDefault(); setDragOver(false); readFile(event.dataTransfer.files?.[0]); }}
          className={`grid cursor-pointer place-items-center rounded-2xl border border-dashed px-4 py-10 ${dragOver ? "border-neon bg-neon/10" : "border-white/20 bg-white/5"}`}
        >
          <ImagePlus className="mb-2 text-neon" size={28} />
          <span className="text-sm text-slate-200">Drop a flyer here or browse your machine</span>
          <span className="mt-1 text-xs text-slate-500">PNG / JPG / WebP · 1.5 MB max</span>
          <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => readFile(event.target.files?.[0])} />
        </label>
      )}
      {error && <p className="text-sm text-rose-400">{error}</p>}
      {value && <img src={value} alt="" className="h-28 w-full rounded-xl object-cover" />}
    </div>
  );
}
