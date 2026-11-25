import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Check } from "lucide-react";
import { ComboAdd } from "@/components/store/combo-add";
import { jsonLd } from "@/lib/csv";
import { formatNaira } from "@/lib/money";
import { siteConfig } from "@/lib/site";
import { getCombo, getCombos } from "@/server/catalogue";

export async function generateStaticParams() {
  return (await getCombos()).map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps<"/combos/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const c = await getCombo(slug);
  if (!c) notFound();
  return {
    title: `${c.name} combo`,
    description: `${c.description} ${formatNaira(c.priceKobo)}, save ${formatNaira(c.valueKobo - c.priceKobo)}.`,
    alternates: { canonical: `/combos/${c.slug}` },
    openGraph: c.imageUrl ? { images: [c.imageUrl] } : undefined,
  };
}

async function Combo({ params }: { params: PageProps<"/combos/[slug]">["params"] }) {
  const { slug } = await params;
  const c = await getCombo(slug);
  if (!c) notFound();
  const save = c.valueKobo - c.priceKobo;
  const ld = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: c.name,
    description: c.description,
    image: c.imageUrl ? [c.imageUrl] : undefined,
    brand: { "@type": "Brand", name: siteConfig.name },
    offers: {
      "@type": "Offer",
      price: (c.priceKobo / 100).toFixed(2),
      priceCurrency: "NGN",
      availability: c.available ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `${siteConfig.url}/combos/${c.slug}`,
    },
  };
  return (
    <div className="container-page py-8 md:py-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ld) }} />
      <div className="grid gap-8 md:grid-cols-2 md:gap-12">
        <div className="relative aspect-[4/3] overflow-hidden rounded-image bg-sand md:aspect-square">
          {c.imageUrl ? <Image src={c.imageUrl} alt={c.name} fill priority sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" /> : null}
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          <div>
            <Link href="/combos" className="eyebrow">Combos</Link>
            <h1 className="mt-3 text-[length:clamp(30px,8.5vw,44px)] leading-[0.9] md:text-[64px]" data-wa-product={`the ${c.name} combo`}>{c.name}</h1>
            <p className="mt-4 text-body-lg text-smoke">{c.description}</p>
          </div>
          <p className="flex items-baseline gap-3">
            <span className="font-display text-heading-sm">{formatNaira(c.priceKobo)}</span>
            {save > 0 ? <span className="text-muted-foreground line-through">{formatNaira(c.valueKobo)}</span> : null}
            {save > 0 ? <span className="rounded-full bg-bonnet px-3 py-1 text-sm font-bold">Save {formatNaira(save)}</span> : null}
          </p>
          <div className="rounded-card bg-white p-5">
            <p className="mb-3 font-bold">What&apos;s inside</p>
            <ul className="flex flex-col gap-2">
              {c.items.map((i) => (
                <li key={i.variantId} className="flex items-start gap-2">
                  <Check className="mt-0.5 size-5 shrink-0 text-oxblood" />
                  <span>
                    {i.qty} × <Link href={`/menu/${i.productSlug}`} className="font-bold hover:underline">{i.productName}</Link> ({i.size})
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <ComboAdd comboId={c.id} name={c.name} priceKobo={c.priceKobo} available={c.available} />
        </div>
      </div>
    </div>
  );
}

export default function ComboPage({ params }: PageProps<"/combos/[slug]">) {
  return (
    <Suspense fallback={<div className="container-page min-h-[70vh] py-10" />}>
      <Combo params={params} />
    </Suspense>
  );
}
