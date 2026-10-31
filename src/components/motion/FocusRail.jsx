import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

/**
 * Futuristic focus rail — centered card expands; peers scale down.
 * axis: "x" (default) or "y". Vertical mouse-wheel also drives the horizontal rail.
 */
export default function FocusRail({
  items = [],
  getKey,
  renderItem,
  axis = "x",
  slotWidth = "min(280px, 70vw)",
  slotHeight = null,
  focusScale = 1.12,
  peerScale = 0.86,
  height = 400,
  /** Max height of the vertical scroller (CSS length) */
  viewportMax = "min(70vh, 560px)",
  className = "",
  ariaLabel = "Carousel",
}) {
  const reduce = useReducedMotion();
  const vertical = axis === "y";
  const scrollerRef = useRef(null);
  const itemRefs = useRef([]);
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);

  const measureActive = useCallback(() => {
    const root = scrollerRef.current;
    if (!root || !itemRefs.current.length) return;
    const mid = vertical
      ? root.scrollTop + root.clientHeight / 2
      : root.scrollLeft + root.clientWidth / 2;
    let best = 0;
    let bestDist = Infinity;
    itemRefs.current.forEach((node, index) => {
      if (!node) return;
      const center = vertical
        ? node.offsetTop + node.offsetHeight / 2
        : node.offsetLeft + node.offsetWidth / 2;
      const dist = Math.abs(center - mid);
      if (dist < bestDist) {
        bestDist = dist;
        best = index;
      }
    });
    setActive(best);
    const max = vertical
      ? Math.max(1, root.scrollHeight - root.clientHeight)
      : Math.max(1, root.scrollWidth - root.clientWidth);
    const pos = vertical ? root.scrollTop : root.scrollLeft;
    setProgress(pos / max);
  }, [vertical]);

  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return undefined;
    const first = itemRefs.current[0];
    if (first) {
      if (vertical) {
        const top = first.offsetTop - (root.clientHeight - first.offsetHeight) / 2;
        root.scrollTop = Math.max(0, top);
      } else {
        const left = first.offsetLeft - (root.clientWidth - first.offsetWidth) / 2;
        root.scrollLeft = Math.max(0, left);
      }
    }
    measureActive();
    const onScroll = () => measureActive();
    root.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measureActive);

    // Map vertical wheel / trackpad to the rail axis so page scroll doesn't steal focus.
    const onWheel = (event) => {
      const dominantY = Math.abs(event.deltaY) >= Math.abs(event.deltaX);
      if (vertical) {
        if (!dominantY) return;
        event.preventDefault();
        root.scrollTop += event.deltaY;
        return;
      }
      // Horizontal rail: vertical wheel slides sideways.
      if (dominantY && Math.abs(event.deltaY) > 2) {
        event.preventDefault();
        root.scrollLeft += event.deltaY;
      }
    };
    root.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      root.removeEventListener("scroll", onScroll);
      root.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", measureActive);
    };
  }, [measureActive, items.length, vertical]);

  const scrollToIndex = (index) => {
    const root = scrollerRef.current;
    const node = itemRefs.current[index];
    if (!root || !node) return;
    if (vertical) {
      const top = node.offsetTop - (root.clientHeight - node.offsetHeight) / 2;
      root.scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
      return;
    }
    const left = node.offsetLeft - (root.clientWidth - node.offsetWidth) / 2;
    root.scrollTo({ left, behavior: reduce ? "auto" : "smooth" });
  };

  const go = (dir) => {
    scrollToIndex(Math.max(0, Math.min(items.length - 1, active + dir)));
  };

  const itemH = slotHeight || height;

  return (
    <div className={`relative ${className}`}>
      {!vertical ? (
        <>
          <div
            className="pointer-events-none absolute inset-y-2 left-0 z-10 w-8 bg-gradient-to-r from-[var(--page-bg-solid,#05070c)] to-transparent sm:w-14"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute inset-y-2 right-0 z-10 w-8 bg-gradient-to-l from-[var(--page-bg-solid,#05070c)] to-transparent sm:w-14"
            aria-hidden="true"
          />
        </>
      ) : (
        <>
          <div
            className="pointer-events-none absolute inset-x-0 top-0 z-10 h-10 bg-gradient-to-b from-[var(--page-bg-solid,#05070c)] to-transparent"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute inset-x-0 bottom-12 z-10 h-10 bg-gradient-to-t from-[var(--page-bg-solid,#05070c)] to-transparent"
            aria-hidden="true"
          />
        </>
      )}

      <div
        ref={scrollerRef}
        role="region"
        aria-roledescription="carousel"
        aria-orientation={vertical ? "vertical" : "horizontal"}
        aria-label={ariaLabel}
        className={
          vertical
            ? "flex flex-col items-center gap-5 overflow-y-auto px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            : "flex items-center gap-4 overflow-x-auto py-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        }
        style={
          vertical
            ? {
                scrollSnapType: "y mandatory",
                WebkitOverflowScrolling: "touch",
                maxHeight: viewportMax,
                paddingTop: "max(1rem, calc(32% - 5rem))",
                paddingBottom: "max(1rem, calc(32% - 5rem))",
              }
            : {
                scrollSnapType: "x mandatory",
                WebkitOverflowScrolling: "touch",
                paddingLeft: "max(0.75rem, calc(50% - 9rem))",
                paddingRight: "max(0.75rem, calc(50% - 9rem))",
                minHeight: height + 48,
              }
        }
      >
        {items.map((item, index) => {
          const focused = index === active;
          const dist = Math.abs(index - active);
          const scale = reduce
            ? 1
            : focused
              ? focusScale
              : Math.max(peerScale - 0.06, peerScale - (dist - 1) * 0.04);
          const opacity = reduce ? 1 : focused ? 1 : Math.max(0.38, 0.92 - dist * 0.2);
          const shift = reduce ? 0 : focused ? (vertical ? 0 : -6) : vertical ? 0 : 8 + Math.min(dist, 2) * 6;

          return (
            <motion.div
              key={getKey ? getKey(item, index) : index}
              ref={(node) => {
                itemRefs.current[index] = node;
              }}
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} of ${items.length}`}
              aria-current={focused ? "true" : undefined}
              onClick={() => {
                if (!focused) scrollToIndex(index);
              }}
              className="relative shrink-0 origin-center"
              style={{
                width: vertical ? "min(100%, 320px)" : slotWidth,
                height: vertical ? itemH : undefined,
                scrollSnapAlign: "center",
                zIndex: focused ? 6 : Math.max(1, 4 - dist),
                cursor: focused ? "default" : "pointer",
              }}
              animate={vertical ? { scale, opacity } : { scale, opacity, y: shift }}
              transition={
                reduce
                  ? { duration: 0.01 }
                  : { type: "spring", stiffness: 260, damping: 26, mass: 0.65 }
              }
            >
              <div
                className="relative overflow-hidden transition-[box-shadow,filter] duration-300"
                style={{
                  height: itemH,
                  filter: focused || reduce ? "none" : "saturate(0.7) brightness(0.82)",
                  boxShadow: focused
                    ? "0 0 0 1px color-mix(in srgb, var(--accent) 60%, transparent), 0 22px 56px rgba(0,0,0,0.6), 0 0 48px color-mix(in srgb, var(--accent) 24%, transparent)"
                    : "0 0 0 1px rgba(255,255,255,0.08), 0 10px 24px rgba(0,0,0,0.35)",
                }}
              >
                {focused && !reduce ? (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 z-[1]"
                    style={{
                      background:
                        "linear-gradient(125deg, color-mix(in srgb, var(--accent) 20%, transparent), transparent 40%, color-mix(in srgb, var(--accent-secondary) 16%, transparent))",
                      mixBlendMode: "screen",
                    }}
                  />
                ) : null}
                <div className="relative z-0 h-full w-full">{renderItem(item, { index, focused })}</div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className={`mt-0 flex items-center justify-between gap-3 px-1 ${vertical ? "flex-col sm:flex-row" : ""}`}>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Previous"
            onClick={() => go(-1)}
            disabled={active <= 0}
            className="grid h-9 w-9 place-items-center border border-white/15 bg-black/40 font-mono text-sm text-white disabled:opacity-30"
          >
            {vertical ? "⌃" : "‹"}
          </button>
          <button
            type="button"
            aria-label="Next"
            onClick={() => go(1)}
            disabled={active >= items.length - 1}
            className="grid h-9 w-9 place-items-center border border-white/15 bg-black/40 font-mono text-sm text-white disabled:opacity-30"
          >
            {vertical ? "⌄" : "›"}
          </button>
        </div>

        <div className={`relative overflow-hidden rounded-full bg-white/10 ${vertical ? "h-24 w-1 sm:h-1 sm:w-full sm:flex-1" : "h-1 flex-1"}`}>
          <div
            className={`absolute rounded-full bg-neon transition-all duration-200 ${vertical ? "inset-x-0 top-0 sm:inset-y-0 sm:left-0 sm:top-auto" : "inset-y-0 left-0"}`}
            style={
              vertical
                ? { height: `${Math.max(10, progress * 100)}%`, width: "100%" }
                : { width: `${Math.max(10, progress * 100)}%` }
            }
          />
        </div>

        <div className={`flex flex-wrap gap-1.5 ${vertical ? "justify-center sm:justify-end" : "max-w-[42%] justify-end"}`}>
          {items.map((_, index) => (
            <button
              key={`dot-${index}`}
              type="button"
              aria-label={`Go to slide ${index + 1}`}
              aria-current={index === active ? "true" : undefined}
              onClick={() => scrollToIndex(index)}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: index === active ? 18 : 6,
                background: index === active ? "var(--accent)" : "rgba(255,255,255,0.25)",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
