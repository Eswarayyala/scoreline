import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  DEFAULT_LOGO_ID,
  getLogoOption,
  LOGO_STORAGE_KEY,
  readStoredLogoId,
  writeStoredLogoId,
} from "./logoCollection";

/** Full logo asset (collection lockup) — no separate wordmark text. */
export function GrindInfoMark({ height = 40, className = "" }) {
  const [id, setId] = useState(DEFAULT_LOGO_ID);
  useEffect(() => {
    const current = readStoredLogoId();
    if (!localStorage.getItem(LOGO_STORAGE_KEY)) {
      writeStoredLogoId(DEFAULT_LOGO_ID);
    }
    setId(current);
    const onStorage = (e) => {
      if (e.key === LOGO_STORAGE_KEY) setId(readStoredLogoId());
    };
    const onCustom = () => setId(readStoredLogoId());
    window.addEventListener("storage", onStorage);
    window.addEventListener("grindinfo-logo-change", onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("grindinfo-logo-change", onCustom);
    };
  }, []);
  const opt = getLogoOption(id);
  const neonBlack = opt.id === "score-rail-black";
  const wideLockup = opt.id === "console-final";
  return (
    <img
      className={className}
      src={opt.src || opt.markSrc}
      alt="GrindInfo"
      height={height}
      style={{
        height,
        width: "auto",
        maxWidth: Math.round(height * (wideLockup ? 5.6 : 3.2)),
        objectFit: "contain",
        display: "block",
        filter: neonBlack
          ? "drop-shadow(0 0 6px rgba(10,10,10,0.45)) drop-shadow(0 0 14px rgba(59,130,255,0.28))"
          : undefined,
      }}
      draggable={false}
    />
  );
}

/**
 * Header brand: full logo only. Click hard-reloads the whole page.
 */
export default function GrindInfoLogo({
  size = "md",
  className = "",
}) {
  const reduce = useReducedMotion();
  const heights = { sm: 36, md: 48, lg: 60 };
  const h = heights[size] || heights.md;

  const reload = (event) => {
    event.preventDefault();
    event.stopPropagation();
    window.location.reload();
  };

  return (
    <motion.button
      type="button"
      onClick={reload}
      aria-label="GrindInfo — reload page"
      title="Reload page"
      className={`inline-flex items-center border-0 bg-transparent p-0 ${className}`}
      style={{ cursor: "pointer", lineHeight: 0 }}
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduce ? 0.12 : 0.35 }}
      whileHover={reduce ? undefined : { scale: 1.03 }}
      whileTap={reduce ? undefined : { scale: 0.98 }}
    >
      <GrindInfoMark height={h} />
    </motion.button>
  );
}
