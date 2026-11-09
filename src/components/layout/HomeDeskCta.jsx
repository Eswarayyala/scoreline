import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import { fadeUp } from "../../motion/presets";

/**
 * First-viewport desk CTA: brand + one job + Host / Find lobby.
 * Vault carousel and hub tiles stay below this composition.
 */
export default function HomeDeskCta({
  signedIn = false,
  onHost = null,
  onSignIn = null,
}) {
  const navigate = useNavigate();
  const reduce = useReducedMotion();

  return (
    <motion.section
      className="relative isolate mb-6 overflow-hidden border border-white/10 bg-gradient-to-br from-black/50 via-[color-mix(in_srgb,var(--accent)_12%,transparent)] to-black/40 px-5 py-10 sm:mb-8 sm:px-8 sm:py-14"
      {...fadeUp(reduce, 0)}
    >
      <p className="m-0 font-mono text-[10px] uppercase tracking-[0.22em] text-neon sm:text-[11px]">
        India competitive desk
      </p>
      <h1 className="mt-3 font-['Bebas_Neue',sans-serif] text-[clamp(3.4rem,12vw,5.5rem)] leading-[0.88] tracking-[0.04em] text-white">
        GRINDINFO
      </h1>
      <p className="mt-3 max-w-md text-sm text-slate-300 sm:text-base">
        Find a lobby. Check in. Play.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => navigate("/tournaments", { state: { fromHome: true } })}
          className="border border-[var(--accent)] bg-[var(--accent)] px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest text-[var(--accent-contrast)]"
        >
          Find a lobby
        </button>
        <button
          type="button"
          onClick={() => {
            if (!signedIn) {
              onSignIn?.();
              return;
            }
            onHost?.();
          }}
          className="border border-white/20 bg-transparent px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest text-slate-100 hover:border-neon/50 hover:text-neon"
        >
          {signedIn ? "Host scrim" : "Sign in to host"}
        </button>
      </div>
    </motion.section>
  );
}
