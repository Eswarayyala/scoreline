import { Link } from "react-router-dom";
import { Calendar, Gamepad2, MapPin, Monitor, Trophy, Users } from "lucide-react";
import { flyerForEvent } from "../../data/platformShowcase";
import { publicScopeKicker } from "../../data/eventScope";
import { useGameBanner } from "../../hooks/useMediaLibrary";

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

function clipFact(text, max = 132) {
  const raw = String(text || "").replace(/\s+/g, " ").trim();
  if (!raw) return "";
  if (raw.length <= max) return raw;
  const cut = raw.slice(0, max - 1);
  const at = cut.lastIndexOf(" ");
  return `${(at > 60 ? cut.slice(0, at) : cut).trim()}…`;
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

/** Punchy one-liner — highlight fact first, then forged from results. */
function buildFact(slide, edition, { champion, championPrize, prizePool, runnerUp, mvp, gameCount }) {
  const highlights = edition?.highlights || {};
  const candidates = [
    highlights.madeItLookEasy,
    edition?.madeItLookEasy,
    highlights.clutchesAndRivalries,
    edition?.clutchesAndRivalries,
    edition?.bestClutches,
    slide.bestClutches,
    slide.extraHighlights?.[0]?.milestone,
  ]
    .map((line) => clipFact(line))
    .filter(Boolean);

  if (candidates[0]) return candidates[0];

  if (champion && championPrize) {
    return `${champion} walked away with ${championPrize}.`;
  }
  if (champion && prizePool) {
    return `${champion} closed a ${prizePool} prize pool.`;
  }
  if (champion && runnerUp) {
    return `${champion} beat ${runnerUp} to lift the trophy.`;
  }
  if (champion && mvp) {
    return `${champion} crowned champions · MVP ${mvp}.`;
  }
  if (champion) {
    return `${champion} stand as the reigning champions.`;
  }
  if (gameCount > 1 && prizePool) {
    return `${gameCount} titles · peak pool ${prizePool}.`;
  }
  if (gameCount > 1) {
    return `${gameCount} championship titles under one roof.`;
  }
  if (prizePool) {
    return `Prize pool locked at ${prizePool}.`;
  }
  if (slide.peakPrizePool) {
    return `Peak prize pool hit ${slide.peakPrizePool}.`;
  }
  return clipFact(slide.summary || edition?.event || "");
}

export function windowCardModel(slide = {}) {
  const championshipGames = slide.championship?.games || [];
  const edition = (slide.editions || [])[0] || championshipGames[0] || null;
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
    || slide.season
    || edition?.year
    || edition?.event
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

  const fact = buildFact(slide, edition, {
    champion,
    championPrize,
    prizePool,
    runnerUp,
    mvp,
    gameCount: championshipGames.length,
  });

  return {
    status,
    title: slide.title || slide.name || slide.game || "Tournament",
    game: slide.game || "",
    kicker: publicScopeKicker(slide) || slide.kicker || "",
    fact,
    prizePool,
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
    ctaLabel: status === "completed" ? "View match details" : "View tournament",
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

function FactLine({ fact }) {
  if (!fact) return null;
  return (
    <p
      className="mt-2 text-[13px] leading-snug text-slate-100/95"
      style={{ textShadow: "0 1px 10px rgba(0,0,0,0.55)" }}
    >
      {fact}
    </p>
  );
}

function UpcomingBody({ model, compact }) {
  return (
    <>
      <FactLine fact={model.fact} />
      <div className={`mt-3 flex flex-wrap gap-x-4 gap-y-2 ${compact ? "text-[11px]" : ""}`}>
        <MetaChip icon={Calendar}>{model.dateLabel}</MetaChip>
        <MetaChip icon={Gamepad2}>{model.game}</MetaChip>
        {model.teams ? <MetaChip icon={Users}>{`${model.teams} teams`}</MetaChip> : null}
        <MetaChip icon={Monitor}>{model.mode}</MetaChip>
        {model.region ? <MetaChip icon={MapPin}>{model.region}</MetaChip> : null}
      </div>

      {model.prizePool ? (
        <div
          className={`mt-4 rounded-xl border px-4 py-3 text-center ${compact ? "py-2.5" : "py-4"}`}
          style={{
            borderColor: "rgba(59, 130, 255, 0.55)",
            background: "rgba(5, 10, 24, 0.78)",
            boxShadow: "0 0 24px rgba(59, 130, 255, 0.2), inset 0 0 20px rgba(59, 130, 255, 0.08)",
          }}
        >
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--accent-secondary)]">
            Total prize pool
          </div>
          <div
            className={`mt-1 font-['Bebas_Neue',sans-serif] tracking-wide text-white ${compact ? "text-4xl" : "text-5xl md:text-6xl"}`}
            style={{ textShadow: "0 0 28px rgba(255,255,255,0.25)" }}
          >
            {model.prizePool}
          </div>
        </div>
      ) : null}

      {!compact && (model.teams || model.mode || model.region) ? (
        <div className="mt-4 flex items-start justify-between gap-2">
          {model.teams ? <FeatureOrb icon={Users} label={`${model.teams} elite teams`} /> : null}
          {model.mode ? <FeatureOrb icon={Monitor} label={`${model.mode} event`} /> : null}
          {model.region ? <FeatureOrb icon={MapPin} label={model.region} /> : null}
        </div>
      ) : null}
    </>
  );
}

function ChampionSpotlight({ model, compact }) {
  if (!model.champion && !model.championPrize) return null;
  return (
    <div className={`mt-3 flex items-center gap-3 ${compact ? "gap-2" : ""}`}>
      <span
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full"
        style={{
          background: "linear-gradient(145deg, #f6d365, #fda085)",
          boxShadow: "0 0 18px rgba(253, 160, 133, 0.45)",
        }}
      >
        <Trophy size={20} className="text-[#3a2208]" />
      </span>
      <div className="min-w-0">
        {model.champion ? (
          <div className={`font-['Bebas_Neue',sans-serif] uppercase tracking-wide text-white ${compact ? "text-2xl" : "text-3xl"}`}>
            Champions: {model.champion}
          </div>
        ) : null}
        {model.championPrize ? (
          <div
            className={`font-['Bebas_Neue',sans-serif] tracking-wide text-[var(--accent-secondary)] ${compact ? "text-2xl" : "text-3xl"}`}
            style={{ textShadow: "0 0 18px rgba(59, 130, 255, 0.45)" }}
          >
            {model.championPrize} won
          </div>
        ) : model.prizePool ? (
          <div
            className={`font-['Bebas_Neue',sans-serif] tracking-wide text-[var(--accent-secondary)] ${compact ? "text-xl" : "text-2xl"}`}
            style={{ textShadow: "0 0 18px rgba(59, 130, 255, 0.45)" }}
          >
            {model.prizePool} circuit
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
      <ChampionSpotlight model={model} compact={compact} />
      <FactLine fact={model.fact} />
      <PayoutStrip model={model} />
      <FinalistsTable rows={model.payouts} compact={compact} />
      {compact ? (
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-300">
          <MetaChip icon={Calendar}>{model.dateLabel}</MetaChip>
          <MetaChip icon={Gamepad2}>{model.game}</MetaChip>
        </div>
      ) : null}
    </>
  );
}

function LiveBody({ model, compact }) {
  return (
    <>
      <FactLine fact={model.fact} />
      <div className={`mt-3 flex flex-wrap gap-x-4 gap-y-2 ${compact ? "text-[11px]" : ""}`}>
        <MetaChip icon={Calendar}>{model.dateLabel}</MetaChip>
        <MetaChip icon={Gamepad2}>{model.game}</MetaChip>
        {model.teams ? <MetaChip icon={Users}>{`${model.teams} teams`}</MetaChip> : null}
      </div>
      {model.prizePool ? (
        <div
          className="mt-4 rounded-xl border px-4 py-3 text-center"
          style={{
            borderColor: "rgba(255, 45, 149, 0.45)",
            background: "rgba(5, 10, 24, 0.78)",
            boxShadow: "0 0 24px rgba(255, 45, 149, 0.18)",
          }}
        >
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--accent)]">On air · prize pool</div>
          <div className={`mt-1 font-['Bebas_Neue',sans-serif] tracking-wide text-white ${compact ? "text-4xl" : "text-5xl"}`}>
            {model.prizePool}
          </div>
        </div>
      ) : null}
    </>
  );
}

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
  const resolved = flyerForEvent(slide);
  const poster = useGameBanner(slide.game, resolved);

  const open = (event) => {
    if (!onOpen) return;
    event.preventDefault();
    onOpen(event);
  };

  const shell = (
    <article
      className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border transition ${className}`}
      style={{
        borderColor: "rgba(59, 130, 255, 0.45)",
        boxShadow: "0 0 0 1px rgba(59, 130, 255, 0.12), 0 18px 40px rgba(0, 0, 0, 0.45), 0 0 32px rgba(59, 130, 255, 0.12)",
        minHeight: compact ? 420 : 460,
      }}
    >
      <div className="absolute inset-0">
        {poster ? (
          <img
            src={poster}
            alt=""
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
            style={{ objectPosition: "70% center" }}
          />
        ) : (
          <div className="h-full w-full bg-[#050a18]" />
        )}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(105deg, rgba(5,10,24,0.94) 0%, rgba(5,10,24,0.84) 40%, rgba(5,10,24,0.5) 68%, rgba(5,10,24,0.28) 100%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "linear-gradient(135deg, transparent 40%, rgba(255,45,149,0.12) 70%, rgba(59,130,255,0.18) 100%)",
          }}
        />
      </div>

      <Link
        to={href}
        aria-label={model.title}
        className="absolute inset-0 z-[1]"
        onClick={onOpen ? open : undefined}
      />

      <div className={`relative z-[2] flex flex-1 flex-col pointer-events-none ${compact ? "p-4" : "p-5 md:p-6"}`}>
        <div className="flex items-start justify-between gap-2">
          <StatusPill status={model.status} />
          {bookmark ? <div className="pointer-events-auto">{bookmark}</div> : null}
        </div>

        <h3
          className={`mt-3 max-w-[92%] font-['Bebas_Neue',sans-serif] uppercase leading-[0.92] tracking-wide text-white ${
            compact ? "text-[2rem]" : "text-[2.35rem] md:text-[2.75rem]"
          }`}
          style={{ textShadow: "0 2px 18px rgba(0,0,0,0.65)" }}
        >
          {model.title}
        </h3>

        <div className="mt-1 flex-1">
          {model.status === "completed" ? (
            <CompletedBody model={model} compact={compact} />
          ) : model.status === "live" ? (
            <LiveBody model={model} compact={compact} />
          ) : (
            <UpcomingBody model={model} compact={compact} />
          )}
        </div>

        <div className={`pointer-events-auto mt-4 flex flex-wrap gap-2 ${compact ? "mt-3" : ""}`}>
          <Link
            to={href}
            onClick={onOpen ? open : undefined}
            className="inline-flex flex-1 items-center justify-center rounded-lg border px-3 py-2.5 text-center font-mono text-[10px] uppercase tracking-[0.14em] no-underline transition hover:bg-[rgba(59,130,255,0.12)]"
            style={{
              borderColor: "rgba(59, 130, 255, 0.65)",
              color: "#9ec5ff",
              minWidth: compact ? "100%" : 140,
            }}
          >
            {model.ctaLabel}
          </Link>
          {model.status === "upcoming" && model.registrationUrl ? (
            <a
              href={model.registrationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-1 items-center justify-center rounded-lg px-3 py-2.5 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-white no-underline"
              style={{
                background: "linear-gradient(90deg, #ff2d95, #ff5eb0)",
                boxShadow: "0 0 22px rgba(255, 45, 149, 0.35)",
                minWidth: compact ? "100%" : 120,
              }}
            >
              Register
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );

  return shell;
}
