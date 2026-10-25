import { Link } from "react-router-dom";
import { Calendar, Gamepad2, MapPin, Monitor, Trophy, Users } from "lucide-react";
import { flyerForEvent } from "../../data/platformShowcase";
import { publicScopeKicker } from "../../data/eventScope";
import { useEventWindowPoster } from "../../hooks/useMediaLibrary";

const STATUS_STYLES = {
  upcoming: {
    label: "Upcoming",
    bg: "rgba(59, 130, 255, 0.22)",
    border: "rgba(59, 130, 255, 0.55)",
    color: "#9ec5ff",
  },
  live: {
    label: "Live",
    bg: "rgba(255, 45, 149, 0.22)",
    border: "rgba(255, 45, 149, 0.55)",
    color: "#ff9fd0",
  },
  completed: {
    label: "Completed",
    bg: "rgba(148, 163, 184, 0.18)",
    border: "rgba(148, 163, 184, 0.4)",
    color: "#cbd5e1",
  },
};

function formatDateRange(startAt, endAt) {
  const start = startAt ? new Date(startAt) : null;
  const end = endAt ? new Date(endAt) : null;
  const ok = (d) => d && !Number.isNaN(d.getTime());
  if (!ok(start) && !ok(end)) return "";
  const fmt = (d) =>
    d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  if (ok(start) && ok(end)) return `${fmt(start)} – ${fmt(end)}`;
  return fmt(ok(start) ? start : end);
}

/**
 * 3–4 line fact blurb. Cuts on sentence/word boundaries and never appends "...".
 */
export function windowFactBlurb(text, { maxChars = 300, maxSentences = 3 } = {}) {
  const raw = String(text || "")
    .replace(/\s+/g, " ")
    .replace(/(?:\.\.\.|…)+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!raw) return "";

  const sentences = raw
    .match(/[^.!?]+[.!?]+|[^.!?]+$/g)
    ?.map((part) => part.trim())
    .filter(Boolean) || [raw];

  let out = "";
  for (const sentence of sentences.slice(0, maxSentences)) {
    const next = out ? `${out} ${sentence}` : sentence;
    if (next.length > maxChars) break;
    out = next;
  }

  // Prefer complete sentences only — never trail with "..." / "…".
  if (out && /[.!?]$/.test(out)) return out;
  if (out) {
    const complete = out.match(/^[\s\S]+[.!?]/);
    if (complete) return complete[0].trim();
  }

  // Fall back to the first full sentence even if it runs a bit long.
  const first = sentences[0] || raw;
  if (/[.!?]$/.test(first) && first.length <= maxChars + 80) return first;
  if (first.length <= maxChars) return first.replace(/(?:\.\.\.|…)+\s*$/g, "").trim();

  const cut = first.slice(0, maxChars);
  const at = cut.lastIndexOf(" ");
  return (at > 90 ? cut.slice(0, at) : cut).trim();
}

function championOf(edition = {}) {
  return (
    edition.champion
    || edition.payouts?.[0]?.team
    || edition.payouts?.[0]?.player
    || ""
  );
}

function payoutRows(slide, edition, championshipGames = []) {
  const fromEdition = (edition?.payouts || [])
    .map((row) => ({
      team: row.team || row.player || "—",
      placement: row.rank || "",
      prize: row.prize || "",
    }))
    .filter((row) => row.team && row.team !== "—");
  if (fromEdition.length) return fromEdition.slice(0, 4);

  const fallback = [
    {
      team: slide.winners || edition?.champion,
      placement: "1st · Champions",
      prize: edition?.payouts?.[0]?.prize || "",
    },
    {
      team: slide.runnerUps || edition?.runnerUp,
      placement: "2nd · Runner-up",
      prize: edition?.payouts?.[1]?.prize || "",
    },
    {
      team: slide.secondRunnerUps,
      placement: "3rd Place",
      prize: edition?.payouts?.[2]?.prize || "",
    },
  ].filter((row) => row.team);
  if (fallback.length) return fallback;

  // EWC year windows: surface title champions across games.
  return championshipGames
    .map((game) => {
      const team = championOf(game);
      if (!team) return null;
      return {
        team,
        placement: game.game || "Title",
        prize: game.payouts?.[0]?.prize || game.prizePool || "",
      };
    })
    .filter(Boolean)
    .slice(0, 4);
}

