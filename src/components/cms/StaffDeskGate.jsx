import { useEffect, useState } from "react";
import { clearDeskUnlock, hashDeskPassword, hashFieldForRole, readDeskUnlock, writeDeskUnlock } from "../../lib/deskGate";

export default function StaffDeskGate({
  role,
  gate = null,
  gateLoading = false,
  isOwner = false,
  onSaveRolePassword,
  children,
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [setupPassword, setSetupPassword] = useState("");
  const [setupConfirm, setSetupConfirm] = useState("");
  const [unlocked, setUnlocked] = useState(() => readDeskUnlock(role));
  const field = hashFieldForRole(role);
  const requiredHash = String(gate?.[field] || "");

  useEffect(() => {
    setUnlocked(readDeskUnlock(role));
  }, [role, requiredHash]);

  const unlock = async (event) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (!requiredHash) {
        setError(isOwner ? "Set a desk password below first." : "Owner has not set a support desk password yet.");
        return;
      }
      const next = await hashDeskPassword(password);
      if (next !== requiredHash) {
        setError("Incorrect desk password.");
        return;
      }
      writeDeskUnlock(role);
      setUnlocked(true);
      setPassword("");
    } catch (issue) {
      setError(issue.message || "Could not unlock the desk.");
    } finally {
      setBusy(false);
    }
  };

  const savePassword = async (event) => {
    event.preventDefault();
    setError("");
    if (setupPassword !== setupConfirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const hash = await hashDeskPassword(setupPassword);
      await onSaveRolePassword(role, hash);
      writeDeskUnlock(role);
      setUnlocked(true);
      setSetupPassword("");
      setSetupConfirm("");
    } catch (issue) {
      setError(issue.message || "Could not save desk password.");
    } finally {
      setBusy(false);
    }
  };

  if (gateLoading) {
    return <div className="px-5 py-16 text-center text-stone-400">Checking desk lock…</div>;
  }

  if (unlocked && requiredHash) {
    return (
      <div>
        <div className="mb-3 flex justify-end px-1">
          <button
            type="button"
            className="font-mono text-[10px] uppercase tracking-widest text-stone-500 hover:text-stone-300"
            onClick={() => {
              clearDeskUnlock();
              setUnlocked(false);
            }}
          >
            Lock desk
          </button>
        </div>
        {children}
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-md space-y-6 px-5 py-16">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber-300">Staff desk</p>
        <h1 className="mt-2 font-display text-3xl text-white">{role === "owner" ? "Owner" : "Support"} password</h1>
        <p className="mt-2 text-sm text-stone-400">
          Account sign-in alone is not enough. Enter the desk password to open the {role} dashboard.
        </p>
      </div>

      {requiredHash ? (
        <form onSubmit={unlock} className="space-y-3 rounded-xl border border-white/10 bg-slate-950/70 p-4">
          <label className="grid gap-1 text-xs text-stone-400">
            Desk password
            <input
              type="password"
              autoComplete="current-password"
              className="rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="rounded-full bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
          >
            {busy ? "Checking…" : "Unlock desk"}
          </button>
        </form>
      ) : (
        <p className="text-sm text-amber-200/90">
          {isOwner
            ? "No desk password is set yet. Create one below for this role."
            : "Ask the owner to set a support desk password from Access."}
        </p>
      )}

      {isOwner && (
        <form onSubmit={savePassword} className="space-y-3 rounded-xl border border-white/10 bg-slate-950/70 p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
            {requiredHash ? `Update ${role} desk password` : `Create ${role} desk password`}
          </p>
          <label className="grid gap-1 text-xs text-stone-400">
            New password
            <input
              type="password"
              autoComplete="new-password"
              className="rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white"
              value={setupPassword}
              onChange={(event) => setSetupPassword(event.target.value)}
              required
            />
          </label>
          <label className="grid gap-1 text-xs text-stone-400">
            Confirm
            <input
              type="password"
              autoComplete="new-password"
              className="rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white"
              value={setupConfirm}
              onChange={(event) => setSetupConfirm(event.target.value)}
              required
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="rounded-full border border-white/20 px-4 py-2 text-sm text-white disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save password"}
          </button>
        </form>
      )}

      {error && <p className="text-sm text-rose-400" role="alert">{error}</p>}
    </section>
  );
}
