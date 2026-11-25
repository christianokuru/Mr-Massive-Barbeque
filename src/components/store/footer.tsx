import Image from "next/image";
import Link from "next/link";
import { siteConfig } from "@/lib/site";
import { CookieSettingsLink } from "./consent";
import { NewsletterForm } from "./newsletter-form";

const cols = [
  {
    title: "Order",
    links: [
      { href: "/menu", label: "Full menu" },
      { href: "/combos", label: "Combos & platters" },
      { href: "/occasion/party", label: "Party & office trays" },
      { href: "/quiz", label: "Find your plate" },
      { href: "/track", label: "Track an order" },
    ],
  },
  {
    title: "Help",
    links: [
      { href: "/shipping", label: "Delivery areas & fees" },
      { href: "/returns", label: "Refunds & issues" },
      { href: "/faq", label: "FAQ" },
      { href: "/contact", label: "Contact us" },
    ],
  },
  {
    title: "Massive",
    links: [
      { href: "/about", label: "Our story" },
      { href: "/journal", label: "Journal" },
      { href: "/account/rewards", label: "Refer a friend" },
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-auto bg-oxblood pb-safe text-cream print:hidden">
      <div className="container-page grid grid-cols-[minmax(0,1fr)] gap-12 py-14 md:grid-cols-[minmax(0,1.3fr)_minmax(0,2fr)] md:py-20">
        <div className="flex flex-col gap-6">
          <Image src="/brand/logo-light.png" alt="Massive Barbeque" width={333} height={378} className="h-24 w-auto self-start" />
          <div>
            <p className="font-display text-[length:clamp(24px,6.8vw,32px)] leading-none">10% off your first order</p>
            <p className="mt-2 text-cream/75">New menu drops, weekend specials and your welcome code.</p>
          </div>
          <NewsletterForm source="footer" dark />
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          {cols.map((c) => (
            <div key={c.title}>
              <p className="mb-4 text-xs font-bold tracking-[0.12em] text-bonnet uppercase">{c.title}</p>
              <ul className="flex flex-col gap-3">
                {c.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-cream/85 hover:text-cream hover:underline">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="col-span-2 sm:col-span-3">
            <p className="mb-3 text-xs font-bold tracking-[0.12em] text-bonnet uppercase">Follow the smoke</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(siteConfig.social).map(([k, url]) => (
                <a key={k} href={url} target="_blank" rel="noopener noreferrer" className="rounded-full border border-cream/30 px-4 py-2 text-sm capitalize hover:bg-cream/10">
                  {k === "x" ? "X" : k}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-cream/15">
        <div className="container-page flex flex-col gap-3 py-6 text-sm text-cream/70 md:flex-row md:items-center md:justify-between">
          <p>© {siteConfig.name} · Lagos, Nigeria · Grilled to perfection, served with love.</p>
          <div className="flex flex-wrap items-center gap-4">
            <CookieSettingsLink className="hover:text-cream hover:underline" />
            <span>
              Made with love by{" "}
              <a href={siteConfig.credit.url} target="_blank" rel="noopener noreferrer" className="font-bold text-cream underline">
                {siteConfig.credit.label}
              </a>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
