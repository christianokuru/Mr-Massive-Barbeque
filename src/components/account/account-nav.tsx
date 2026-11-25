"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gift, Heart, Home, MapPin, Package, User } from "lucide-react";
import { BottomBarOffset } from "@/components/providers";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/account", label: "Home", icon: Home },
  { href: "/account/orders", label: "Orders", icon: Package },
  { href: "/account/rewards", label: "Rewards", icon: Gift },
  { href: "/account/favourites", label: "Saved", icon: Heart },
  { href: "/account/settings", label: "Account", icon: User },
];

function isActive(path: string, href: string) {
  return href === "/account" ? path === "/account" : path.startsWith(href);
}

export function AccountSideNav() {
  const path = usePathname();
  return (
    <nav aria-label="Account" className="hidden flex-col gap-1 lg:flex">
      {[...TABS.slice(0, 4), { href: "/account/addresses", label: "Addresses", icon: MapPin }, TABS[4]].map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={isActive(path, t.href) ? "page" : undefined}
          className={cn("flex h-11 items-center gap-3 rounded-full px-4 font-bold", isActive(path, t.href) ? "bg-oxblood text-cream" : "hover:bg-sand")}
        >
          <t.icon className="size-5" /> {t.label === "Account" ? "Settings" : t.label}
        </Link>
      ))}
    </nav>
  );
}

/** App-style bottom tab bar on phones; lifts the WhatsApp button above it. */
export function AccountTabBar() {
  const path = usePathname();
  return (
    <>
      <BottomBarOffset px={68} />
      <nav
        aria-label="Account tabs"
        data-testid="account-tabbar"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-cream/95 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur lg:hidden print:hidden"
      >
        {TABS.map((t) => {
          const active = isActive(path, t.href);
          return (
            <Link key={t.href} href={t.href} aria-current={active ? "page" : undefined} className={cn("flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-bold", active ? "text-oxblood" : "text-smoke")}>
              <t.icon className={cn("size-5", active && "fill-paprika")} />
              {t.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
