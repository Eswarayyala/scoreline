import { useEffect, useState } from "react";
import {
  UI_PLACES,
  UI_SURFACES,
  defaultUiLayout,
  normalizeUiLayout,
} from "../../data/siteUiLayout";

const placeLabel = {
  nav: "Header nav",
  home: "Home only",
  both: "Nav + Home",
  off: "Hidden",
};

/** Owner desk: which surfaces guests / signed-in users see, and where. */
export default function SiteUiLayoutDesk({ layout = null, onSave }) {
  const [draft, setDraft] = useState(() => normalizeUiLayout(layout || defaultUiLayout()));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  useEffect(() => {
    setDraft(normalizeUiLayout(layout || defaultUiLayout()));
  }, [layout]);

  const patch = (id, key, value) => {
    setDraft((prev) => ({
      ...prev,
      surfaces: {
        ...prev.surfaces,
        [id]: { ...prev.surfaces[id], [key]: value },
      },
    }));
    setSaved("");
  };

  const save = async () => {
    setBusy(true);
    setError("");
    setSaved("");
    try {
      await onSave(draft);
      setSaved("Layout saved — guest and signed-in chrome update live.");
    } catch (e) {
      setError(e?.message || "Could not save layout. Check Firebase rules for siteSettings/uiLayout.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <p style={{ color: "var(--text-muted)", fontSize: 13, maxWidth: 640 }}>
        Control what appears for <strong style={{ color: "var(--page-text)" }}>guests</strong> vs{" "}
        <strong style={{ color: "var(--page-text)" }}>signed-in users</strong>, and whether each surface lives in the{" "}
        <strong style={{ color: "var(--page-text)" }}>header nav</strong>, on <strong style={{ color: "var(--page-text)" }}>Home</strong>, both, or off.
        Home icon stays in the header. Scrims stays the default landing tab.
      </p>

      <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
        {UI_SURFACES.map((item) => {
          const row = draft.surfaces[item.id];
          return (
            <article
              key={item.id}
              style={{
                display: "grid",
                gap: 10,
                padding: 14,
                background: "var(--panel-bg)",
                border: "1px solid var(--border)",
              }}
            >
              <div>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22 }}>{item.label}</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--text-dim)" }}>
                  {item.to} · {item.copy}
                </div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center" }}>
                <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
                  <input
                    type="checkbox"
                    checked={row.guest}
                    onChange={(e) => patch(item.id, "guest", e.target.checked)}
                  />
                  Guest
                </label>
                <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
                  <input
                    type="checkbox"
                    checked={row.user}
                    onChange={(e) => patch(item.id, "user", e.target.checked)}
                  />
                  Signed-in
                </label>
                <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
                  Place
                  <select
                    value={row.place}
                    onChange={(e) => patch(item.id, "place", e.target.value)}
                    style={{
                      background: "var(--input-bg)",
                      color: "var(--page-text)",
                      border: "1px solid var(--border)",
                      padding: "8px 10px",
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 11,
                    }}
                  >
                    {UI_PLACES.map((p) => (
                      <option key={p} value={p}>
                        {placeLabel[p]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </article>
          );
        })}
      </div>

      {error ? <p role="alert" style={{ color: "var(--danger)", marginTop: 12 }}>{error}</p> : null}
      {saved ? <p style={{ color: "var(--success)", marginTop: 12 }}>{saved}</p> : null}
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button
          type="button"
          disabled={busy}
          onClick={save}
          style={{
            border: "1px solid var(--accent)",
            background: "var(--accent)",
            color: "var(--accent-contrast)",
            padding: "10px 16px",
            cursor: busy ? "wait" : "pointer",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          {busy ? "Saving…" : "Save UI layout"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => setDraft(defaultUiLayout())}
          style={{
            border: "1px solid var(--border)",
            background: "transparent",
            color: "var(--page-text)",
            padding: "10px 16px",
            cursor: "pointer",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          Reset defaults
        </button>
      </div>
    </section>
  );
}
