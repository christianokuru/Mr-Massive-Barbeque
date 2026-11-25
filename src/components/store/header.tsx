import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { Search, ShoppingBag, User } from "lucide-react";
import { cartCount, getCurrentCartLines } from "@/server/cart";
import { getSession, isAdminSession } from "@/server/session";
import { initials } from "@/lib/format";
import { MobileMenu } from "./mobile-menu";
import { NavLinks } from "./nav-links";

export const NAV = [
  { href: "/menu", label: "Menu" },
  { href: "/combos", label: "Combos" },
  { href: "/quiz", label: "Find your plate" },
  { href: "/journal", label: "Journal" },
  { href: "/track", label: "Track order" },
];

const iconBtn =
  "relative inline-flex size-11 items-center justify-center rounded-full text-char transition hover:bg-sand focus-visible:ring-3 focus-visible:ring-ring/50 outline-none";

async function AccountBadge() {
  const session = await getSession();
  if (!session) {
    return (
      <Link href="/sign-in" className={iconBtn} aria-label="Sign in">
        <User className="size-5" />
      </Link>
    );
  }
  if (isAdminSession(session)) {
    return (
      <Link
        href="/admin"
        className="inline-flex h-9 items-center rounded-full bg-oxblood px-3 text-xs font-bold tracking-[0.08em] text-cream"
        aria-label="Admin dashboard"
      >
        ADMIN
      </Link>
    );
  }
  return (
    <Link href="/account" className={iconBtn} aria-label="Your account">
      <span className="inline-flex size-8 items-center justify-center rounded-full bg-oxblood text-xs font-bold text-cream">
        {initials(session.user.name)}
      </span>
    </Link>
  );
}

async function BagButton() {
  const count = cartCount(await getCurrentCartLines());
  return (
    <Link href="/cart" className={iconBtn} aria-label={`Bag, ${count} item${count === 1 ? "" : "s"}`} data-testid="bag-button">
      <ShoppingBag className="size-5" />
      {count > 0 ? (
        <span
          data-testid="bag-count"
          className="absolute -top-0.5 -right-0.5 inline-flex min-w-5 items-center justify-center rounded-full bg-bonnet px-1 text-[11px] font-bold text-char"
        >
          {count}
        </span>
      ) : null}
    </Link>
  );
}

function BagFallback() {
  return (
    <Link href="/cart" className={iconBtn} aria-label="Bag">
      <ShoppingBag className="size-5" />
    </Link>
  );
}

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-cream/95 backdrop-blur supports-[backdrop-filter]:bg-cream/80">
      <div className="container-page flex h-16 items-center gap-2 md:h-20">
        <MobileMenu nav={NAV} />
        <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="Massive Barbeque home">
          <Image src="/brand/logo.png" alt="Massive Barbeque" width={467} height={530} priority className="h-11 w-auto md:h-14" />
        </Link>
        <Suspense
          fallback={
            <nav aria-label="Main" className="ml-6 hidden items-center gap-1 lg:flex">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="rounded-full px-3 py-2 text-sm font-bold tracking-[0.05em] uppercase">{n.label}</Link>
              ))}
            </nav>
          }
        >
          <NavLinks nav={NAV} />
        </Suspense>
        <div className="ml-auto flex items-center gap-0.5">
          <Link href="/menu?focus=search" className={iconBtn} aria-label="Search the menu">
            <Search className="size-5" />
          </Link>
          <Suspense fallback={<span className={iconBtn}><User className="size-5" /></span>}>
            <AccountBadge />
          </Suspense>
          <Suspense fallback={<BagFallback />}>
            <BagButton />
          </Suspense>
          <Link
            href="/menu"
            className="ml-2 hidden h-11 items-center rounded-full border-2 border-oxblood px-5 text-sm font-bold tracking-[0.06em] text-oxblood uppercase transition hover:bg-oxblood hover:text-cream lg:inline-flex"
          >
            Order
          </Link>
        </div>
      </div>
    </header>
  );
}