function resolveStatus(slide, edition, payouts) {
  const raw = String(slide.eventStatus || slide.status || "").toLowerCase();
  if (raw === "live" || raw === "upcoming" || raw === "completed") return raw;
  if (slide.winners || edition?.champion || payouts.length) return "completed";
  if (slide.registrationUrl || slide.startAt || slide.startDate) return "upcoming";
  if (slide.surface === "ewc-window") {
    const year = Number(slide.championship?.year || slide.season || 0);
    return year && year > new Date().getFullYear() ? "upcoming" : "completed";
  }
  return "completed";
}

/** Past-event highlight or game fact — about 3–4 lines, complete sentences, no trailing "...". */
function buildFact(slide, edition, { champion, championPrize, prizePool, runnerUp, mvp, gameCount }) {
  const highlights = edition?.highlights || {};
  const pieces = [
    highlights.madeItLookEasy || edition?.madeItLookEasy,
    highlights.clutchesAndRivalries || edition?.clutchesAndRivalries,
    edition?.bestClutches || slide.bestClutches,
    slide.extraHighlights?.[0]?.milestone,
    highlights.lostComposure || edition?.lostComposure,
  ]
    .map((line) => String(line || "").replace(/\s+/g, " ").trim())
    .filter(Boolean);

  if (pieces.length) {
    // Prefer stacking 1–3 highlight beats into a short fact block.
    return windowFactBlurb(pieces.slice(0, 3).join(" "), { maxChars: 320, maxSentences: 3 });
  }

  const forged = [];
  if (champion && championPrize) forged.push(`${champion} walked away with ${championPrize}.`);
  else if (champion && prizePool) forged.push(`${champion} closed a ${prizePool} prize pool.`);
  else if (champion && runnerUp && String(runnerUp).length <= 36 && !/[.!]/.test(runnerUp)) {
    forged.push(`${champion} beat ${runnerUp} to lift the trophy.`);
  } else if (champion && mvp) forged.push(`${champion} crowned champions · MVP ${mvp}.`);
  else if (champion) forged.push(`${champion} stand as the reigning champions.`);

  if (edition?.event && edition?.year) {
    forged.push(`${edition.event} (${edition.year}) remains a landmark stop on the ${slide.game || "circuit"} calendar.`);
  } else if (prizePool) {
    forged.push(`Prize pool locked at ${prizePool}.`);
  } else if (slide.peakPrizePool) {
    forged.push(`Peak prize pool hit ${slide.peakPrizePool}.`);
  } else if (gameCount > 1) {
    forged.push(`${gameCount} championship titles under one roof.`);
  }

  if (forged.length) return windowFactBlurb(forged.join(" "), { maxChars: 320, maxSentences: 3 });
  return windowFactBlurb(slide.summary || slide.overview || edition?.event || "", { maxChars: 320, maxSentences: 3 });
}

