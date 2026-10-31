import { Link } from "react-router-dom";
import { Crown } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { flattenEwcEditions, groupEwcChampionships } from "../../data/esportsResearch";
import { gamesMatch, inferEventScope } from "../../data/eventScope";
import { posterForEwcChampionship } from "../../data/ewcPoster";
import ChampionshipGameTabs from "./ChampionshipGameTabs";
import SectionBackHome from "../layout/SectionBackHome";
import PageEnter from "../motion/PageEnter";
import { fadeUp, staggerDelay } from "../../motion/presets";

export default function EwcDirectoryPage({ slides = [], liveEntries = [] }) {
  const fromVault = flattenEwcEditions(slides);
  const fromBlogs = liveEntries
    .filter((entry) => entry.eventScope === "ewc" || inferEventScope(`${entry.tournament} ${entry.game}`) === "ewc")
    .map((entry) => {
      const vault = slides.find((slide) => gamesMatch(slide.game, entry.game));
      return {
        year: String(entry.eventDate || "").match(/(\d{4})/)?.[1] || entry.eventDate,
        game: entry.game,
        event: entry.tournament,
        prizePool: "",
        champion: entry.winner,
        mvp: entry.mvp || "",
        payouts: [{ team: entry.winner }],
        slug: vault?.slug || "",
        eventScope: "ewc",
      };
    });
  const seen = new Set();
  const editions = [...fromVault, ...fromBlogs].filter((edition) => {
    const key = `${edition.game}|${edition.year}|${edition.event}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const championships = groupEwcChampionships(editions);
  const reduce = useReducedMotion();

  return (
    <PageEnter className="pb-16 pt-6">
      <SectionBackHome />
      <div className="relative mb-2 border-b border-[#d4af37]/25 py-2">
        <Link to="/vault" className="font-mono text-xs uppercase tracking-widest text-[#d4af37]">
          ← The Vault
        </Link>
      </div>

      <header
        className="relative mb-10 overflow-hidden rounded-3xl border px-6 py-10 md:px-10"
        style={{
          borderColor: "rgba(212, 175, 55, 0.35)",
          background:
            "linear-gradient(135deg, rgba(26,18,8,0.95) 0%, rgba(8,10,18,0.92) 55%, rgba(6,16,24,0.95) 100%)",
          boxShadow: "0 0 48px rgba(212, 175, 55, 0.12)",
        }}
      >
        <div
          className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full opacity-40"
          style={{ background: "radial-gradient(circle, rgba(212,175,55,0.35), transparent 70%)" }}
        />
        <p className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-[#f0d78c]">
          <Crown size={14} />
          Championship desk
        </p>
        <h1 className="mt-2 font-['Bebas_Neue',sans-serif] text-5xl tracking-wide text-white md:text-6xl">
          Esports World Cup
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-stone-300">
          Each year opens as title windows. Every card uses that game&apos;s art keyed to the winning
          player, team, or highlight moment — not a shared stock poster.
        </p>
      </header>

      <div className="grid gap-10">
        {championships.map((championship, index) => {
          const yearPoster = posterForEwcChampionship(championship);
          return (
            <motion.section
              key={championship.key}
              className="relative overflow-hidden rounded-3xl border p-5 md:p-6"
              style={{
                borderColor: "rgba(212, 175, 55, 0.28)",
                background: "rgba(8, 6, 2, 0.55)",
              }}
              {...fadeUp(reduce, staggerDelay(index, 0.06, reduce))}
            >
              {yearPoster ? (
                <div className="pointer-events-none absolute inset-0 opacity-25">
                  <img src={yearPoster} alt="" className="h-full w-full object-cover" />
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(90deg, rgba(8,6,2,0.95) 0%, rgba(8,6,2,0.82) 45%, rgba(8,6,2,0.55) 100%)",
                    }}
                  />
                </div>
              ) : null}
              <div className="relative">
                <p className="m-0 font-mono text-[10px] uppercase tracking-widest text-[#f0d78c]">
                  {championship.year} · {championship.games.length} titles
                </p>
                <h2 className="mt-1 font-['Bebas_Neue',sans-serif] text-4xl tracking-wide text-white md:text-5xl">
                  {championship.title}
                </h2>
                <ChampionshipGameTabs games={championship.games} slides={slides} heading="" urlSync={false} />
              </div>
            </motion.section>
          );
        })}
      </div>
    </PageEnter>
  );
}
