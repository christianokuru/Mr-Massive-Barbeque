"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export function MobileMenu({ nav }: { nav: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <button
            type="button"
            className="-ml-2 inline-flex size-11 items-center justify-center rounded-full lg:hidden"
            aria-label="Open menu"
            data-testid="mobile-menu-button"
          />
        }
      >
        <Menu className="size-6" />
      </SheetTrigger>
      <SheetContent side="left" className="w-[86vw] max-w-sm bg-cream p-0" showCloseButton={false}>
        <div className="flex h-16 items-center justify-between px-4">
          <SheetTitle className="eyebrow">Massive Barbeque</SheetTitle>
          <SheetClose render={<button type="button" className="inline-flex size-11 items-center justify-center rounded-full" aria-label="Close menu" />}>
            <X className="size-6" />
          </SheetClose>
        </div>
        <nav aria-label="Mobile" className="flex flex-col px-4 pb-8">
          {[{ href: "/", label: "Home" }, ...nav, { href: "/about", label: "About" }, { href: "/contact", label: "Contact" }].map((n) => (
            <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="border-b border-line py-4 font-display text-[28px] leading-none">
              {n.label}
            </Link>
          ))}
          <Link
            href="/menu"
            onClick={() => setOpen(false)}
            className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-bonnet font-bold text-char"
          >
            Order now
          </Link>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
