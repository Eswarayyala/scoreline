import { Link } from "react-router-dom";
import { ExternalLink, MessagesSquare } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { discordForGame } from "../../data/discordCommunity";
import { fadeUp, tapPress } from "../../motion/presets";

/**
 * Soft Discord + in-app desk entry for a game (or global when game is empty).
 */
export default function GameCommunityStrip({
  game = "",
  accent = "var(--color-neon, #7dffb3)",
  accentSecondary = "#e8e8e8",
  ink = "#0a0e16",
}) {
  const reduce = useReducedMotion();
  const discord = discordForGame(game);
  const hasInvite = Boolean(discord.inviteUrl);

  return (
    <motion.section
      {...fadeUp(reduce, 0.12)}
      className="relative overflow-hidden border border-white/10 px-5 py-6 sm:px-6"
      style={{
        borderColor: `${accent}44`,
        background: `linear-gradient(135deg, ${ink}ee 0%, ${ink}99 55%, transparent 100%), radial-gradient(circle at 92% 20%, ${accent}33, transparent 45%)`,
      }}
    >
      <p className="m-0 font-mono text-[10px] uppercase tracking-widest" style={{ color: accent }}>
        Community · {discord.channelLabel}
      </p>
      <h2 className="mt-1 font-['Bebas_Neue',sans-serif] text-3xl tracking-wide text-white sm:text-4xl">
        {discord.headline}
      </h2>
      <p className="mt-2 max-w-lg text-sm leading-relaxed text-white/75">
        {discord.blurb}
      </p>

      <div className="mt-5 flex flex-wrap gap-3">
        {hasInvite ? (
          <motion.a
            href={discord.inviteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-2 px-5 font-mono text-[11px] uppercase tracking-widest no-underline"
            style={{ background: accent, color: ink }}
            whileTap={tapPress}
          >
            <MessagesSquare size={14} aria-hidden />
            Join Discord
            <ExternalLink size={12} aria-hidden />
          </motion.a>
        ) : null}
        <Link
          to="/desk"
          className="inline-flex min-h-11 items-center border px-5 font-mono text-[11px] uppercase tracking-widest text-white no-underline"
          style={{ borderColor: `${accent}88`, color: accentSecondary }}
        >
          Community desk
        </Link>
      </div>

      {!hasInvite ? (
        <p className="mt-3 max-w-md font-mono text-[10px] uppercase tracking-widest text-white/45">
          Discord invite pending · add your handle in Account for now
        </p>
      ) : null}
    </motion.section>
  );
}
