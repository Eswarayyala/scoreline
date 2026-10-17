import { useNavigate } from "react-router-dom";

const SECTIONS = [
  { to: "/find-players", kicker: "Matchmaking", label: "Find Players", copy: "Search similar grinders and send a connect request." },
  { to: "/tournaments", kicker: "Live desk", label: "Scrims", copy: "Public and private scrims, flyers, and room codes on a dedicated page." },
  { to: "/blog", kicker: "Community", label: "Community Blog", copy: "Guides, recaps, and stories from the circuit." },
];

export default function HubSections() {
  const navigate = useNavigate();
  return (
    <div className="relative isolate z-20 mt-6 grid gap-3 md:grid-cols-3">
      {SECTIONS.map((section) => (
        <button
          type="button"
          key={section.to}
          onClick={() => navigate(section.to)}
          className="group relative z-10 cursor-pointer border border-white/10 bg-black/20 p-5 text-left transition hover:border-amber-400/60"
        >
          <p className="m-0 font-mono text-[10px] uppercase tracking-[0.18em] text-amber-400">{section.kicker}</p>
          <h2 className="mt-2 font-['Bebas_Neue',sans-serif] text-3xl tracking-wide text-white group-hover:text-amber-200">{section.label}</h2>
          <p className="mt-1 text-sm text-stone-400">{section.copy}</p>
        </button>
      ))}
    </div>
  );
}
