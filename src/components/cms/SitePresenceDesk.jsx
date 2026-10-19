import { useEffect, useState } from "react";
import { SOCIAL_PLATFORMS, emptyPresenceProfile, normalizePresenceProfile } from "../../data/sitePresence";

function ProfileEditor({ title, hint, value, onChange }) {
  return (
    <section style={{ padding: 16, background: "var(--panel-bg)", border: "1px solid var(--border)" }}>
      <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--accent-secondary)", margin: 0 }}>
        {title}
      </p>
      <p style={{ color: "var(--text-muted)", fontSize: 13, margin: "8px 0 14px" }}>{hint}</p>
      <label style={{ display: "grid", gap: 6, marginBottom: 12, fontSize: 13 }}>
        Public label
        <input
          value={value.label || ""}
          maxLength={60}
          onChange={(event) => onChange({ ...value, label: event.target.value })}
          placeholder="e.g. GrindInfo Owner"
          style={{ padding: "8px 10px", background: "var(--page-bg)", border: "1px solid var(--border)", color: "inherit" }}
        />
      </label>
      <div style={{ display: "grid", gap: 10 }}>
        {SOCIAL_PLATFORMS.map((platform) => (
          <label key={platform.id} style={{ display: "grid", gap: 6, fontSize: 13 }}>
            {platform.label}
            <input
              value={value[platform.id] || ""}
              maxLength={300}
              onChange={(event) => onChange({ ...value, [platform.id]: event.target.value })}
              placeholder={`@handle or https://…`}
              style={{ padding: "8px 10px", background: "var(--page-bg)", border: "1px solid var(--border)", color: "inherit" }}
            />
          </label>
        ))}
      </div>
    </section>
  );
}

export default function SitePresenceDesk({
  role,
  ownerProfile,
  supportProfile,
  onSaveOwner,
  onSaveSupport,
}) {
  const isOwner = role === "owner";
  const [ownerDraft, setOwnerDraft] = useState(() => normalizePresenceProfile(ownerProfile, "Owner"));
  const [supportDraft, setSupportDraft] = useState(() => normalizePresenceProfile(supportProfile, "Support"));
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setOwnerDraft(normalizePresenceProfile(ownerProfile, "Owner"));
  }, [ownerProfile]);

  useEffect(() => {
    setSupportDraft(normalizePresenceProfile(supportProfile, "Support"));
  }, [supportProfile]);

  const save = async (which) => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (which === "owner") await onSaveOwner(ownerDraft);
      else await onSaveSupport(supportDraft);
      setMessage(which === "owner" ? "Owner socials published." : "Support socials published.");
    } catch (err) {
      setError(err?.message || "Could not save socials.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 18, maxWidth: 720 }}>
      <p style={{ color: "var(--text-muted)", fontSize: 13, margin: 0 }}>
        These links show publicly on the site nav. Use full https URLs or @handles. Owner can edit both profiles; support can edit the support profile.
      </p>
      {isOwner && (
        <>
          <ProfileEditor
            title="Owner presence"
            hint="Shown as the GrindInfo owner contact strip."
            value={ownerDraft}
            onChange={setOwnerDraft}
          />
          <button type="button" disabled={busy} onClick={() => save("owner")} style={{ justifySelf: "start", padding: "10px 14px", border: "1px solid var(--border)", background: "var(--accent-secondary)", color: "#041018", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 11 }}>
            Save owner socials
          </button>
        </>
      )}
      {(isOwner || role === "support") && (
        <>
          <ProfileEditor
            title="Support presence"
            hint="Shown as the support / help contact strip."
            value={supportDraft}
            onChange={setSupportDraft}
          />
          <button type="button" disabled={busy} onClick={() => save("support")} style={{ justifySelf: "start", padding: "10px 14px", border: "1px solid var(--border)", background: "var(--accent-secondary)", color: "#041018", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 11 }}>
            Save support socials
          </button>
        </>
      )}
      {!isOwner && role !== "support" && <p style={{ color: "var(--text-muted)" }}>Staff access required.</p>}
      {message && <p role="status" style={{ color: "var(--success, #34d399)", fontSize: 13 }}>{message}</p>}
      {error && <p role="alert" style={{ color: "var(--danger)", fontSize: 13 }}>{error}</p>}
      <button
        type="button"
        onClick={() => {
          if (isOwner) setOwnerDraft(emptyPresenceProfile("Owner"));
          setSupportDraft(emptyPresenceProfile("Support"));
        }}
        style={{ justifySelf: "start", background: "transparent", border: "none", color: "var(--text-muted)", fontSize: 12 }}
      >
        Reset drafts
      </button>
    </div>
  );
}
