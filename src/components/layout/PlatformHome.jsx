import { motion, useReducedMotion } from "framer-motion";
import VaultCarousel from "../vault/VaultCarousel";
import GameThemeRail from "../games/GameThemeRail";
import { fadeUp } from "../../motion/presets";

export default function PlatformHome({ slides, children }) {
  const reduce = useReducedMotion();
  return (
    <div className="relative isolate pb-10 pt-2">
      <VaultCarousel slides={slides} />
      <motion.div {...fadeUp(reduce, 0.12)}>
        {children}
      </motion.div>
      <GameThemeRail />
    </div>
  );
}