export function windowCardModel(slide = {}) {
  const championshipGames = slide.championship?.games || [];
  const isGameVault = (slide.research || slide.surface === "research") && slide.spotlight !== true && slide.surface !== "ewc-window";
  const edition =
    slide.spotlightEdition
    || (!isGameVault ? (slide.editions || [])[0] : null)
    || championshipGames[0]
    || null;
  const payouts = payoutRows(slide, edition, championshipGames);
  const status = resolveStatus(slide, edition, payouts);

  const prizePool =
    edition?.prizePool
    || slide.prizePool
    || slide.peakPrizePool
    || slide.totalPrize
    || "";

  const champion =
    slide.winners
    || edition?.champion
    || edition?.payouts?.[0]?.team
    || edition?.payouts?.[0]?.player
    || payouts[0]?.team
    || "";

  const championPrize =
    edition?.payouts?.[0]?.prize
    || slide.championPrize
    || payouts[0]?.prize
    || "";

  const runnerUp =
    slide.runnerUps
    || edition?.runnerUp
    || edition?.payouts?.[1]?.team
    || edition?.payouts?.[1]?.player
    || payouts[1]?.team
    || "";

  const thirdPlace =
    slide.secondRunnerUps
    || edition?.payouts?.[2]?.team
    || edition?.payouts?.[2]?.player
    || payouts[2]?.team
    || "";

  const mvp = slide.mvp || edition?.mvp || "";
  const mvpPrize = slide.mvpPrize || "";

  const dateLabel =
    formatDateRange(slide.startAt, slide.endAt)
    || formatDateRange(slide.startDate, slide.endDate)
    || edition?.year
    || slide.season
    || "";

  const teams =
    slide.teamCount
    || slide.maxSlots
    || slide.teams
    || edition?.teamCount
    || edition?.totalTeams
    || "";

  const region = slide.region || slide.location || edition?.region || "";
  const mode = slide.mode || slide.format || (slide.online === false ? "LAN" : "");

  const fact = isGameVault
    ? windowFactBlurb(slide.overview || slide.summary || "", { maxChars: 320, maxSentences: 3 })
    : buildFact(slide, edition, {
      champion,
      championPrize,
      prizePool,
      runnerUp,
      mvp,
      gameCount: championshipGames.length,
    });

  const game = slide.game || slide.name || "";
  const isScrim = slide.surface === "scrim" || Boolean(slide.joinMode);
  const scrimTitle = slide.title || slide.name || "";
  // Per-edition windows (spotlights, EventTabs, championship titles) — not bare game-catalog cards.
  const eventFocused = Boolean(
    slide.spotlight === true
    || slide.surface === "ewc-window"
    || slide.spotlightEdition
    || (slide.eventName && !isGameVault),
  );
  const eventLabel = String(
    slide.eventName
    || edition?.event
    || (slide.title && slide.title !== game ? slide.title : "")
    || "",
  ).trim();
  const flyerBadges = Array.isArray(slide.flyerBadges) ? slide.flyerBadges : [];
  // Event windows: event name is the hero header; game · year sits underneath.
  const header = isScrim
    ? (scrimTitle || game || "Scrim")
    : (eventFocused && eventLabel ? eventLabel : (game || slide.title || "Tournament"));
  const eventName = isScrim
    ? (game && game !== scrimTitle ? game : "")
    : (eventFocused && eventLabel
      ? [game, dateLabel].filter((part) => part && String(part) !== eventLabel).join(" · ")
      : "");

  return {
    status,
    header,
    eventName,
    game,
    flyerBadges,
    kicker: isGameVault ? "" : (publicScopeKicker({ ...slide, eventScope: edition?.eventScope || slide.eventScope }) || ""),
    fact,
    prizePool: isGameVault ? (slide.peakPrizePool || prizePool) : prizePool,
    champion,
    championPrize,
    runnerUp,
    thirdPlace,
    dateLabel,
    teams,
    region,
    mode: mode || "Online",
    payouts,
    runnerPrize: payouts[1]?.prize || "",
    thirdPrize: payouts[2]?.prize || "",
    mvp,
    mvpPrize,
    registrationUrl: slide.registrationUrl || "",
    href: slide.href || (slide.slug ? `/vault/${slide.slug}` : slide.id ? `/tournaments/${slide.id}` : "/vault"),
    ctaLabel: status === "completed" ? "Open event" : "View tournament",
    vaultHref: slide.slug ? `/vault/${slide.slug}` : "",
  };
}

function StatusPill({ status }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.upcoming;
  return (
    <span
      className="inline-flex items-center rounded-md px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em]"
      style={{ background: style.bg, border: `1px solid ${style.border}`, color: style.color }}
    >
      {style.label}
    </span>
  );
}

