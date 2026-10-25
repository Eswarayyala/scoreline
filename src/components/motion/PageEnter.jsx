import { motion, useReducedMotion } from "framer-motion";
import { pageEnter } from "../../motion/presets";

/** Soft route enter — same feel as vault window reveals. */
export default function PageEnter({ children, className = "", style }) {
  const reduce = useReducedMotion();
  return (
    <motion.div className={className} style={style} {...pageEnter(reduce)}>
      {children}
    </motion.div>
  );
}
