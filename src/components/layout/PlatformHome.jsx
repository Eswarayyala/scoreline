import VaultCarousel from "../vault/VaultCarousel";

export default function PlatformHome({ slides, children }) {
  return (
    <div className="relative pb-10 pt-2">
      <VaultCarousel slides={slides} />
      {children}
    </div>
  );
}
