import { useCallback, useEffect, useMemo, useState } from "react";
import { collection, deleteDoc, doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { CIRCUIT_CMS_MOCK } from "../data/circuitCmsMock";
import { VAULT_SLIDES } from "../data/platformShowcase";
import { seedResearchCmsRecords } from "../data/esportsResearch";
import { buildFilterGames } from "../data/gameCatalog";
import { mergeEwcEditions } from "../data/eventScope";
import { normalizeEdition } from "../data/vaultDeskSchema";

const STORAGE_KEY = "grindinfo-circuit-cms-v4";
const CMS_COLLECTION = "circuitCms";

function slugify(value) {
  return String(value || "event")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "event";
}

function stripUndefined(value) {
  if (Array.isArray(value)) return value.map(stripUndefined);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, stripUndefined(item)]),
    );
  }
  return value;
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
    floatingPriority: Math.max(1, 12 - index),
  }));
}

function mergeWithSeed(remote = []) {
  const byId = new Map(remote.map((item) => [item.id, item]));
  seedResearchCmsRecords().forEach((item) => {
    const existing = byId.get(item.id);
    if (!existing) {
      byId.set(item.id, item);
      return;
    }
    byId.set(item.id, {
      ...existing,
      ...item,
      surface: "research",
      research: true,
      editions: mergeEwcEditions(item.editions, existing.editions),
      yearlyStats: existing.yearlyStats?.length ? existing.yearlyStats : item.yearlyStats,
      relatedTournaments: existing.relatedTournaments?.length ? existing.relatedTournaments : item.relatedTournaments,
      region: existing.region || item.region,
      flyers: existing.flyers?.length ? existing.flyers : item.flyers,
      avatar: existing.avatar || item.avatar,
      poster: ["upload", "url"].includes(existing.posterSource) ? existing.poster : (existing.poster || item.poster),
      posterSource: existing.posterSource || item.posterSource,
      posterIndex: existing.posterIndex ?? item.posterIndex ?? 0,
    });
  });
  if (![...byId.values()].some((item) => item.surface === "vault")) {
    [...CIRCUIT_CMS_MOCK, ...seedFromVaultLibrary()].forEach((item) => {
      if (!byId.has(item.id)) byId.set(item.id, item);
    });
  }
  return [...byId.values()];
}

function loadLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) return mergeWithSeed(parsed);
    }
  } catch {
    /* seed */
  }
  return mergeWithSeed([]);
}

function persistLocal(records) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    /* quota */
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
    flyers: [],
    avatar: "",
    posterIndex: 0,
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
    floatingPriority: 5,
    region: "Global",
    yearlyStats: [{ year: new Date().getFullYear(), tournamentCount: 1, circuit: "", region: "Global" }],
    relatedTournaments: [{ year: "", name: "", region: "", result: "" }],
    editions: [],
    research: surface === "research",
    eventScope: surface === "research" ? "ewc" : "random",
    inFilters: true,
  };
}

export function useCircuitCms({ canWrite = false } = {}) {
  const [records, setRecords] = useState(loadLocal);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, CMS_COLLECTION), (snap) => {
      const remote = snap.docs.map((item) => ({ id: item.id, ...item.data() }));
      const next = mergeWithSeed(remote);
      setRecords(next);
      persistLocal(next);
    }, () => {
      setRecords(loadLocal());
    });
    return unsub;
  }, []);

  const upsert = useCallback(async (draft) => {
    const title = String(draft.title || draft.game || "").trim();
    if (!title) throw new Error("Add a title or game name.");
    const id = draft.id || `cms-${Date.now().toString(36)}`;
    const slug = draft.slug || slugify(title);
    const record = stripUndefined({ ...draft, id, slug, title, updatedAt: Date.now() });
    setRecords((current) => {
      const next = current.some((item) => item.id === id)
        ? current.map((item) => (item.id === id ? record : item))
        : [record, ...current];
      persistLocal(next);
      return next;
    });
    if (canWrite) {
      try {
        await setDoc(doc(db, CMS_COLLECTION, id), record);
      } catch {
        /* rules not live — local desk still keeps the edit */
      }
    }
    return record;
  }, [canWrite]);

  const remove = useCallback(async (id) => {
    setRecords((current) => {
      const next = current.filter((item) => item.id !== id);
      persistLocal(next);
      return next;
    });
    if (canWrite) {
      try {
        await deleteDoc(doc(db, CMS_COLLECTION, id));
      } catch {
        /* keep local */
      }
    }
  }, [canWrite]);

  const vaultSlides = useMemo(
    () => records
      .filter((item) => item.surface === "vault")
      .sort((a, b) => (Number(b.floatingPriority) || 0) - (Number(a.floatingPriority) || 0) || (b.updatedAt || 0) - (a.updatedAt || 0)),
    [records],
  );

  const researchSlides = useMemo(
    () => records
      .filter((item) => item.surface === "research" || item.research)
      .map((item) => ({
        ...item,
        editions: (item.editions || []).map((edition) => normalizeEdition(edition, item.game)),
      }))
      .sort((a, b) => Number(b.editions?.[0]?.year || 0) - Number(a.editions?.[0]?.year || 0)),
    [records],
  );

  const managedTournaments = useMemo(
    () => records.filter((item) => item.surface === "tournament"),
    [records],
  );

  const filterGames = useMemo(() => {
    const extras = records
      .filter((item) => item.inFilters !== false && (item.surface === "catalog" || item.surface === "research" || item.research || item.game))
      .map((item) => item.game || item.title);
    return buildFilterGames(extras);
  }, [records]);

  return { records, vaultSlides, researchSlides, managedTournaments, filterGames, upsert, remove, emptyCircuitEvent };
}
