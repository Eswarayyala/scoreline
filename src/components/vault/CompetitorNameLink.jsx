import { Link } from "react-router-dom";
import { dossierPath } from "../../data/competitorIndex";

/** Clickable franchise / player name → merged dossier from vault fast data. */
export default function CompetitorNameLink({
  name = "",
  className = "text-neon no-underline hover:underline",
  stopCardNav = false,
  children,
}) {
  const label = String(children ?? name ?? "").trim();
  if (!label) return null;
  return (
    <Link
      to={dossierPath(label)}
      className={className}
      onClick={stopCardNav ? (event) => event.stopPropagation() : undefined}
    >
      {label}
    </Link>
  );
}
