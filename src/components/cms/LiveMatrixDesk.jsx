import { useState } from "react";
import { useLiveMatrix } from "../../hooks/useLiveMatrix";

function Eyebrow({ children }) {
  return (
    <div
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "var(--text-muted)",
      }}
    >
      {children}
    </div>
  );
}

function ScoreLine({ team }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 15 }}>
      <span>{team?.name || "TBD"}</span>
      <strong style={{ fontFamily: "'JetBrains Mono', monospace" }}>
        {team?.score === null || team?.score === undefined ? "—" : team.score}
      </strong>
    </div>
  );
}

/**
 * Owner reviews agent extractions one match at a time before merge into live matrix / circuit.
 */
export default function LiveMatrixDesk({ role, onMergeCircuit }) {
  const {
    published,
    nextPending,
    pendingCount,
    canReview,
    approveOne,
    rejectOne,
    downloadDecisionsFile,
  } = useLiveMatrix({ role });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const review = async (verdict) => {
    if (!nextPending || !canReview) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (verdict === "approved") {
        await approveOne(nextPending, { onMergeCircuit });
        setMessage(`Approved ${nextPending.tournamentName} — uploaded as one event.`);
      } else {
        await rejectOne(nextPending);
        setMessage(`Rejected ${nextPending.tournamentName}.`);
      }
    } catch (issue) {
      setError(issue.message || "Could not save that decision.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section style={{ display: "grid", gap: 18 }}>
      <div>
        <Eyebrow>Live matrix · owner gate</Eyebrow>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 32, margin: "4px 0 8px" }}>
          Approve extracted matches
        </h2>
        <p style={{ color: "var(--text-muted)", fontSize: 13, maxWidth: 640 }}>
          The orchestrator stages ESPN, Liquipedia, and community room pulls into a pending queue.
          Each match uploads only after you accept it here. Download decisions, drop the file at{" "}
          <code style={{ fontSize: 12 }}>src/data/live_matrix.decisions.json</code>, then run{" "}
          <code style={{ fontSize: 12 }}>node src/agents/data_orchestrator.js --apply</code> to compile{" "}
          <code style={{ fontSize: 12 }}>live_matrix.json</code>.
        </p>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
          Pending {pendingCount} · Published {published.length}
        </span>
        {canReview && (
          <button
            type="button"
            onClick={downloadDecisionsFile}
            style={{
              background: "transparent",
              border: "1px solid var(--border)",
              color: "inherit",
              padding: "8px 12px",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            Download decisions JSON
          </button>
        )}
      </div>

      {message && <p style={{ color: "var(--accent-secondary)", fontSize: 13 }}>{message}</p>}
      {error && <p style={{ color: "tomato", fontSize: 13 }}>{error}</p>}

      {!nextPending ? (
        <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
          No pending extractions. Run{" "}
          <code style={{ fontSize: 12 }}>node src/agents/data_orchestrator.js</code> to refresh the queue.
        </p>
      ) : (
        <article
          style={{
            padding: 16,
            background: "var(--panel-bg)",
            border: "1px solid var(--border)",
            maxWidth: 560,
            display: "grid",
            gap: 12,
          }}
        >
          <Eyebrow>
            1 of {pendingCount} · {nextPending.source} · {nextPending.status}
          </Eyebrow>
          <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, margin: 0 }}>
            {nextPending.tournamentName}
          </h3>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {nextPending.gameId}
            {nextPending.gameClock ? ` · ${nextPending.gameClock}` : ""}
            {nextPending.mapStatus ? ` · ${nextPending.mapStatus}` : ""}
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            <ScoreLine team={nextPending.teamA} />
            <ScoreLine team={nextPending.teamB} />
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Room {nextPending.communityRoom?.roomId || "—"} · assets{" "}
            {nextPending.assets?.poster || "—"}
          </div>
          {canReview && (
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button
                type="button"
                disabled={busy}
                onClick={() => review("approved")}
                style={{
                  background: "var(--accent)",
                  color: "var(--accent-contrast)",
                  border: 0,
                  padding: "10px 16px",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                Approve & upload
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => review("rejected")}
                style={{
                  background: "transparent",
                  color: "inherit",
                  border: "1px solid var(--border)",
                  padding: "10px 16px",
                  cursor: "pointer",
                }}
              >
                Reject
              </button>
            </div>
          )}
        </article>
      )}

      {published.length > 0 && (
        <div>
          <Eyebrow>Published matrix (readable)</Eyebrow>
          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            {published.slice(0, 20).map((row) => (
              <div
                key={row.id}
                style={{
                  padding: "10px 12px",
                  border: "1px solid var(--border)",
                  background: "var(--panel-bg)",
                  fontSize: 13,
                }}
              >
                <strong>{row.tournamentName}</strong>
                <span style={{ color: "var(--text-muted)" }}>
                  {" "}
                  · {row.gameId} · {row.status} · {row.teamA?.name} vs {row.teamB?.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
