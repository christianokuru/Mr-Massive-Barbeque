"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BadgePercent,
  Boxes,
  ExternalLink,
  LayoutDashboard,
  Mail,
  Menu,
  MessageSquareText,
  Package,
  Settings,
  ShoppingBag,
  Tags,
  Truck,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import { SignOutButton } from "@/components/account/account-ui";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, badge: null },
  { href: "/admin/orders", label: "Orders", icon: Package, badge: "toShip" as const },
  { href: "/admin/products", label: "Products", icon: UtensilsCrossed, badge: null },
  { href: "/admin/categories", label: "Categories", icon: Tags, badge: null },
  { href: "/admin/combos", label: "Combos", icon: Boxes, badge: null },
  { href: "/admin/coupons", label: "Coupons", icon: BadgePercent, badge: null },
  { href: "/admin/reviews", label: "Reviews", icon: MessageSquareText, badge: "reviews" as const },
  { href: "/admin/customers", label: "Customers", icon: Users, badge: null },
  { href: "/admin/abandoned", label: "Abandoned bags", icon: ShoppingBag, badge: null },
  { href: "/admin/shipping", label: "Delivery zones", icon: Truck, badge: null },
  { href: "/admin/subscribers", label: "Subscribers", icon: Mail, badge: null },
  { href: "/admin/settings", label: "Settings", icon: Settings, badge: null },
];

type Badges = { toShip: number; reviews: number };

function Links({ badges, onNavigate }: { badges: Badges; onNavigate?: () => void }) {
  const path = usePathname();
  return (
    <nav aria-label="Admin" className="flex flex-col gap-0.5">
      {NAV.map((n) => {
        const active = n.href === "/admin" ? path === "/admin" : path.startsWith(n.href);
        const count = n.badge ? badges[n.badge] : 0;
        return (
          <Link
            key={n.href}
            href={n.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn("flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold", active ? "bg-oxblood text-cream" : "text-char hover:bg-sand")}
          >
            <n.icon className="size-[18px] shrink-0" />
            <span className="flex-1">{n.label}</span>
            {count ? (
              <span data-testid={`badge-${n.badge}`} className={cn("min-w-6 rounded-full px-1.5 py-0.5 text-center text-xs", active ? "bg-bonnet text-char" : "bg-bonnet text-char")}>
                {count}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

function Footer() {
  return (
    <div className="flex flex-col gap-2 border-t border-line pt-4 text-sm">
      <Link href="/" className="flex items-center gap-2 px-3 font-bold"><ExternalLink className="size-4" /> View store</Link>
      <SignOutButton className="px-3" />
    </div>
  );
}

export function AdminSidebar({ badges }: { badges: Badges }) {
  return (
    <aside className="sticky top-0 hidden h-svh w-64 shrink-0 flex-col gap-6 border-r border-line bg-white p-4 lg:flex print:hidden" data-testid="admin-sidebar">
      <Link href="/admin" className="flex items-center gap-2 px-2">
        <Image src="/brand/logo.png" alt="" width={467} height={530} className="h-10 w-auto" />
        <span className="font-display text-lg leading-none">Admin</span>
      </Link>
      <div className="flex-1 overflow-y-auto"><Links badges={badges} /></div>
      <Footer />
    </aside>
  );
}

export function AdminTopBar({ badges }: { badges: Badges }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-white px-4 lg:hidden print:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger render={<button type="button" aria-label="Open admin menu" className="-ml-2 inline-flex size-11 items-center justify-center rounded-full" />}>
          <Menu className="size-6" />
          {badges.toShip ? <span className="sr-only">{badges.toShip} orders to ship</span> : null}
        </SheetTrigger>
        <SheetContent side="left" className="w-72 gap-4 bg-white p-4">
          <SheetTitle className="font-display text-lg">Massive Admin</SheetTitle>
          <div className="flex-1 overflow-y-auto"><Links badges={badges} onNavigate={() => setOpen(false)} /></div>
          <Footer />
        </SheetContent>
      </Sheet>
      <Link href="/admin" className="font-display text-lg">Massive Admin</Link>
      {badges.toShip ? <Link href="/admin/orders?status=to_ship" className="ml-auto rounded-full bg-bonnet px-3 py-1 text-xs font-bold">{badges.toShip} to ship</Link> : null}
    </div>
  );
}
