export default function SupportChangeQueue({ requests = [], role, onReview }) {
  const pending = requests.filter((item) => item.status === "pending");
  const recent = requests.filter((item) => item.status !== "pending").slice(0, 12);
  const isOwner = role === "owner";

  return (
    <section style={{ display: "grid", gap: 18 }}>
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-amber-400" style={{ margin: 0 }}>Support desk</p>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 32, margin: "4px 0 8px" }}>{isOwner ? "Approve or deny support changes" : "Changes waiting for the owner"}</h2>
        <p style={{ color: "var(--text-muted)", fontSize: 13, margin: 0 }}>
          {isOwner
            ? "Support cannot publish Vault, floating-window, blog, or tournament desk edits until you accept them here."
            : "Your edits stay in this queue until the owner accepts or denies them."}
        </p>
      </div>
      {pending.length === 0 ? (
        <p style={{ color: "var(--text-muted)", fontSize: 13 }}>{isOwner ? "No support changes waiting." : "Nothing is waiting on the owner."}</p>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {pending.map((item) => (
            <article key={item.id} style={{ padding: 14, background: "var(--panel-bg)", border: "1px solid var(--border)" }}>
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)", margin: 0 }}>
                {item.actorName || "Support"} · {item.action} · {item.targetType}
              </p>
              <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, margin: "6px 0" }}>{item.targetLabel || item.summary}</h3>
              <p style={{ color: "var(--text-muted)", fontSize: 13, whiteSpace: "pre-wrap" }}>{item.summary}</p>
              {isOwner && (
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button type="button" onClick={() => onReview(item, "approved")} style={{ background: "var(--accent)", color: "var(--accent-contrast)", border: 0, padding: "8px 14px", cursor: "pointer", fontWeight: 700 }}>Accept</button>
                  <button type="button" onClick={() => onReview(item, "denied")} style={{ background: "transparent", color: "var(--danger)", border: "1px solid var(--border)", padding: "8px 14px", cursor: "pointer" }}>Deny</button>
                </div>
              )}
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
