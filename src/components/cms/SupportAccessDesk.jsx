import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_SUPPORT_PERMISSIONS,
  SUPPORT_PERMISSION_KEYS,
  SUPPORT_PERMISSION_LABELS,
  normalizeSupportPermissions,
} from "../../lib/staffAccess";

export default function SupportAccessDesk({ staff = [], onSetSupport, onSavePermissions }) {
  const supports = useMemo(
    () => staff.filter((item) => item.role === "support" && item.enabled !== false),
    [staff],
  );
  const [staffUid, setStaffUid] = useState("");
  const [staffError, setStaffError] = useState("");
  const [expandedId, setExpandedId] = useState("");
  const [drafts, setDrafts] = useState({});
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setDrafts((current) => {
      const next = { ...current };
      supports.forEach((item) => {
        if (!next[item.id]) next[item.id] = normalizeSupportPermissions(item.permissions);
      });
      Object.keys(next).forEach((id) => {
        if (!supports.some((item) => item.id === id)) delete next[id];
      });
      return next;
    });
  }, [supports]);

  const assignSupport = async () => {
    const targetUid = staffUid.trim();
    if (!targetUid || targetUid.length > 128) {
      setStaffError("Enter a valid Firebase account UID.");
      return;
    }
    setStaffError("");
    setMessage("");
    try {
      await onSetSupport(targetUid, true, DEFAULT_SUPPORT_PERMISSIONS);
      setStaffUid("");
      setExpandedId(targetUid);
      setMessage("Support granted with default toggles. Adjust per person below.");
    } catch {
      setStaffError("Could not update support access. Check the published Firebase rules.");
    }
  };

  const savePermissions = async (uid) => {
    setBusyId(uid);
    setMessage("");
    setStaffError("");
    try {
      await onSavePermissions(uid, drafts[uid] || DEFAULT_SUPPORT_PERMISSIONS);
      setMessage(`Saved permissions for ${uid}`);
    } catch (error) {
      setStaffError(error?.message || "Could not save permissions.");
    } finally {
      setBusyId("");
    }
  };

  const toggleKey = (uid, key) => {
    setDrafts((current) => ({
      ...current,
      [uid]: {
        ...normalizeSupportPermissions(current[uid]),
        [key]: !normalizeSupportPermissions(current[uid])[key],
      },
    }));
  };

  return (
    <section style={{ maxWidth: 760 }}>
      <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
        Grant support by Firebase Auth UID, then turn capabilities on or off per person. Owner-only
        powers (bans, popups, media manage, grant access, activity log) are never toggleable here.
        Desk edits still wait in Support changes until you accept them.
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
        <input
          aria-label="Support account UID"
          placeholder="Paste support person's UID"
          value={staffUid}
          onChange={(event) => setStaffUid(event.target.value)}
          style={{ flex: 1, minWidth: 220, padding: "10px 12px", border: "1px solid var(--border)", background: "var(--panel-bg)", color: "inherit" }}
        />
        <button type="button" onClick={assignSupport} style={{ padding: "10px 14px", border: 0, background: "var(--accent)", color: "var(--accent-contrast)", fontWeight: 700, cursor: "pointer" }}>
          Grant support access
        </button>
      </div>
      {staffError && <div role="alert" style={{ color: "var(--danger)", marginTop: 8 }}>{staffError}</div>}
      {message && <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 8 }}>{message}</p>}
      <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
        {supports.length === 0 && <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No support accounts yet.</p>}
        {supports.map((item) => {
          const open = expandedId === item.id;
          const draft = normalizeSupportPermissions(drafts[item.id] || item.permissions);
          return (
            <article key={item.id} style={{ padding: 14, background: "var(--panel-bg)", border: "1px solid var(--border)" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <code style={{ fontSize: 12 }}>{item.id}</code>
                  <p style={{ margin: "4px 0 0", color: "var(--text-muted)", fontSize: 12 }}>
                    {SUPPORT_PERMISSION_KEYS.filter((key) => draft[key]).length} of {SUPPORT_PERMISSION_KEYS.length} on
                  </p>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => setExpandedId(open ? "" : item.id)}
                    style={{ padding: "8px 12px", border: "1px solid var(--border)", background: "transparent", color: "inherit", cursor: "pointer" }}
                  >
                    {open ? "Hide toggles" : "Access toggles"}
                  </button>
                  <button
                    type="button"
                    onClick={() => onSetSupport(item.id, false)}
                    style={{ padding: "8px 12px", border: "1px solid var(--border)", background: "transparent", color: "var(--danger)", cursor: "pointer" }}
                  >
                    Remove access
                  </button>
                </div>
              </div>
              {open && (
                <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
                  {SUPPORT_PERMISSION_KEYS.map((key) => (
                    <label key={key} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13 }}>
                      <input type="checkbox" checked={draft[key] === true} onChange={() => toggleKey(item.id, key)} style={{ marginTop: 2 }} />
                      <span>{SUPPORT_PERMISSION_LABELS[key] || key}</span>
                    </label>
                  ))}
                  <button
                    type="button"
                    disabled={busyId === item.id}
                    onClick={() => savePermissions(item.id)}
                    style={{ justifySelf: "start", marginTop: 6, padding: "10px 14px", border: 0, background: "var(--accent-secondary)", color: "#041018", fontWeight: 700, cursor: "pointer" }}
                  >
                    {busyId === item.id ? "Saving…" : "Save permissions"}
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