const FLYER_BADGE_TONES = {
  neon: { bg: "rgba(57, 255, 20, 0.16)", border: "rgba(57, 255, 20, 0.45)", color: "#b8ff9a" },
  pink: { bg: "rgba(255, 45, 149, 0.18)", border: "rgba(255, 45, 149, 0.5)", color: "#ff9fd0" },
  blue: { bg: "rgba(59, 130, 255, 0.18)", border: "rgba(59, 130, 255, 0.5)", color: "#9ec5ff" },
  amber: { bg: "rgba(251, 191, 36, 0.16)", border: "rgba(251, 191, 36, 0.45)", color: "#fcd34d" },
  slate: { bg: "rgba(148, 163, 184, 0.14)", border: "rgba(148, 163, 184, 0.35)", color: "#cbd5e1" },
};

function FlyerBadges({ badges = [], compact }) {
  if (!badges.length) return null;
  return (
    <div className={`flex flex-wrap gap-1 ${compact ? "mt-1.5" : "mt-2"}`}>
      {badges.map((badge) => {
        const tone = FLYER_BADGE_TONES[badge.tone] || FLYER_BADGE_TONES.slate;
        return (
          <span
            key={badge.id || badge.label}
            className="inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.12em]"
            style={{ background: tone.bg, border: `1px solid ${tone.border}`, color: tone.color }}
          >
            {badge.label}
          </span>
        );
      })}
    </div>
  );
}

function MetaChip({ icon: Icon, children }) {
  if (!children) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-200/90">
      <Icon size={13} className="shrink-0 text-[var(--accent-secondary)]" />
      <span>{children}</span>
    </span>
  );
}

function FeatureOrb({ label, icon: Icon }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center">
      <span
        className="grid h-10 w-10 place-items-center rounded-full border"
        style={{
          borderColor: "rgba(59, 130, 255, 0.45)",
          background: "rgba(5, 10, 24, 0.72)",
          boxShadow: "0 0 16px rgba(59, 130, 255, 0.18)",
        }}
      >
        <Icon size={16} className="text-[var(--accent-secondary)]" />
      </span>
      <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-slate-300">{label}</span>
    </div>
  );
}

function FactLine({ fact, compact }) {
  if (!fact) return null;
  const text = compact
    ? windowFactBlurb(fact, { maxChars: 160, maxSentences: 2 })
    : fact;
  if (!text) return null;
  return (
    <p
      className={`mt-1.5 text-slate-100/95 ${compact ? "text-[12px] leading-[1.4]" : "mt-2 text-[13px] leading-snug"}`}
      style={{ textShadow: "0 1px 10px rgba(0,0,0,0.55)" }}
    >
      {text}
    </p>
  );
}

function UpcomingBody({ model, compact }) {
  return (
    <>
      <PlacePrizeLine model={model} compact={compact} />
      <FactLine fact={model.fact} compact={compact} />
      {!compact ? (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
          <MetaChip icon={Calendar}>{model.dateLabel}</MetaChip>
          <MetaChip icon={Gamepad2}>{model.game}</MetaChip>
          {model.teams ? <MetaChip icon={Users}>{`${model.teams} teams`}</MetaChip> : null}
          <MetaChip icon={Monitor}>{model.mode}</MetaChip>
        </div>
      ) : null}

      {!compact && (model.teams || model.mode) ? (
        <div className="mt-4 flex items-start justify-between gap-2">
          {model.teams ? <FeatureOrb icon={Users} label={`${model.teams} elite teams`} /> : null}
          {model.mode ? <FeatureOrb icon={Monitor} label={`${model.mode} event`} /> : null}
        </div>
      ) : null}
    </>
  );
}

function moneyKey(value = "") {
  return String(value || "").replace(/[\s,$]/g, "").toLowerCase();
}

