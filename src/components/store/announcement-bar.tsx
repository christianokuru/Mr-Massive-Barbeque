import { getSettings } from "@/server/catalogue";

export async function AnnouncementBar() {
  const s = await getSettings();
  const desktop = s.bannerDesktop?.trim();
  const mobile = s.bannerMobile?.trim() || desktop;
  if (!desktop && !mobile) return null;
  return (
    <div className="bg-oxblood text-cream" data-testid="announcement">
      <p className="container-page py-2 text-center text-[13px] font-bold tracking-[0.04em]">
        <span className="md:hidden">{mobile}</span>
        <span className="hidden md:inline">{desktop || mobile}</span>
      </p>
    </div>
  );
}
