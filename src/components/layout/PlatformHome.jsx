import VaultCarousel from "../vault/VaultCarousel";

export default function PlatformHome({ onOpenVaultSlide, children }) {
  return (
    <div className="relative pb-10 pt-2">
      <VaultCarousel onOpenSlide={onOpenVaultSlide} />
      {children}
    </div>
  );
}
