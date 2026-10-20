import { useMemo, useState } from "react";

export default function SupportChangeQueue({ requests = [], role, onReview }) {
  const pending = requests.filter((item) => item.status === "pending");
  const recent = requests.filter((item) => item.status !== "pending").slice(0, 12);
  const isOwner = role === "owner";
  const [selected, setSelected] = useState(() => new Set());
  const [busy, setBusy] = useState(false);

  const selectedPending = useMemo(
    () => pending.filter((item) => selected.has(item.id)),
    [pending, selected],
  );

  const toggleOne = (id) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((current) => {
      if (pending.length && pending.every((item) => current.has(item.id))) return new Set();
      return new Set(pending.map((item) => item.id));
    });
  };

  const reviewMany = async (status) => {
    if (!isOwner || !selectedPending.length || !onReview) return;
    setBusy(true);
    try {
      for (const item of selectedPending) {
        await onReview(item, status);
      }
      setSelected(new Set());
    } finally {
      setBusy(false);
    }
  };

  return (
    <section style={{ display: "grid", gap: 18 }}>
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-amber-400" style={{ margin: 0 }}>Support desk</p>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 32, margin: "4px 0 8px" }}>{isOwner ? "Approve or deny support changes" : "Changes waiting for the owner"}</h2>
        <p style={{ color: "var(--text-muted)", fontSize: 13, margin: 0 }}>
          {isOwner
            ? "Select several pending requests and accept or deny them together. Allowed proposals: vault/CMS upsert or delete, blog review, archive decisions, blog promote."
            : "Queue as many desk edits as you need — each one stays here until the owner accepts or denies it. Prefer https or library assets for posters."}
        </p>
      </div>
      {pending.length === 0 ? (
        <p style={{ color: "var(--text-muted)", fontSize: 13 }}>{isOwner ? "No support changes waiting." : "Nothing is waiting on the owner."}</p>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {isOwner && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              <button
                type="button"
                onClick={toggleAll}
                style={{ padding: "8px 12px", border: "1px solid var(--border)", background: "transparent", color: "inherit", cursor: "pointer", fontSize: 12 }}
              >
                {pending.every((item) => selected.has(item.id)) ? "Clear selection" : `Select all (${pending.length})`}
              </button>
              {selectedPending.length > 0 && (
                <>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => reviewMany("approved")}
                    style={{ background: "var(--accent)", color: "var(--accent-contrast)", border: 0, padding: "8px 14px", cursor: "pointer", fontWeight: 700 }}
                  >
                    {busy ? "Working…" : `Accept ${selectedPending.length}`}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => reviewMany("denied")}
                    style={{ background: "transparent", color: "var(--danger)", border: "1px solid var(--border)", padding: "8px 14px", cursor: "pointer" }}
                  >
                    Deny {selectedPending.length}
                  </button>
                </>
              )}
            </div>
          )}
          {pending.map((item) => (
            <article key={item.id} style={{ padding: 14, background: "var(--panel-bg)", border: "1px solid var(--border)" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                {isOwner && (
                  <input
                    type="checkbox"
                    checked={selected.has(item.id)}
                    onChange={() => toggleOne(item.id)}
                    aria-label={`Select ${item.targetLabel || item.summary || "change"}`}
                    style={{ marginTop: 4 }}
                  />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)", margin: 0 }}>
                    {item.actorName || "Support"} · {item.action} · {item.targetType}
                  </p>
                  <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, margin: "6px 0" }}>{item.targetLabel || item.summary}</h3>
                  <p style={{ color: "var(--text-muted)", fontSize: 13, whiteSpace: "pre-wrap" }}>{item.summary}</p>
                  {isOwner && (
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <button type="button" disabled={busy} onClick={() => onReview(item, "approved")} style={{ background: "var(--accent)", color: "var(--accent-contrast)", border: 0, padding: "8px 14px", cursor: "pointer", fontWeight: 700 }}>Accept</button>
                      <button type="button" disabled={busy} onClick={() => onReview(item, "denied")} style={{ background: "transparent", color: "var(--danger)", border: "1px solid var(--border)", padding: "8px 14px", cursor: "pointer" }}>Deny</button>
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      {recent.length > 0 && (
        <div>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)" }}>Recent decisions</p>
          <div style={{ display: "grid", gap: 8 }}>
            {recent.map((item) => (
              <article key={item.id} style={{ padding: 12, border: "1px solid var(--border)" }}>
                <strong>{item.status}</strong>
                <span style={{ color: "var(--text-muted)" }}> · {item.summary}</span>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
