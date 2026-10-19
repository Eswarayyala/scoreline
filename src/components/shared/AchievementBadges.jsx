import { useMemo } from "react";

function styleBlob(player = {}) {
  return [player.style, ...(Array.isArray(player.styles) ? player.styles : [])].filter(Boolean).join(" ");
}

const BADGE_DEFS = [
  { id: "igl", label: "IGL", test: (p) => /igl/i.test(styleBlob(p)) },
  { id: "entry", label: "Entry", test: (p) => /entry/i.test(styleBlob(p)) },
  { id: "sniper", label: "Sniper", test: (p) => /sniper/i.test(styleBlob(p)) },
  { id: "support", label: "Support", test: (p) => /support/i.test(styleBlob(p)) },
  { id: "competitive", label: "Competitive", test: (p) => /competitive/i.test(styleBlob(p)) || (p.lookingFor || []).includes("Competitive") || /pro/i.test(p.rank || "") },
  { id: "casual", label: "Casual", test: (p) => /casual/i.test(styleBlob(p)) || (p.lookingFor || []).includes("Casual") },
  { id: "mvp", label: "MVP", test: (p) => (p.badges || []).includes("MVP") || p.titles >= 1 },
  { id: "clutch", label: "Clutch Master", test: (p) => (p.badges || []).includes("Clutch Master") || /clutch/i.test(p.bio || "") },
  { id: "discoverable", label: "Looking", test: (p) => p.discoverable === true },
];

export function badgesForPlayer(player = {}) {
  return BADGE_DEFS.filter((badge) => badge.test(player)).map((badge) => badge.label);
}

/** Visual achievement chips from existing profile / dossier fields. */
export default function AchievementBadges({ player, extra = [] }) {
  const badges = useMemo(() => [...new Set([...badgesForPlayer(player), ...extra])], [player, extra]);
  if (!badges.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {badges.map((label) => (
        <span
          key={label}
          className="rounded-full border border-amber-400/35 bg-amber-400/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-amber-300"
        >
          {label}
        </span>
      ))}
    </div>
  );
}

/** SVG placement trend — no chart library required. Lower placement = better (drawn inverted). */
export function PlacementTrendGraph({ placements = [], className = "" }) {
  const points = (placements.length ? placements : [8, 5, 3, 4, 2, 1]).map((value) => Math.max(1, Number(value) || 1));
  const max = Math.max(...points, 1);
  const width = 280;
  const height = 88;
  const pad = 8;
  const coords = points.map((value, index) => {
    const x = pad + (index / Math.max(points.length - 1, 1)) * (width - pad * 2);
    const y = pad + ((value - 1) / Math.max(max - 1, 1)) * (height - pad * 2);
    return [x, y];
  });
  const path = coords.map(([x, y], index) => `${index === 0 ? "M" : "L"}${x},${y}`).join(" ");

  return (
    <div className={`rounded-2xl border border-white/10 bg-slate-950/50 p-3 ${className}`}>
      <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Placement trend</p>
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-2 h-24 w-full" role="img" aria-label="Placement trend">
        <path d={path} fill="none" stroke="currentColor" strokeWidth="2.5" className="text-neon" />
        {coords.map(([x, y], index) => (
          <circle key={`${x}-${y}-${index}`} cx={x} cy={y} r="3.5" className="fill-amber-300" />
        ))}
      </svg>
      <p className="mt-1 font-mono text-[10px] text-slate-500">Recent finishes · lower is better</p>
    </div>
  );
}
