import { Link } from "react-router-dom";
import { allGameThemes, gameDeskPath } from "../../data/gameThemes";
import FocusRail from "../motion/FocusRail";

const HOME_GAMES = [
  "Valorant",
  "CS2",
  "League of Legends",
  "Dota 2",
  "Apex Legends",
  "BGMI",
  "Overwatch 2",
  "Rocket League",
  "Free Fire",
  "Mobile Legends: Bang Bang",
];

const RAIL_HEIGHT = 280;

/** Home: horizontal focus strip. Full /games page uses vertical FocusRail. */
export default function GameThemeRail() {
  const themes = allGameThemes().filter((theme) => HOME_GAMES.includes(theme.game));
  const ordered = HOME_GAMES.map((name) => themes.find((t) => t.game === name)).filter(Boolean);

  return (
    <section className="relative z-20 mt-8">
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <div>
          <p className="m-0 font-mono text-[10px] uppercase tracking-[0.18em] text-neon">Play desks</p>
          <h2 className="m-0 font-['Bebas_Neue',sans-serif] text-3xl tracking-wide text-white">Games</h2>
        </div>
        <Link
          to="/games"
          className="font-mono text-[10px] uppercase tracking-widest text-neon no-underline"
        >
          All titles
        </Link>
      </div>

      <FocusRail
        items={ordered}
        axis="x"
        ariaLabel="Game desks"
        height={RAIL_HEIGHT}
        slotWidth="min(168px, 44vw)"
        focusScale={1.16}
        peerScale={0.82}
        getKey={(theme) => theme.slug}
        renderItem={(theme, { focused }) => (
          <Link
            to={gameDeskPath(theme.game)}
            className="relative block h-full w-full overflow-hidden text-inherit no-underline"
            style={{ borderColor: `${theme.accent}55` }}
            onClick={(event) => {
              if (!focused) event.preventDefault();
            }}
          >
            <img
              src={theme.poster || theme.background}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(180deg, transparent 28%, ${theme.ink}f2 100%), radial-gradient(circle at 50% 0%, ${theme.glow}, transparent 55%)`,
              }}
            />
            <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
              <p
                className="m-0 font-mono text-[9px] uppercase tracking-widest"
                style={{ color: theme.accent }}
              >
                {theme.mood}
              </p>
              <h3
                className={`mt-0.5 font-['Bebas_Neue',sans-serif] leading-none tracking-wide text-white ${
                  focused ? "text-3xl" : "text-xl"
                }`}
              >
                {theme.game}
              </h3>
            </div>
          </Link>
        )}
      />
    </section>
  );
}
