import { presenceLinks } from "../../data/sitePresence";

function LinkRow({ title, profile }) {
  const links = presenceLinks(profile);
  if (!links.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
        {profile?.label || title}
      </span>
      {links.map((link) => (
        <a
          key={`${title}-${link.id}`}
          href={link.href}
          target="_blank"
          rel="noreferrer"
          className="font-mono text-[10px] uppercase tracking-widest text-amber-300 no-underline hover:text-white"
        >
          {link.label}
        </a>
      ))}
    </div>
  );
}

export default function StaffSocialLinks({ ownerProfile, supportProfile }) {
  const hasOwner = presenceLinks(ownerProfile).length > 0;
  const hasSupport = presenceLinks(supportProfile).length > 0;
  if (!hasOwner && !hasSupport) return null;
  return (
    <div className="mt-2 flex flex-col gap-1.5 border-t border-white/5 pt-2 sm:flex-row sm:flex-wrap sm:gap-x-6">
      {hasOwner && <LinkRow title="Owner" profile={ownerProfile} />}
      {hasSupport && <LinkRow title="Support" profile={supportProfile} />}
    </div>
  );
}
