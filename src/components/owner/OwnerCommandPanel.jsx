import { AnimatePresence, motion } from "framer-motion";
import { Layers3, Newspaper, Trophy, Users, X } from "lucide-react";

const OPTIONS = [
  { id: "vault", label: "Manage Vault Slides", copy: "Stage posters, paste results, and review Vault requests.", icon: Layers3 },
  { id: "tournaments", label: "Edit Tournaments", copy: "Open brackets, flyers, registrations, and live ops.", icon: Trophy },
  { id: "players", label: "Moderate Players", copy: "Safety reports, bans, and discovery profiles.", icon: Users },
  { id: "blogs", label: "Publish Blogs", copy: "Approve recaps and tactical guides for the public feed.", icon: Newspaper },
];

export default function OwnerCommandPanel({ open, onClose, onSelect, role = "owner" }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/80 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="owner-command-title"
        >
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 16, opacity: 0 }}
            className="w-full max-w-xl rounded-3xl border border-neon/30 bg-slate-950 p-6 shadow-[0_0_80px_rgba(34,243,196,0.12)]"
          >
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-neon">{role} command</p>
                <h2 id="owner-command-title" className="font-display text-4xl text-white">Owner dashboard</h2>
              </div>
              <button type="button" aria-label="Close owner panel" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full border border-white/15 text-white hover:border-neon hover:text-neon">
                <X size={16} />
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => onSelect(option.id)}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4 text-left hover:border-neon/50 hover:bg-white/10"
                  >
                    <Icon className="mb-3 text-neon" size={22} />
                    <div className="font-display text-2xl text-white">{option.label}</div>
                    <p className="mt-1 text-sm text-slate-400">{option.copy}</p>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
