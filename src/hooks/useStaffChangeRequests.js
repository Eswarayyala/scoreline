import { useCallback, useEffect, useMemo, useState } from "react";
import { addDoc, collection, onSnapshot, orderBy, query, updateDoc, doc, where } from "firebase/firestore";
import { db } from "../firebase";
import { sanitizeSupportChangePayload, supportCanProposeAction } from "../lib/staffAccess";

const COLLECTION = collection(db, "staffChangeRequests");

export function useStaffChangeRequests({ role, user, permissions = null } = {}) {
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    if (role !== "owner" && role !== "support") {
      setRequests([]);
      return undefined;
    }
    const q = role === "owner"
      ? query(COLLECTION, orderBy("createdAt", "desc"))
      : query(COLLECTION, where("actorUid", "==", user?.uid || "_"));
    return onSnapshot(
      q,
      (snapshot) => {
        const rows = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
        rows.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setRequests(rows);
      },
      () => setRequests([]),
    );
  }, [role, user?.uid]);

  const visible = useMemo(() => {
    if (role === "owner") return requests;
    return requests.filter((item) => item.actorUid === user?.uid);
  }, [requests, role, user?.uid]);

  const pending = useMemo(() => visible.filter((item) => item.status === "pending"), [visible]);

  const submit = useCallback(async ({ action, targetType, targetId, targetLabel, summary, payload }) => {
    if (role !== "support" || !user) throw new Error("Support access is required to propose a change.");
    const nextAction = String(action || "cms_upsert").slice(0, 40);
    if (!supportCanProposeAction(permissions, nextAction)) {
      throw new Error("Your support account does not have permission for that action.");
    }
    const record = {
      status: "pending",
      action: nextAction,
      targetType: String(targetType || "circuitCms").slice(0, 40),
      targetId: String(targetId || "new").slice(0, 128),
      targetLabel: String(targetLabel || summary || "Support change").slice(0, 120),
      summary: String(summary || "Support change").slice(0, 240),
      payload: sanitizeSupportChangePayload(
        nextAction,
        payload && typeof payload === "object" ? payload : {},
        permissions,
      ),
      actorUid: user.uid,
      actorName: String(user.displayName || "Support").slice(0, 40),
      createdAt: Date.now(),
    };
    await addDoc(COLLECTION, record);
    return record;
  }, [role, user, permissions]);

  const review = useCallback(async (requestId, status, note = "") => {
    if (role !== "owner") throw new Error("Only the owner can approve or deny support changes.");
    await updateDoc(doc(db, "staffChangeRequests", requestId), {
      status,
      reviewedAt: Date.now(),
      reviewedBy: user?.uid || "",
      reviewNote: String(note || "").slice(0, 240),
    });
  }, [role, user?.uid]);

  return { requests: visible, pending, submit, review };
}
