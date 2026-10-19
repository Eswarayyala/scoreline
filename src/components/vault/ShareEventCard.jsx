import { useState } from "react";
import { Share2 } from "lucide-react";
import { flyerForEvent } from "../../data/platformShowcase";
import { downloadCanvasPng, shareCanvasPng } from "../../lib/downloadCanvas";

function drawRoundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

async function loadImage(src) {
  if (!src) return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export async function buildEventShareCanvas({ edition, game, fallbackPoster }) {
  const width = 1080;
  const height = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const poster = flyerForEvent({
    game: edition.game || game,
    poster: edition.poster || fallbackPoster,
    flyers: edition.images,
    posterUrl: edition.poster || fallbackPoster,
  });
  const img = await loadImage(poster);

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#0b1220");
  gradient.addColorStop(1, "#1a0f0a");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  if (img) {
    const scale = Math.max(width / img.width, height / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    ctx.globalAlpha = 0.35;
    ctx.drawImage(img, (width - dw) / 2, (height - dh) / 2, dw, dh);
    ctx.globalAlpha = 1;
  }

  ctx.fillStyle = "rgba(2,6,23,0.72)";
  drawRoundedRect(ctx, 64, 180, width - 128, height - 360, 36);
  ctx.fill();

  ctx.fillStyle = "#fbbf24";
  ctx.font = "600 28px JetBrains Mono, monospace";
  ctx.fillText(String(edition.year || edition.season || game || "VAULT").toUpperCase(), 100, 260);

  ctx.fillStyle = "#ffffff";
  ctx.font = "700 72px Bebas Neue, Impact, sans-serif";
  const title = String(edition.event || "Event").slice(0, 42);
  wrapText(ctx, title, 100, 360, width - 200, 78);

  const lines = [
    edition.prizePool && `Prize pool ${edition.prizePool}`,
    edition.champion && `Champion ${edition.champion}`,
    edition.runnerUp && `Runner-up ${edition.runnerUp}`,
    edition.mvp && `MVP ${edition.mvp}`,
  ].filter(Boolean);

  ctx.fillStyle = "#cbd5e1";
  ctx.font = "400 36px Inter, sans-serif";
  lines.forEach((line, index) => {
    ctx.fillText(line.slice(0, 48), 100, 560 + index * 64);
  });

  ctx.fillStyle = "#22d3ee";
  ctx.font = "600 26px JetBrains Mono, monospace";
  ctx.fillText("GRINDINFO · THE VAULT", 100, height - 120);

  return canvas;
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  let cursorY = y;
  words.forEach((word) => {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, cursorY);
      line = word;
      cursorY += lineHeight;
    } else {
      line = test;
    }
  });
  if (line) ctx.fillText(line, x, cursorY);
}

export default function ShareEventCard({ edition, game, fallbackPoster }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  const run = async () => {
    setBusy(true);
    setNote("");
    try {
      const canvas = await buildEventShareCanvas({ edition, game, fallbackPoster });
      if (!canvas) {
        setNote("Could not build card");
        return;
      }
      const title = `${edition.event || "Vault"} ${edition.year || ""}`.trim();
      const shared = await shareCanvasPng(canvas, {
        title,
        text: [edition.champion && `Champion ${edition.champion}`, edition.prizePool].filter(Boolean).join(" · "),
      });
      if (!shared) downloadCanvasPng(canvas, `${title}.png`);
      setNote("Ready to share");
    } catch {
      setNote("Share failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={run}
        className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-amber-300 disabled:opacity-50"
      >
        <Share2 size={14} /> {busy ? "Building…" : "Share card"}
      </button>
      {note && <span className="font-mono text-[10px] text-slate-500">{note}</span>}
    </div>
  );
}
