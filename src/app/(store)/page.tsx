import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Bike, CreditCard, Flame, Store } from "lucide-react";
import { ComboCard } from "@/components/store/combo-card";
import { ProductCard } from "@/components/store/product-card";
import { SectionHeading } from "@/components/store/bits";
import { jsonLd } from "@/lib/csv";
import { siteConfig } from "@/lib/site";
import { getAllProductCards, getCategories, getCombos, getOccasions } from "@/server/catalogue";
import { mediaBase } from "@/server/storage";

export default async function Home() {
  const [products, categories, occasions, combos] = await Promise.all([
    getAllProductCards(),
    getCategories(),
    getOccasions(),
    getCombos(),
  ]);
  const featured = products.filter((p) => !p.isSide).slice(0, 6);
  const sides = products.filter((p) => p.isSide).slice(0, 4);
  const hero = `${mediaBase()}/site/hero-grilled-fish.webp`;

  const org = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: siteConfig.name,
    url: siteConfig.url,
    logo: `${siteConfig.url}/brand/logo.png`,
    image: hero,
    servesCuisine: ["Nigerian", "Barbecue", "Grilled fish"],
    priceRange: "₦₦",
    address: {
      "@type": "PostalAddress",
      streetAddress: siteConfig.pickup.street,
      addressLocality: siteConfig.pickup.area,
      addressRegion: "Lagos",
      addressCountry: "NG",
    },
    email: siteConfig.email,
    areaServed: "Lagos",
    sameAs: Object.values(siteConfig.social),
    hasMenu: `${siteConfig.url}/menu`,
  };
  const site = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: siteConfig.url,
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteConfig.url}/menu?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(org) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(site) }} />

      {/* Hero: full-bleed photograph with a cream panel anchored bottom-left */}
      <section className="relative isolate flex min-h-[78svh] items-end md:min-h-[86svh]">
        <Image src={hero} alt="Whole grilled fish with chips, lime and pepper salsa" fill priority sizes="100vw" className="-z-10 object-cover" />
        <div className="container-page pb-6 md:pb-12">
          <div className="max-w-xl rounded-card bg-cream/95 p-6 md:p-10">
            <p className="eyebrow mb-4">Fire-grilled in Lagos</p>
            <h1 className="text-[length:clamp(32px,9.5vw,46px)] leading-[0.88] md:text-display">
              Grilled to perfection.{" "}
              <span className="font-accent font-light text-oxblood italic">Served with love.</span>
            </h1>
            <p className="mt-5 text-body-lg text-smoke">
              Whole catfish, croaker, chicken and turkey, basted in pepper and grilled to order. Hot delivery across Lagos or quick pickup.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link href="/menu" className="inline-flex h-13 items-center rounded-full bg-bonnet px-7 text-base font-bold text-char">
                Order now
              </Link>
              <Link href="/combos" className="inline-flex items-center gap-1 font-bold hover:underline">
                See combos <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section aria-label="Why order from us" className="border-b border-line">
        <ul className="container-page grid grid-cols-2 gap-x-4 gap-y-5 py-6 text-sm md:grid-cols-4 md:py-8">
          {[
            { icon: Flame, t: "Grilled to order", d: "Never sitting under a lamp" },
            { icon: Bike, t: "Hot delivery", d: "Lekki, VI, Ikoyi & the Mainland" },
            { icon: Store, t: "Free pickup", d: "Skip the fee, grab it fresh" },
            { icon: CreditCard, t: "Pay your way", d: "Card, transfer or USSD via Paystack" },
          ].map(({ icon: Icon, t, d }) => (
            <li key={t} className="flex items-start gap-3">
              <Icon className="mt-0.5 size-5 shrink-0 text-oxblood" />
              <span>
                <span className="block font-bold">{t}</span>
                <span className="text-muted-foreground">{d}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Menu: typographic category tabs + featured grid */}
      <section className="container-page py-16 md:py-24">
        <p className="eyebrow mb-4">The menu</p>
        <nav aria-label="Categories" className="-mx-4 mb-10 flex gap-x-7 overflow-x-auto px-4 pb-2 md:mx-0 md:flex-wrap md:px-0">
          {categories.map((c, i) => (
            <Link
              key={c.slug}
              href={`/category/${c.slug}`}
              className={`shrink-0 font-display text-[length:clamp(24px,7vw,34px)] leading-none transition md:text-heading ${i === 0 ? "text-char" : "text-ash hover:text-char"}`}
            >
              {c.name}
            </Link>
          ))}
        </nav>
        <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((p, i) => (
            <ProductCard key={p.id} p={p} priority={i === 0} />
          ))}
        </div>
        <div className="mt-12 flex justify-center">
          <Link href="/menu" className="inline-flex h-12 items-center gap-2 rounded-full border-2 border-oxblood px-6 font-bold text-oxblood hover:bg-oxblood hover:text-cream">
            See the full menu <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      {/* Occasions */}
      <section className="bg-paprika py-16 md:py-24">
        <div className="container-page">
          <SectionHeading eyebrow="Shop by occasion" title={<>What are we feeding <span className="font-accent font-light italic">today?</span></>} />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
            {occasions.map((o) => (
              <Link key={o.slug} href={`/occasion/${o.slug}`} className="group relative flex aspect-[3/4] min-w-0 items-end overflow-hidden rounded-image bg-sand p-4">
                {o.imageUrl ? (
                  <Image src={o.imageUrl} alt="" fill sizes="(min-width: 768px) 25vw, 50vw" className="-z-0 object-cover transition duration-500 group-hover:scale-[1.04]" />
                ) : null}
                <span className="relative z-10 rounded-2xl bg-cream/95 px-3 py-2">
                  <span className="block font-display text-[22px] leading-none">{o.name}</span>
                  <span className="mt-1 hidden text-sm text-muted-foreground sm:block">{o.blurb}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Combos */}
      {combos.length ? (
        <section className="container-page py-16 md:py-24">
          <SectionHeading
            eyebrow="Combos & platters"
            title="More grill, less money"
            action={
              <Link href="/combos" className="inline-flex items-center gap-1 font-bold hover:underline">
                All combos <ArrowRight className="size-4" />
              </Link>
            }
          />
          <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {combos.slice(0, 3).map((c) => (
              <ComboCard key={c.id} c={c} />
            ))}
          </div>
        </section>
      ) : null}

      {/* How it works: split section on sand */}
      <section className="bg-sand py-16 md:py-24">
        <div className="container-page grid items-center gap-10 md:grid-cols-2 md:gap-16">
          <div>
            <p className="eyebrow mb-4">How it works</p>
            <h2 className="text-[length:clamp(28px,8vw,40px)] leading-[0.92] md:text-display">From our fire to your door.</h2>
            <ol className="mt-8 flex flex-col gap-6">
              {[
                ["Pick your plate", "Catfish, croaker, chicken, turkey or a combo. Choose a size and add sides."],
                ["Pay securely", "Card, bank transfer or USSD through Paystack. No cash wahala."],
                ["We grill, you relax", "Your order hits the grill when you pay. Track it live from confirmed to delivered."],
              ].map(([t, d], i) => (
                <li key={t} className="flex gap-4">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-oxblood font-bold text-cream">{i + 1}</span>
                  <span>
                    <span className="block text-body-lg font-bold">{t}</span>
                    <span className="text-muted-foreground">{d}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
          {sides[0]?.image ? (
            <div className="relative aspect-[4/5] overflow-hidden rounded-image">
              <Image src={featured[2]?.image?.url ?? sides[0].image.url} alt={featured[2]?.image?.alt ?? sides[0].image.alt} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
            </div>
          ) : null}
        </div>
      </section>

      {/* Sides */}
      {sides.length ? (
        <section className="container-page py-16 md:py-24">
          <SectionHeading eyebrow="Complete your plate" title="Sides" action={<Link href="/category/sides" className="inline-flex items-center gap-1 font-bold hover:underline">All sides <ArrowRight className="size-4" /></Link>} />
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-6">
            {sides.map((p) => (
              <ProductCard key={p.id} p={p} sizes="(min-width: 768px) 25vw, 50vw" />
            ))}
          </div>
        </section>
      ) : null}

      {/* Quiz CTA */}
      <section className="container-page pb-16 md:pb-24">
        <div className="flex flex-col items-start gap-6 rounded-card bg-char p-8 text-cream md:flex-row md:items-center md:justify-between md:p-12">
          <div>
            <p className="mb-3 text-xs font-bold tracking-[0.12em] text-bonnet uppercase">60-second quiz</p>
            <h2 className="text-[length:clamp(26px,7.5vw,36px)] leading-[0.95] md:text-heading-lg">Not sure what to order?</h2>
            <p className="mt-3 max-w-md text-cream/75">Tell us your crew size and how much heat you can handle. We&apos;ll pick your plate.</p>
          </div>
          <Link href="/quiz" className="inline-flex h-13 shrink-0 items-center rounded-full bg-bonnet px-7 font-bold text-char">
            Find your plate
          </Link>
        </div>
      </section>
    </>
  );
}
