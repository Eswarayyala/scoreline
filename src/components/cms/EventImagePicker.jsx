import { useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { readImageFile } from "../../lib/readImageFile";
import { posterForEdition } from "../../data/eventPoster";
import CollectionPicker from "./CollectionPicker";

const inputClass = "w-full rounded-lg border border-white/15 bg-slate-950/80 px-3 py-2 text-sm text-white outline-none focus:border-neon";

function Slot({
  label,
  hint,
  value,
  onSet,
  onClear,
  urlDraft,
  setUrlDraft,
  setError,
}) {
  return (
    <div className="space-y-2 rounded-lg border border-white/10 p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-slate-400">{label}</p>
          {hint ? <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p> : null}
        </div>
        {value ? (
          <button type="button" className="text-[10px] uppercase tracking-widest text-rose-400" onClick={onClear}>
            Clear
          </button>
        ) : null}
      </div>
      {value ? <img src={value} alt="" className="h-24 w-full rounded-lg object-cover" /> : null}
      <div className="flex flex-wrap gap-2">
        <input
          className={inputClass}
          placeholder="https:// image URL"
          value={urlDraft}
          onChange={(event) => setUrlDraft(event.target.value)}
        />
        <button
          type="button"
          className="rounded-full border border-white/15 px-3 py-2 text-xs text-slate-200"
          onClick={() => {
            const url = urlDraft.trim();
            if (!/^https:\/\//i.test(url) && !url.startsWith("data:image/") && !url.startsWith("/media/")) {
              setError("Paste a secure https, /media/, or data image URL.");
              return;
            }
            onSet(url, "url");
            setUrlDraft("");
          }}
        >
          Use URL
        </button>
        <label className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-dashed border-white/20 px-3 py-2 text-xs text-slate-200">
          <ImagePlus size={12} /> Upload
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(event) => {
              setError("");
              readImageFile(
                event.target.files?.[0],
                (dataUrl) => onSet(dataUrl, "upload"),
                setError,
                { maxChars: 650000 },
              );
            }}
          />
        </label>
      </div>
    </div>
  );
}

export default function EventImagePicker({
  game,
  year = "",
  season = "",
  event = "",
  champion = "",
  mvp = "",
  poster = "",
  winnerPoster = "",
  momentPoster = "",
  images = [],
  onChange,
  heading = "Event posters",
  role = "",
  hideSuggestions = false,
}) {
  const [urlPoster, setUrlPoster] = useState("");
  const [urlWinner, setUrlWinner] = useState("");
  const [urlMoment, setUrlMoment] = useState("");
  const [error, setError] = useState("");
  const extras = (images || []).filter(Boolean).slice(0, 6);
  const supportQueued = String(role || "").toLowerCase() === "support";
  const preview = posterForEdition({
    game,
    year,
    season,
    event,
    champion,
    mvp,
    poster,
    winnerPoster,
    momentPoster,
    images: extras,
  });

  const emit = (patch) => {
    setError("");
    onChange({
      poster,
      winnerPoster,
      momentPoster,
      posterSource: undefined,
      images: extras,
      ...patch,
    });
  };

  return (
    <div className="space-y-3 rounded-xl border border-white/10 p-3">
      <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">{heading}</p>
      {supportQueued && (
        <p className="text-xs text-neon/90">Support changes wait for owner approval before going live.</p>
      )}
      <p className="text-[11px] text-slate-500">
        Each event gets its own art (winner / moment / event poster). The game&apos;s main vault poster stays on the game record — not on these cards. Uploads land in the staff library for owner and support.
      </p>

      <div className="grid gap-3 lg:grid-cols-3">
        <Slot
          label="Event poster"
          hint="Card background for this season"
          value={poster}
          onSet={(src, source) => emit({ poster: src, posterSource: source })}
          onClear={() => emit({ poster: "", posterSource: "" })}
          urlDraft={urlPoster}
          setUrlDraft={setUrlPoster}
          setError={setError}
        />
        <Slot
          label="Winner poster"
          hint="Winning team or player shot"
          value={winnerPoster}
          onSet={(src) => emit({ winnerPoster: src })}
          onClear={() => emit({ winnerPoster: "" })}
          urlDraft={urlWinner}
          setUrlDraft={setUrlWinner}
          setError={setError}
        />
        <Slot
          label="Moment poster"
          hint="Highlight / clutch still"
          value={momentPoster}
          onSet={(src) => emit({ momentPoster: src })}
          onClear={() => emit({ momentPoster: "" })}
          urlDraft={urlMoment}
          setUrlDraft={setUrlMoment}
          setError={setError}
        />
      </div>

      {preview ? (
        <div>
          <p className="mb-1 font-mono text-[9px] uppercase tracking-widest text-slate-500">Card preview</p>
          <img src={preview} alt="" className="h-28 w-full rounded-xl object-cover" />
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <label className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-dashed border-white/20 px-3 py-2 text-xs text-slate-200">
          <ImagePlus size={12} /> Add extra photo
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(event) => {
              setError("");
              readImageFile(
                event.target.files?.[0],
                (src) => {
                  const next = [...new Set([src, ...extras])].slice(0, 6);
                  emit({ images: next, poster: poster || src, posterSource: poster ? undefined : "upload" });
                },
                setError,
                { maxChars: 650000 },
              );
            }}
          />
        </label>
      </div>
      {!!extras.length && (
        <div className="flex flex-wrap gap-2">
          {extras.map((src) => (
            <div key={src.slice(0, 48)} className="relative">
              <img src={src} alt="" className="h-16 w-24 rounded-lg object-cover" />
              <button
                type="button"
                aria-label="Remove photo"
                className="absolute right-1 top-1 rounded-full bg-slate-950/80 p-1 text-rose-300"
                onClick={() => emit({ images: extras.filter((item) => item !== src) })}
              >
                <Trash2 size={10} />
              </button>
            </div>
          ))}
        </div>
      )}
      {!hideSuggestions && (
        <CollectionPicker
          game={game}
          kinds={["event", "poster", "background", "avatar"]}
          value={poster || winnerPoster || momentPoster}
          onSelect={(url) => emit({ poster: poster || url, posterSource: "library", winnerPoster: winnerPoster || url })}
          heading="Pick from staff library"
        />
      )}
      {error && <p className="text-sm text-rose-400">{error}</p>}
    </div>
  );
}
