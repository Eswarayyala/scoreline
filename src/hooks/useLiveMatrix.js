import { useCallback, useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import liveMatrixSeed from "../data/live_matrix.json";
import liveMatrixPendingSeed from "../data/live_matrix.pending.json";
import { matchToCircuitPayload, normalizeLiveMatch } from "../lib/liveMatrix";

const PUBLISHED = collection(db, "liveMatrix");
const DECISIONS = collection(db, "liveMatrixDecisions");

/**
 * Owner-dashboard readable live matrix.
 * Pending queue comes from the agent file; approvals persist in Firestore one match at a time.
 * File decisions export stays in sync for `node src/agents/data_orchestrator.js --apply`.
 */
export function useLiveMatrix({ role } = {}) {
  const canReview = role === "owner";
  const [published, setPublished] = useState(() =>
    (liveMatrixSeed?.matches || []).map((row) => normalizeLiveMatch(row)),
  );
  const [remoteDecisions, setRemoteDecisions] = useState({});
  const [filePending] = useState(() =>
    (liveMatrixPendingSeed?.queue || []).map((row) => normalizeLiveMatch(row)),
  );
  const [localSkip, setLocalSkip] = useState(() => new Set());

  useEffect(() => {
    if (role !== "owner" && role !== "support") return undefined;
    const unsubPub = onSnapshot(
      PUBLISHED,
      (snap) => {
        const rows = snap.docs
          .map((item) => normalizeLiveMatch({ id: item.id, ...item.data() }))
          .sort((a, b) => (b.extractedAt || 0) - (a.extractedAt || 0));
        if (rows.length) setPublished(rows);
      },
      () => {},
    );
    const unsubDec = onSnapshot(
      DECISIONS,
      (snap) => {
        const next = {};
        snap.docs.forEach((item) => {
          next[item.id] = item.data()?.status || "pending";
        });
        setRemoteDecisions(next);
      },
      () => {},
    );
    return () => {
      unsubPub();
      unsubDec();
    };
  }, [role]);

  const pending = useMemo(() => {
    const publishedIds = new Set(published.map((row) => row.id));
    return filePending.filter((row) => {
      if (localSkip.has(row.id)) return false;
      if (publishedIds.has(row.id) && remoteDecisions[row.id] === "approved") return false;
      if (remoteDecisions[row.id] === "rejected") return false;
      if (remoteDecisions[row.id] === "approved") return false;
      return true;
    });
  }, [filePending, published, remoteDecisions, localSkip]);

  /** Next single match awaiting owner decision. */
  const nextPending = pending[0] || null;

  const exportDecisionsJson = useCallback(() => {
    const decisions = { ...remoteDecisions };
    localSkip.forEach((id) => {
      if (!decisions[id]) decisions[id] = "rejected";
    });
    return {
      updatedAt: Date.now(),
      decisions,
    };
  }, [remoteDecisions, localSkip]);

  const downloadDecisionsFile = useCallback(() => {
    const payload = exportDecisionsJson();
    const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "live_matrix.decisions.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }, [exportDecisionsJson]);

  const approveOne = useCallback(
    async (match, { onMergeCircuit } = {}) => {
      if (!canReview) throw new Error("Only the owner can approve live matrix merges.");
      const item = normalizeLiveMatch(match);
      await setDoc(doc(db, "liveMatrix", item.id), { ...item, approvedAt: Date.now() }, { merge: true });
      await setDoc(
        doc(db, "liveMatrixDecisions", item.id),
        { status: "approved", reviewedAt: Date.now() },
        { merge: true },
      );
      setLocalSkip((prev) => new Set(prev).add(item.id));
      if (typeof onMergeCircuit === "function") {
        await onMergeCircuit(matchToCircuitPayload(item));
      }
      return item;
    },
    [canReview],
  );

  const rejectOne = useCallback(
    async (match) => {
      if (!canReview) throw new Error("Only the owner can reject live matrix merges.");
      const item = normalizeLiveMatch(match);
      await setDoc(
        doc(db, "liveMatrixDecisions", item.id),
        { status: "rejected", reviewedAt: Date.now() },
        { merge: true },
      );
      setLocalSkip((prev) => new Set(prev).add(item.id));
      return item;
    },
    [canReview],
  );

  const removePublished = useCallback(
    async (matchId) => {
      if (!canReview) throw new Error("Only the owner can remove published matrix rows.");
      await deleteDoc(doc(db, "liveMatrix", matchId));
      await setDoc(
        doc(db, "liveMatrixDecisions", matchId),
        { status: "rejected", reviewedAt: Date.now() },
        { merge: true },
      );
    },
    [canReview],
  );

  return {
    published,
    pending,
    nextPending,
    pendingCount: pending.length,
    canReview,
    approveOne,
    rejectOne,
    removePublished,
    downloadDecisionsFile,
    exportDecisionsJson,
  };
}
