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

/** Compact inline chips — no panel, no graph, stays out of list layout. */
export default function AchievementBadges({ player, extra = [] }) {
  const badges = useMemo(() => [...new Set([...badgesForPlayer(player), ...extra])].slice(0, 4), [player, extra]);
  if (!badges.length) return null;
  return (
    <div className="inline-flex max-w-full flex-wrap items-center gap-1" aria-label="Badges">
      {badges.map((label) => (
        <span
          key={label}
          className="rounded border border-neon/25 px-1.5 py-px font-mono text-[9px] uppercase tracking-wider text-neon/90"
        >
          {label}
        </span>
      ))}
    </div>
  );
}
