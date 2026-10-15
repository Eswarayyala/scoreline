/** Owner and support both have write access to circuit CMS (Vault slides + tournaments). */
export const CMS_WRITE_ROLES = ["owner", "support"];

export function canWriteCircuitContent(role) {
  return CMS_WRITE_ROLES.includes(String(role || "").toLowerCase());
}

export function staffWriteGate(role) {
  return {
    canWrite: canWriteCircuitContent(role),
    role: role || "guest",
    authHook: "firebase-siteRoles",
  };
}
