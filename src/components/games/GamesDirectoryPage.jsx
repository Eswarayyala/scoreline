import { Link } from "react-router-dom";
import PageEnter from "../motion/PageEnter";
import SectionBackHome from "../layout/SectionBackHome";
import GameCommunityStrip from "./GameCommunityStrip";
import FocusRail from "../motion/FocusRail";
import { allGameThemes, gameDeskPath } from "../../data/gameThemes";
import { DISCORD_SURFACE } from "../../data/discordCommunity";

const CARD_H = 360;

/** Full Games catalog — vertical focus rail (home strip stays horizontal). */
export default function GamesDirectoryPage() {
  const themes = allGameThemes();

  return (
    <PageEnter className="pb-28 pt-6">
      <SectionBackHome />
      <header className="mb-4 mt-2">
        <p className="m-0 font-mono text-[11px] uppercase tracking-[0.2em] text-neon">Title desks</p>
        <h1 className="mt-1 font-['Bebas_Neue',sans-serif] text-5xl tracking-wide text-white md:text-6xl">
          Games
        </h1>
        <p className="mt-2 max-w-xl text-sm text-slate-400">
          Scroll the stack — the centered desk expands. Open a title for its vault windows and scrims.
        </p>
      </header>

      <FocusRail
        items={themes}
        axis="y"
        ariaLabel="All game desks"
        height={CARD_H}
        slotHeight={CARD_H}
        slotWidth="min(100%, 340px)"
        focusScale={1.1}
        peerScale={0.86}
        viewportMax="min(78vh, 720px)"
        getKey={(theme) => theme.slug}
        renderItem={(theme, { focused }) => (
          <Link
            to={gameDeskPath(theme.game)}
            className="relative block h-full w-full overflow-hidden text-inherit no-underline"
            style={{
              borderColor: `${theme.accent}55`,
              boxShadow: `inset 0 0 0 1px ${theme.accent}22`,
            }}
            onClick={(event) => {
              if (!focused) event.preventDefault();
            }}
          >
            <img
              src={theme.poster || theme.background}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              style={{ objectPosition: "50% 18%" }}
            />
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(180deg, ${theme.ink}22 0%, ${theme.ink}88 48%, ${theme.ink}f2 100%), radial-gradient(circle at 80% 12%, ${theme.glow}, transparent 42%)`,
              }}
            />
            <div className="relative z-10 flex h-full flex-col justify-end p-5">
              <p className="m-0 font-mono text-[10px] uppercase tracking-widest" style={{ color: theme.accent }}>
                {theme.mood}
              </p>
              <h2
                className={`mt-1 font-['Bebas_Neue',sans-serif] leading-none tracking-wide text-white ${
                  focused ? "text-4xl" : "text-3xl"
                }`}
              >
                {theme.game}
              </h2>
              <p className="mt-2 line-clamp-2 text-xs text-white/75">{theme.tagline}</p>
            </div>
          </Link>
        )}
      />

      {DISCORD_SURFACE ? (
        <div className="mt-12">
          <GameCommunityStrip />
        </div>
      ) : null}
    </PageEnter>
  );
}
