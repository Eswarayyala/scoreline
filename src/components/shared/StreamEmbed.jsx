import { useMemo } from "react";

function toEmbedSrc(raw = "") {
  const url = String(raw || "").trim();
  if (!url || !/^https:\/\//i.test(url)) return "";

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();

    if (host === "youtu.be") {
      const id = parsed.pathname.replace(/^\//, "").split("/")[0];
      return id ? `https://www.youtube.com/embed/${id}` : "";
    }
    if (host === "youtube.com" || host === "m.youtube.com") {
      if (parsed.pathname.startsWith("/embed/")) return url;
      const id = parsed.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
      const shorts = parsed.pathname.match(/^\/shorts\/([^/]+)/);
      if (shorts?.[1]) return `https://www.youtube.com/embed/${shorts[1]}`;
      const live = parsed.pathname.match(/^\/live\/([^/]+)/);
      if (live?.[1]) return `https://www.youtube.com/embed/${live[1]}`;
      return "";
    }
    if (host === "twitch.tv") {
      const parts = parsed.pathname.split("/").filter(Boolean);
      if (parts[0] === "videos" && parts[1]) {
        return `https://player.twitch.tv/?video=${parts[1]}&parent=${window.location.hostname}&autoplay=false`;
      }
      if (parts[0]) {
        return `https://player.twitch.tv/?channel=${parts[0]}&parent=${window.location.hostname}&autoplay=false`;
      }
    }
    if (host === "player.twitch.tv") return url;
  } catch {
    return "";
  }
  return "";
}

/** Safe YouTube / Twitch iframe from an existing vault or blog URL field. */
export default function StreamEmbed({ url, title = "Live stream" }) {
  const src = useMemo(() => toEmbedSrc(url), [url]);
  if (!src) return null;

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black">
      <p className="border-b border-white/10 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-neon">{title}</p>
      <div className="aspect-video w-full">
        <iframe
          title={title}
          src={src}
          className="h-full w-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    </div>
  );
}
