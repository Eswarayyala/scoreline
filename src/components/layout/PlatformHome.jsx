import VaultCarousel from "../vault/VaultCarousel";

export default function PlatformHome({ onOpenVaultSlide, slides, children }) {
  return (
    <div className="relative pb-10 pt-2">
      <VaultCarousel slides={slides} onOpenSlide={onOpenVaultSlide} />
      {children}
    </div>
  );
}
