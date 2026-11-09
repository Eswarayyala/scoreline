import { motion, useReducedMotion } from "motion/react";
import VaultCarousel from "../vault/VaultCarousel";
import GameThemeRail from "../games/GameThemeRail";
import HomeDeskCta from "./HomeDeskCta";
import { fadeUp } from "../../motion/presets";

export default function PlatformHome({
  slides,
  children,
  showVault = false,
  showGames = true,
  signedIn = false,
  onHost = null,
  onSignIn = null,
}) {
  const reduce = useReducedMotion();
  return (
    <div className="relative isolate pb-10 pt-2">
      <HomeDeskCta signedIn={signedIn} onHost={onHost} onSignIn={onSignIn} />
      {showVault ? <VaultCarousel slides={slides} /> : null}
      <motion.div {...fadeUp(reduce, 0.12)}>
        {children}
      </motion.div>
      {showGames ? <GameThemeRail /> : null}
    </div>
  );
}
