import { useNavigate, useLocation } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { fadeUp, hoverLift, staggerDelay, tapPress } from "../../motion/presets";

const SECTIONS = [
  { to: "/find-players", kicker: "Matchmaking", label: "Find Players", copy: "Search similar grinders and send a connect request." },
  { to: "/tournaments", kicker: "Live desk", label: "Scrims", copy: "Public and private scrims, flyers, and room codes." },
  { to: "/blog", kicker: "Community", label: "Community Blog", copy: "Guides, recaps, and stories from the circuit." },
];

export default function HubSections() {
  const navigate = useNavigate();
  const location = useLocation();
  const reduce = useReducedMotion();

  const openSection = (to) => {
    if (to === "/blog") {
      if (location.pathname === "/blog") return;
      navigate("/blog", { state: { background: location, fromHome: location.pathname === "/" } });
      return;
    }
    // Keep Home under this page in history so Back returns to Home, not Vault.
    if (location.pathname !== "/") {
      navigate("/", { replace: true });
      window.setTimeout(() => navigate(to, { state: { fromHome: true } }), 0);
      return;
    }
    navigate(to, { state: { fromHome: true } });
  };

  return (
    <div className="relative isolate z-20 mt-4 grid gap-2 sm:mt-6 sm:gap-3 md:grid-cols-3">
      {SECTIONS.map((section, index) => (
        <motion.button
          type="button"
          key={section.to}
          onClick={() => openSection(section.to)}
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
