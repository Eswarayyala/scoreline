import { useState } from "react";
import { Copy, Share2 } from "lucide-react";
import { flyerForEvent } from "../../data/platformShowcase";
import { downloadCanvasPng, shareCanvasPng } from "../../lib/downloadCanvas";
import {
  canShareFlyerImage,
  scrimDeskUrl,
  scrimInviteCopy,
  scrimShareLabel,
} from "../../data/scrimShare";
import { isInviteOnlyScrim, isPublicScrim, scrimIsPaid } from "../../data/scrimAccess";

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

export async function buildScrimFlyerCanvas(tournament = {}) {
  const width = 1080;
  const height = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const poster = flyerForEvent(tournament);
  const img = await loadImage(poster);

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#05080f");
  gradient.addColorStop(1, "#121018");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  if (img) {
    const scale = Math.max(width / img.width, height / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    ctx.globalAlpha = 0.42;
    ctx.drawImage(img, (width - dw) / 2, (height - dh) / 2, dw, dh);
    ctx.globalAlpha = 1;
  }

  ctx.fillStyle = "rgba(2,6,23,0.78)";
  drawRoundedRect(ctx, 56, 160, width - 112, height - 320, 32);
  ctx.fill();

  const access = isPublicScrim(tournament) ? "PUBLIC" : isInviteOnlyScrim(tournament) ? "INVITE" : "PRIVATE";
  ctx.fillStyle = isInviteOnlyScrim(tournament) ? "#fbbf24" : "#39ff14";
  ctx.font = "600 26px JetBrains Mono, monospace";
  ctx.fillText(access, 96, 240);

  if (scrimIsPaid(tournament)) {
    ctx.fillStyle = "#ff6b1a";
    ctx.fillText(`PRIZE ₹${Number(tournament.prizeAmount).toLocaleString()}`, 280, 240);
  }

  ctx.fillStyle = "#94a3b8";
  ctx.font = "600 24px JetBrains Mono, monospace";
  ctx.fillText(String(tournament.game || "SCRIM").toUpperCase(), 96, 290);

  ctx.fillStyle = "#ffffff";
  ctx.font = "700 70px Bebas Neue, Impact, sans-serif";
  wrapText(ctx, String(tournament.name || "Scrim").slice(0, 48), 96, 390, width - 220, 76);

  const details = [
    tournament.adminDisplayName && `Host ${tournament.adminDisplayName}`,
    tournament.startDate && `Starts ${tournament.startDate}`,
    tournament.region && tournament.region,
    tournament.rankBand && tournament.rankBand,
  ].filter(Boolean);

  ctx.fillStyle = "#cbd5e1";
  ctx.font = "400 32px Inter, sans-serif";
  details.slice(0, 4).forEach((line, index) => {
    ctx.fillText(String(line).slice(0, 42), 96, 560 + index * 56);
  });

  ctx.fillStyle = "#3b82ff";
  ctx.font = "600 24px JetBrains Mono, monospace";
  ctx.fillText("GRINDINFO · SCRIMS", 96, height - 140);

  const url = scrimDeskUrl(tournament).replace(/^https?:\/\//, "");
  ctx.fillStyle = "#64748b";
  ctx.font = "500 22px JetBrains Mono, monospace";
  ctx.fillText(url.slice(0, 48), 96, height - 96);

  return canvas;
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = String(text || "").split(" ");
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

/**
 * Host / player share actions: copy invite paste + optional flyer image.
 */
export default function ShareFlyerBar({
  tournament,
  onCopyLink = null,
  compact = false,
}) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  if (!tournament?.id) return null;

  const copyInvite = async () => {
    setNote("");
    const text = scrimInviteCopy(tournament);
    const url = scrimDeskUrl(tournament);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        window.prompt("Copy this invite", text);
      }
      setNote("Invite copied");
      onCopyLink?.(url);
    } catch {
      window.prompt("Copy this invite", text);
    }
  };

  const shareFlyer = async () => {
    if (!canShareFlyerImage(tournament)) {
      setNote("Flyer share is for public or invite desks");
      return;
    }
    setBusy(true);
    setNote("");
    try {
      const canvas = await buildScrimFlyerCanvas(tournament);
      if (!canvas) {
        setNote("Couldn't build flyer");
        return;
      }
      const title = String(tournament.name || "Scrim").slice(0, 60);
      const shared = await shareCanvasPng(canvas, {
        title,
        text: scrimInviteCopy(tournament),
      });
      setNote(shared ? "Flyer ready" : "Flyer downloaded");
    } catch {
      setNote("Share failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 ${compact ? "" : "mt-3"}`}>
      <button
        type="button"
        onClick={copyInvite}
        className="inline-flex items-center gap-1.5 rounded-md border border-white/20 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-slate-200"
      >
        <Copy size={12} /> {scrimShareLabel(tournament)}
      </button>
      {canShareFlyerImage(tournament) ? (
        <button
          type="button"
          disabled={busy}
          onClick={shareFlyer}
          className="inline-flex items-center gap-1.5 rounded-md border border-neon/40 bg-neon/10 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-neon disabled:opacity-40"
        >
          <Share2 size={12} /> {busy ? "Building…" : "Share flyer"}
        </button>
      ) : null}
      {note ? <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500">{note}</span> : null}
    </div>
  );
}
