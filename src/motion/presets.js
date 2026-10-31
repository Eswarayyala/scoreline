/** Shared motion language from vault windows — keep surfaces consistent. */

export const fadeUp = (reduce = false, delay = 0) => ({
  initial: { y: reduce ? 0 : 12, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  transition: { duration: reduce ? 0.18 : 0.4, delay: reduce ? 0 : delay, ease: [0.22, 1, 0.36, 1] },
});

export const staggerDelay = (index = 0, step = 0.05, reduce = false) =>
  (reduce ? 0 : Math.min(index, 12) * step);

export const hoverLift = (reduce = false) =>
  (reduce ? undefined : { y: -4 });

export const tapPress = { scale: 0.985 };

/**
 * Soft route enter. Light y is safe — Back/Home docks portal to document.body.
 * Keep motion short so nav feels snappy between desks.
 */
export const pageEnter = (reduce = false) => ({
  initial: { opacity: 0, y: reduce ? 0 : 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: reduce ? 0.12 : 0.38, ease: [0.22, 1, 0.36, 1] },
});

/** Header / shell fade — no vertical shift so chrome stays planted. */
export const shellEnter = (reduce = false) => ({
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: reduce ? 0.1 : 0.32, ease: [0.22, 1, 0.36, 1] },
});
