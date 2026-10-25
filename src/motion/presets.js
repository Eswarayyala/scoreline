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

/** Opacity-only so nested `position: fixed` docks (Back/Home) stay viewport-fixed. */
export const pageEnter = (reduce = false) => ({
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: reduce ? 0.12 : 0.28, ease: [0.22, 1, 0.36, 1] },
});
