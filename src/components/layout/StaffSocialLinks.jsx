import { presenceLinks } from "../../data/sitePresence";

export default function StaffSocialLinks({ ownerProfile, supportProfile }) {
  const links = [
    ...presenceLinks(ownerProfile).map((link) => ({ ...link, group: ownerProfile?.label || "Owner" })),
    ...presenceLinks(supportProfile).map((link) => ({ ...link, group: supportProfile?.label || "Support" })),
  ];
  if (!links.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 py-1.5">
      {links.map((link) => (
        <a
          key={`${link.group}-${link.id}`}
          href={link.href}
          target="_blank"
          rel="noreferrer"
          title={`${link.group} · ${link.label}`}
          className="font-mono text-[9px] uppercase tracking-widest text-stone-500 no-underline hover:text-amber-300"
        >
          {link.label}
        </a>
      ))}
    </div>
  );
}
