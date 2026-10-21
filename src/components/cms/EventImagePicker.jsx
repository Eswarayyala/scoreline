import { useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { readImageFile } from "../../lib/readImageFile";
import { defaultPosterForEvent, flyersForEvent } from "../../data/platformShowcase";
import CollectionPicker from "./CollectionPicker";

const inputClass = "w-full rounded-lg border border-white/15 bg-slate-950/80 px-3 py-2 text-sm text-white outline-none focus:border-neon";

export default function EventImagePicker({
  game,
  year = "",
  season = "",
  event = "",
  poster = "",
  images = [],
  onChange,
  heading = "Event poster and photos",
  role = "",
}) {
  const [urlDraft, setUrlDraft] = useState("");
  const [error, setError] = useState("");
  const extras = (images || []).filter(Boolean).slice(0, 6);
  const eventKey = { game, year, season, event };
  const uniqueDefault = defaultPosterForEvent(eventKey);
  const presets = flyersForEvent(eventKey, extras).slice(0, 4);
  const effectivePoster = poster || uniqueDefault;
  const supportQueued = String(role || "").toLowerCase() === "support";

  const applyPoster = (src, source = "upload") => {
    setError("");
    onChange({ poster: src, posterSource: source, images: extras });
  };

  const addImage = (src) => {
    setError("");
    if (!src) return;
    const next = [...new Set([src, ...extras])].slice(0, 6);
    onChange({ poster: poster || src, posterSource: poster ? undefined : "upload", images: next });
  };

  return (
    <div className="space-y-3 rounded-xl border border-white/10 p-3">
      <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">{heading}</p>
      {supportQueued && (
        <p className="text-xs text-amber-300/90">Support changes wait for owner approval before going live.</p>
      )}
      <p className="text-[11px] text-slate-500">
        Default for this event is unique until you pick a poster. Staff can override with a URL, upload, or library image.
      </p>
      <div className="grid grid-cols-4 gap-2">
        {presets.map((src, index) => (
          <button
            key={`${src}-${index}`}
            type="button"
            onClick={() => applyPoster(src, index === 0 ? "event-default" : "preset")}
            className={`overflow-hidden rounded-lg border ${effectivePoster === src ? "border-neon" : "border-white/10"}`}
          >
            <img src={src} alt="" className="h-16 w-full object-cover" />
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <input
          className={inputClass}
          placeholder="https:// poster or photo URL"
          value={urlDraft}
          onChange={(event) => setUrlDraft(event.target.value)}
        />
        <button
          type="button"
          className="rounded-full border border-white/15 px-3 py-2 text-xs text-slate-200"
          onClick={() => {
            const url = urlDraft.trim();
            if (!/^https:\/\//i.test(url) && !url.startsWith("data:image/")) {
              setError("Paste a secure https image URL.");
              return;
            }
            addImage(url);
            applyPoster(url, "url");
            setUrlDraft("");
          }}
        >
          Use URL
        </button>
        <label className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-dashed border-white/20 px-3 py-2 text-xs text-slate-200">
          <ImagePlus size={12} /> Upload poster
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(event) => {
              setError("");
              readImageFile(event.target.files?.[0], (dataUrl) => applyPoster(dataUrl, "upload"), setError, { maxChars: 650000 });
            }}
          />
        </label>
        <label className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-dashed border-white/20 px-3 py-2 text-xs text-slate-200">
          <ImagePlus size={12} /> Add photo
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(event) => {
              setError("");
              readImageFile(event.target.files?.[0], addImage, setError, { maxChars: 650000 });
            }}
          />
        </label>
      </div>
      <img src={effectivePoster} alt="" className="h-28 w-full rounded-xl object-cover" />
      {!!extras.length && (
        <div className="flex flex-wrap gap-2">
          {extras.map((src) => (
            <div key={src.slice(0, 48)} className="relative">
              <img src={src} alt="" className="h-16 w-24 rounded-lg object-cover" />
              <button
                type="button"
                aria-label="Remove photo"
                className="absolute right-1 top-1 rounded-full bg-slate-950/80 p-1 text-rose-300"
                onClick={() => onChange({ poster, images: extras.filter((item) => item !== src) })}
              >
                <Trash2 size={10} />
              </button>
            </div>
          ))}
        </div>
      )}
      <CollectionPicker game={game} kinds={["event", "poster", "background"]} value={poster} onSelect={(url) => applyPoster(url, "library")} heading="Post a collection image onto this event" />
      {error && <p className="text-sm text-rose-400">{error}</p>}
    </div>
  );
}
