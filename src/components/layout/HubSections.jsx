import { useNavigate, useLocation } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import { fadeUp, hoverLift, staggerDelay, tapPress } from "../../motion/presets";
import { defaultUiLayout, homeHubSectionsFor } from "../../data/siteUiLayout";

export default function HubSections({ signedIn = false, uiLayout = null }) {
  const navigate = useNavigate();
  const location = useLocation();
  const reduce = useReducedMotion();
  const sections = homeHubSectionsFor(uiLayout || defaultUiLayout(), signedIn);

  const openSection = (section) => {
    if (section.overlay || section.to === "/blog") {
      if (location.pathname === "/blog") return;
      navigate("/blog", { state: { background: location, fromHome: location.pathname === "/" } });
      return;
    }
    if (location.pathname !== "/") {
      navigate("/", { replace: true });
      window.setTimeout(() => navigate(section.to, { state: { fromHome: true } }), 0);
      return;
    }
    navigate(section.to, { state: { fromHome: true } });
  };

  if (!sections.length) return null;

  return (
    <div className={`relative isolate z-20 mt-4 grid gap-2 sm:mt-6 sm:gap-3 ${sections.length >= 3 ? "md:grid-cols-3" : sections.length === 2 ? "md:grid-cols-2" : ""}`}>
      {sections.map((section, index) => (
        <motion.button
          type="button"
          key={section.id || section.to}
          onClick={() => openSection(section)}
          className="group relative z-10 cursor-pointer border border-white/10 bg-black/20 p-3 text-left sm:p-5"
          {...fadeUp(reduce, staggerDelay(index, 0.06, reduce))}
          whileHover={hoverLift(reduce)}
          whileTap={tapPress}
        >
          <p className="m-0 font-mono text-[9px] uppercase tracking-[0.18em] text-neon sm:text-[10px]">{section.kicker}</p>
          <h2 className="mt-1 font-['Bebas_Neue',sans-serif] text-2xl tracking-wide text-white transition-colors group-hover:text-neon sm:mt-2 sm:text-3xl">{section.label}</h2>
          <p className="mt-1 hidden text-sm text-slate-400 sm:block">{section.copy}</p>
        </motion.button>
      ))}
    </div>
  );
}
