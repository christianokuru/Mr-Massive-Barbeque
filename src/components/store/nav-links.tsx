"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function NavLinks({ nav }: { nav: { href: string; label: string }[] }) {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="ml-6 hidden items-center gap-1 lg:flex">
      {nav.map((n) => {
        const active = path === n.href || path.startsWith(`${n.href}/`);
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-full px-3 py-2 text-sm font-bold tracking-[0.05em] uppercase transition hover:bg-sand",
              active && "bg-sand",
            )}
          >
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}
