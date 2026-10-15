import { useCallback, useMemo, useState } from "react";
import { CIRCUIT_CMS_MOCK } from "../data/circuitCmsMock";
import { VAULT_SLIDES } from "../data/platformShowcase";

const STORAGE_KEY = "grindinfo-circuit-cms-v1";

function slugify(value) {
  return String(value || "event")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "event";
}

function seedFromVaultLibrary() {
  return VAULT_SLIDES.map((slide, index) => ({
    id: `library-${slide.slug}`,
    surface: "vault",
    eventStatus: index % 3 === 0 ? "completed" : index % 3 === 1 ? "live" : "upcoming",
    slug: slide.slug,
    title: slide.title,
    game: slide.game,
    kicker: slide.kicker,
    summary: slide.summary,
    poster: slide.poster,
    posterSource: "preset",
    season: slide.season,
  }));
}

function loadRecords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch {
    /* keep seed */
  }
  const seeded = [...CIRCUIT_CMS_MOCK];
  const usedSlugs = new Set(seeded.map((item) => item.slug).filter(Boolean));
  seedFromVaultLibrary().forEach((item) => {
    if (!usedSlugs.has(item.slug)) seeded.push(item);
  });
  return seeded;
}

function persist(records) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    /* quota — still keep in memory */
  }
}

export function emptyCircuitEvent(surface) {
  return {
    id: "",
    surface,
    eventStatus: "upcoming",
    slug: "",
    title: "",
    game: "Valorant",
    kicker: "",
    summary: "",
    poster: "",
    posterSource: "preset",
    winners: "",
    runnerUps: "",
    secondRunnerUps: "",
    fanFavourite: "",
    bestIgl: "",
    mvp: "",
    bestClutches: "",
    extraHighlights: [{ game: "", milestone: "" }],
    activeStage: "Group Stage",
    liveEmbedUrl: "",
    pointsTable: [{ group: "A", team: "", points: "", wins: "" }],
    registrationUrl: "",
    seasonTitle: "",
    startAt: "",
    endAt: "",
  };
}

export function useCircuitCms() {
  const [records, setRecords] = useState(loadRecords);

  const commit = useCallback((next) => {
    setRecords(next);
    persist(next);
  }, []);

  const upsert = useCallback((draft) => {
    const title = String(draft.title || "").trim();
    if (!title) throw new Error("Add a title.");
    const id = draft.id || `cms-${Date.now().toString(36)}`;
    const slug = draft.slug || slugify(title);
    const record = { ...draft, id, slug, title, updatedAt: Date.now() };
    setRecords((current) => {
      const next = current.some((item) => item.id === id)
        ? current.map((item) => (item.id === id ? record : item))
        : [record, ...current];
      persist(next);
      return next;
    });
    return record;
  }, []);

  const remove = useCallback((id) => {
    commit(records.filter((item) => item.id !== id));
  }, [commit, records]);

  const vaultSlides = useMemo(
    () => records.filter((item) => item.surface === "vault").slice(0, 10),
    [records],
  );
  const managedTournaments = useMemo(
    () => records.filter((item) => item.surface === "tournament"),
    [records],
  );

  return { records, vaultSlides, managedTournaments, upsert, remove, emptyCircuitEvent };
}
