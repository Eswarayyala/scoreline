export function fmtDateSafe(value) {
  if (!value) return "TBD";
  try {
    return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return value;
  }
}
