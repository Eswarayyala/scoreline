import { useState } from "react";
import { Plus, Radio, Trophy, Users } from "lucide-react";

export default function TournamentOpsRail({ signedIn, onNew, onSignIn, onShowActive, onShowArchive, showingArchive }) {
  const [open, setOpen] = useState(false);
  return (
    <aside className={`fixed right-0 top-36 z-40 overflow-hidden border-l border-white/10 bg-slate-950/95 shadow-2xl backdrop-blur-md transition-all ${open ? "w-56" : "w-11"}`}>
      <button type="button" aria-label="Tournament ops" onClick={() => setOpen((value) => !value)} className="flex w-full items-center gap-2 px-3 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-amber-300">
        <Trophy size={16} />
        {open && <span>Ops</span>}
      </button>
      <div className="border-t border-white/10">
        <button type="button" aria-label="New event" onClick={signedIn ? onNew : onSignIn} className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-stone-200 hover:bg-white/5">
          <Plus size={15} className="shrink-0 text-cyan-300" />
          {open && <span>New event</span>}
        </button>
        <button type="button" aria-label="Live desk" onClick={onShowActive} className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-white/5 ${showingArchive ? "text-stone-400" : "text-white"}`}>
          <Radio size={15} className="shrink-0 text-emerald-400" />
          {open && <span>Live desk</span>}
        </button>
        <button type="button" aria-label="Closed events" onClick={onShowArchive} className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-white/5 ${showingArchive ? "text-white" : "text-stone-400"}`}>
          <Users size={15} className="shrink-0" />
          {open && <span>Closed</span>}
        </button>
      </div>
    </aside>
  );
}
