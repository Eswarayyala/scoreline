import { useEffect, useState } from "react";

function partsUntil(targetMs) {
  const diff = Math.max(0, Number(targetMs) - Date.now());
  const totalSec = Math.floor(diff / 1000);
  return {
    done: diff <= 0,
    days: Math.floor(totalSec / 86400),
    hours: Math.floor((totalSec % 86400) / 3600),
    minutes: Math.floor((totalSec % 3600) / 60),
    seconds: totalSec % 60,
  };
}

/** Live countdown until `target` (Date, ms, or parseable string). Tailwind + CSS vars friendly. */
export default function Countdown({ target, label = "Starts in", className = "" }) {
  const targetMs = typeof target === "number" ? target : Date.parse(target || "") || 0;
  const [parts, setParts] = useState(() => partsUntil(targetMs));

  useEffect(() => {
    if (!targetMs) return undefined;
    setParts(partsUntil(targetMs));
    const id = window.setInterval(() => setParts(partsUntil(targetMs)), 1000);
    return () => window.clearInterval(id);
  }, [targetMs]);

  if (!targetMs) return null;

  return (
    <div className={`rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 ${className}`}>
      <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">{parts.done ? "Live / started" : label}</p>
      {!parts.done && (
        <p className="mt-1 font-mono text-sm text-amber-300">
          {parts.days > 0 ? `${parts.days}d ` : ""}
          {String(parts.hours).padStart(2, "0")}:{String(parts.minutes).padStart(2, "0")}:{String(parts.seconds).padStart(2, "0")}
        </p>
      )}
    </div>
  );
}