function PlacePrizeLine({ model, compact }) {
  const place = String(model.region || "").trim();
  const pool = String(model.prizePool || "").trim();
  if (!place && !pool) return null;
  return (
    <p
      className={`mt-1 flex flex-wrap items-baseline gap-x-1.5 font-mono uppercase tracking-[0.08em] text-slate-200/90 ${
        compact ? "text-[10px]" : "text-[11px]"
      }`}
    >
      {place ? (
        <span className="inline-flex items-center gap-1">
          <MapPin size={compact ? 10 : 11} className="shrink-0 text-[var(--accent-secondary)]" aria-hidden />
          {place}
        </span>
      ) : null}
      {place && pool ? <span className="text-slate-500">·</span> : null}
      {pool ? (
        <span className="text-[var(--accent-secondary)]" style={{ textShadow: "0 0 12px rgba(59, 130, 255, 0.35)" }}>
          {pool} prize pool
        </span>
      ) : null}
    </p>
  );
}

function ChampionSpotlight({ model, compact }) {
  const pool = String(model.prizePool || "").trim();
  const won = String(model.championPrize || "").trim();
  // Prefer winner take next to the team; skip if it duplicates the pool figure.
  const showWon = Boolean(won) && moneyKey(won) !== moneyKey(pool);
  if (!model.champion && !showWon) return null;

  return (
    <div className={`mt-2 flex items-start gap-2 ${compact ? "gap-1.5" : "mt-3 gap-3"}`}>
      <span
        className={`grid shrink-0 place-items-center rounded-full ${compact ? "h-7 w-7" : "h-11 w-11"}`}
        style={{
          background: "linear-gradient(145deg, #f6d365, #fda085)",
          boxShadow: "0 0 18px rgba(253, 160, 133, 0.45)",
        }}
      >
        <Trophy size={compact ? 13 : 20} className="text-[#3a2208]" />
      </span>
      <div className="min-w-0">
        {model.champion ? (
          <div className={`font-['Bebas_Neue',sans-serif] uppercase tracking-wide text-white ${compact ? "text-[1.05rem] leading-tight" : "text-3xl"}`}>
            Champions: {model.champion}
            {showWon ? (
              <span
                className={`ml-1.5 inline text-[var(--accent-secondary)] ${compact ? "text-[0.92rem]" : "text-2xl"}`}
                style={{ textShadow: "0 0 18px rgba(59, 130, 255, 0.45)" }}
              >
                · Winners take {won}
              </span>
            ) : null}
          </div>
        ) : showWon ? (
          <div
            className={`font-['Bebas_Neue',sans-serif] tracking-wide text-[var(--accent-secondary)] ${compact ? "text-sm leading-tight" : "text-2xl"}`}
            style={{ textShadow: "0 0 18px rgba(59, 130, 255, 0.45)" }}
          >
            Winners take {won}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PayoutStrip({ model }) {
  const hasStrip = model.runnerUp || model.runnerPrize || model.thirdPlace || model.thirdPrize || model.mvp || model.mvpPrize;
  if (!hasStrip) return null;
  return (
    <div
      className="mt-3 grid grid-cols-3 gap-2 rounded-lg border px-2 py-2"
      style={{ borderColor: "rgba(59, 130, 255, 0.28)", background: "rgba(5, 10, 24, 0.55)" }}
    >
      <div className="min-w-0 text-center">
        <div className="font-mono text-[8px] uppercase tracking-widest text-slate-400">Runner-up</div>
        <div className="mt-0.5 truncate text-xs text-slate-100">
          {model.runnerUp || model.runnerPrize || "—"}
        </div>
        {model.runnerUp && model.runnerPrize ? (
          <div className="truncate text-[10px] text-[var(--accent-secondary)]">{model.runnerPrize}</div>
        ) : null}
      </div>
      <div className="min-w-0 text-center">
        <div className="font-mono text-[8px] uppercase tracking-widest text-slate-400">3rd place</div>
        <div className="mt-0.5 truncate text-xs text-slate-100">
          {model.thirdPlace || model.thirdPrize || "—"}
        </div>
        {model.thirdPlace && model.thirdPrize ? (
          <div className="truncate text-[10px] text-[var(--accent-secondary)]">{model.thirdPrize}</div>
        ) : null}
      </div>
      <div className="min-w-0 text-center">
        <div className="font-mono text-[8px] uppercase tracking-widest text-slate-400">MVP</div>
        <div className="mt-0.5 truncate text-xs text-slate-100">
          {model.mvp || model.mvpPrize || "—"}
        </div>
        {model.mvp && model.mvpPrize ? (
          <div className="truncate text-[10px] text-[var(--accent-secondary)]">{model.mvpPrize}</div>
        ) : null}
      </div>
    </div>
  );
}

function FinalistsTable({ rows, compact }) {
  if (!rows.length) return null;
  return (
    <div
      className={`mt-3 overflow-hidden rounded-lg border ${compact ? "mt-2" : ""}`}
      style={{ borderColor: "rgba(59, 130, 255, 0.28)", background: "rgba(5, 10, 24, 0.62)" }}
    >
      <div className="grid grid-cols-[1.4fr_1fr_0.8fr] gap-2 border-b border-white/10 px-3 py-1.5 font-mono text-[9px] uppercase tracking-widest text-slate-400">
        <span>Team</span>
        <span>Placement</span>
        <span className="text-right">Prize</span>
      </div>
      {rows.slice(0, compact ? 3 : 4).map((row, index) => (
        <div
          key={`${row.team}-${index}`}
          className="grid grid-cols-[1.4fr_1fr_0.8fr] gap-2 px-3 py-1.5 text-[11px]"
          style={
            index === 0
              ? { background: "linear-gradient(90deg, rgba(246, 211, 101, 0.28), rgba(246, 211, 101, 0.06))" }
              : undefined
          }
        >
          <span className="truncate font-medium text-white">{row.team}</span>
          <span className="truncate text-slate-300">{row.placement || "—"}</span>
          <span className="truncate text-right text-slate-200">{row.prize || "—"}</span>
        </div>
      ))}
    </div>
  );
}

function CompletedBody({ model, compact }) {
  return (
    <>
      <PlacePrizeLine model={model} compact={compact} />
      <ChampionSpotlight model={model} compact={compact} />
      <FactLine fact={model.fact} compact={compact} />
      {/* Dense compact windows: place/pool + champion + fact only so 2 cards fit on screen */}
      {!compact ? (
        <>
          <PayoutStrip model={model} />
          <FinalistsTable rows={model.payouts} compact={false} />
        </>
      ) : null}
    </>
  );
}

function LiveBody({ model, compact }) {
  return (
    <>
      <PlacePrizeLine model={model} compact={compact} />
      <FactLine fact={model.fact} compact={compact} />
      {!compact ? (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
          <MetaChip icon={Calendar}>{model.dateLabel}</MetaChip>
          <MetaChip icon={Gamepad2}>{model.game}</MetaChip>
          {model.teams ? <MetaChip icon={Users}>{`${model.teams} teams`}</MetaChip> : null}
        </div>
      ) : null}
    </>
  );
}

/** Shared compact window height — tall enough for poster faces + place/champion lines. */
export const WINDOW_CARD_HEIGHT = 380;

/**
 * Neon tournament window — full-bleed game poster, upcoming / live / completed layouts.
 */
export default function TournamentWindowCard({
  slide,
  compact = false,
  className = "",
  bookmark = null,
  to,
  onOpen,
}) {
  const model = windowCardModel(slide);
  const href = to || model.href;
  // Official event poster (edition / library event pack) wins; generated game art is last resort.
  const eventPoster = useEventWindowPoster(slide);
  const poster = eventPoster || flyerForEvent({
    ...slide,
    poster: slide.spotlightEdition?.poster || slide.poster,
    posterUrl: slide.spotlightEdition?.posterUrl || slide.posterUrl,
    images: slide.spotlightEdition?.images || slide.images,
    game: slide.game,
  });

  const open = (event) => {
    if (!onOpen) return;
    event.preventDefault();
    onOpen(event);
  };

  const shell = (
    <article
      className={`group relative isolate z-0 flex h-full max-h-full flex-col overflow-hidden rounded-2xl border transition ${className}`}
      style={{
        borderColor: "rgba(59, 130, 255, 0.45)",
        boxShadow: "0 0 0 1px rgba(59, 130, 255, 0.12), 0 18px 40px rgba(0, 0, 0, 0.45), 0 0 32px rgba(59, 130, 255, 0.12)",
        height: "100%",
        minHeight: compact ? WINDOW_CARD_HEIGHT : 420,
        maxHeight: compact ? "100%" : undefined,
      }}
    >
      <div className="absolute inset-0 overflow-hidden">
        {poster ? (
          <img
            src={poster}
            alt=""
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
            style={{ objectPosition: "50% 22%" }}
          />
        ) : (
          <div className="h-full w-full bg-[#050a18]" />
        )}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(5,10,24,0.35) 0%, rgba(5,10,24,0.55) 42%, rgba(5,10,24,0.92) 100%), linear-gradient(105deg, rgba(5,10,24,0.88) 0%, rgba(5,10,24,0.45) 55%, rgba(5,10,24,0.2) 100%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            background:
              "linear-gradient(135deg, transparent 40%, rgba(255,45,149,0.1) 70%, rgba(59,130,255,0.14) 100%)",
          }}
        />
      </div>

      <Link
        to={href}
        aria-label={`${model.header}${model.eventName ? ` · ${model.eventName}` : ""}`}
        className="absolute inset-0 z-[1]"
        onClick={onOpen ? open : undefined}
      />

      <div className={`relative z-[2] flex min-h-0 flex-1 flex-col pointer-events-none ${compact ? "p-3" : "p-5 md:p-6"}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <StatusPill status={model.status} />
            <FlyerBadges badges={model.flyerBadges} compact={compact} />
          </div>
          {bookmark ? <div className="pointer-events-auto">{bookmark}</div> : null}
        </div>

        {/* One game header (fixed size) + small event name — never a second duplicate title */}
        <h3
          className={`mt-2 line-clamp-2 max-w-[94%] font-['Bebas_Neue',sans-serif] uppercase leading-none tracking-wide text-[var(--accent)] ${
            compact ? "text-[1.45rem]" : "mt-3 text-[2rem]"
          }`}
          style={{ textShadow: "0 2px 18px rgba(0,0,0,0.65)" }}
        >
          {model.header}
        </h3>
        {model.eventName ? (
          <p className={`mt-1 line-clamp-2 font-mono uppercase tracking-[0.08em] text-slate-200/90 ${compact ? "text-[10px]" : "mt-1.5 text-[11px]"}`}>
            {model.eventName}
            {model.dateLabel ? ` · ${model.dateLabel}` : ""}
          </p>
        ) : null}

        <div className="mt-1 min-h-0 flex-1 overflow-hidden">
          {model.status === "completed" ? (
            <CompletedBody model={model} compact={compact} />
          ) : model.status === "live" ? (
            <LiveBody model={model} compact={compact} />
          ) : (
            <UpcomingBody model={model} compact={compact} />
          )}
        </div>

        {/* Compact windows are fully clickable — no footer CTAs crowding the poster. */}
        {!compact ? (
          <div className="pointer-events-auto mt-auto mt-4 flex flex-col gap-2 pt-2">
            <Link
              to={href}
              onClick={onOpen ? open : undefined}
              className="inline-flex w-full items-center justify-center rounded-lg border px-3 py-2.5 text-center font-mono text-[10px] uppercase tracking-[0.14em] no-underline transition hover:bg-[rgba(59,130,255,0.12)]"
              style={{
                borderColor: "rgba(59, 130, 255, 0.65)",
                color: "#9ec5ff",
              }}
            >
              {model.ctaLabel}
            </Link>
            {model.status === "upcoming" && model.registrationUrl ? (
              <a
                href={model.registrationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center rounded-lg px-3 py-2.5 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-white no-underline"
                style={{
                  background: "linear-gradient(90deg, #ff2d95, #ff5eb0)",
                  boxShadow: "0 0 22px rgba(255, 45, 149, 0.35)",
                }}
              >
                Register
              </a>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );

  return shell;
}
