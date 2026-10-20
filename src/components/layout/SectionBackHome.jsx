import { useNavigate } from "react-router-dom";

/** Back control for hub pages so users return to Home instead of Vault. */
export default function SectionBackHome({ label = "Home" } = {}) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate("/", { replace: true })}
      className="mb-3 inline-flex min-h-9 items-center font-mono text-[10px] uppercase tracking-widest text-amber-300 hover:text-amber-200"
    >
      ← {label}
    </button>
  );
}
