import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { and, eq } from "drizzle-orm";
import { Bike, ChevronRight, Clock, Store } from "lucide-react";
import { db } from "@/db";
import * as s from "@/db/schema";
import { Price, SpiceMeter, Stars } from "@/components/store/bits";
import { BuyBox } from "@/components/store/buy-box";
import { FavouriteButton } from "@/components/store/favourite-button";
import { ProductGallery } from "@/components/store/product-gallery";
import { ProductCard } from "@/components/store/product-card";
import { ReviewForm } from "@/components/store/review-form";
import { jsonLd } from "@/lib/csv";
import { formatDate } from "@/lib/format";
import { formatNaira } from "@/lib/money";
import { siteConfig } from "@/lib/site";
import { getActiveProductSlugs, getAllProductCards, getProduct, getZones } from "@/server/catalogue";
import { getSession } from "@/server/session";

export async function generateStaticParams() {
  return (await getActiveProductSlugs()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/menu/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) notFound();
  const title = p.seoTitle || `${p.name} | Order online in Lagos`;
  const description = p.seoDescription || `${p.shortDescription} From ${formatNaira(p.fromKobo)}. Hot delivery across Lagos or free pickup.`;
  return {
    title,
    description,
    alternates: { canonical: `/menu/${p.slug}` },
    openGraph: { title, description, images: p.images[0] ? [{ url: p.images[0].url, alt: p.images[0].alt }] : undefined, type: "website" },
  };
}

async function FavouriteSlot({ productId }: { productId: number }) {
  const session = await getSession();
  let fav = false;
  if (session) {
    const [row] = await db
      .select()
      .from(s.favourite)
      .where(and(eq(s.favourite.userId, session.user.id), eq(s.favourite.productId, productId)));
    fav = !!row;
  }
  return <FavouriteButton productId={productId} initial={fav} />;
}

async function ReviewSlot({ productId }: { productId: number }) {
  const session = await getSession();
  return <ReviewForm productId={productId} signedIn={!!session?.user.emailVerified} />;
}

async function Product({ params }: { params: PageProps<"/menu/[slug]">["params"] }) {
  const { slug } = await params;
  const [p, zones, all] = await Promise.all([getProduct(slug), getZones(), getAllProductCards()]);
  if (!p) notFound();

  const fees = zones.map((z) => z.feeKobo);
  const related = all.filter((x) => x.id !== p.id && !x.isSide && x.categorySlug !== p.categorySlug).slice(0, 3);
  const url = `${siteConfig.url}/menu/${p.slug}`;
  const inStock = p.variants.some((v) => v.stock > 0);

  const productLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.description,
    image: p.images.map((i) => i.url),
    sku: p.variants[0]?.sku,
    brand: { "@type": "Brand", name: siteConfig.name },
    category: p.categoryName ?? undefined,
    offers: p.variants.map((v) => ({
      "@type": "Offer",
      name: v.name,
      sku: v.sku,
      price: (v.priceKobo / 100).toFixed(2),
      priceCurrency: "NGN",
      availability: v.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url,
      seller: { "@type": "Organization", name: siteConfig.name },
    })),
    ...(p.rating.count
      ? {
          aggregateRating: { "@type": "AggregateRating", ratingValue: p.rating.avg, reviewCount: p.rating.count },
          review: p.reviews.slice(0, 5).map((r) => ({
            "@type": "Review",
            author: { "@type": "Person", name: r.authorName },
            reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5 },
            reviewBody: r.body,
            datePublished: new Date(r.createdAt).toISOString().slice(0, 10),
          })),
        }
      : {}),
  };
  const crumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteConfig.url },
      { "@type": "ListItem", position: 2, name: "Menu", item: `${siteConfig.url}/menu` },
      ...(p.categorySlug ? [{ "@type": "ListItem", position: 3, name: p.categoryName, item: `${siteConfig.url}/category/${p.categorySlug}` }] : []),
      { "@type": "ListItem", position: p.categorySlug ? 4 : 3, name: p.name, item: url },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(productLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbs) }} />
      <div className="container-page py-6 md:py-10">
        <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
          <Link href="/" className="hover:underline">Home</Link>
          <ChevronRight className="size-3.5" />
          <Link href="/menu" className="hover:underline">Menu</Link>
          {p.categorySlug ? (
            <>
              <ChevronRight className="size-3.5" />
              <Link href={`/category/${p.categorySlug}`} className="hover:underline">{p.categoryName}</Link>
            </>
          ) : null}
          <ChevronRight className="size-3.5" />
          <span className="text-char">{p.name}</span>
        </nav>

        <div className="grid gap-8 md:grid-cols-2 md:gap-12">
          <div className="min-w-0 md:sticky md:top-28 md:self-start">
            <ProductGallery images={p.images} name={p.name} />
          </div>
          <div className="flex min-w-0 flex-col gap-6">
            <div>
              {p.categoryName ? <p className="eyebrow mb-3">{p.categoryName}</p> : null}
              <div className="flex items-start justify-between gap-4">
                <h1 className="text-[44px] leading-[0.9] md:text-[64px]" data-wa-product={p.name}>{p.name}</h1>
                <Suspense fallback={<span className="size-11" />}>
                  <FavouriteSlot productId={p.id} />
                </Suspense>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
                <Price kobo={p.fromKobo} compareKobo={p.compareAtKobo} from={p.variants.length > 1} className="text-subheading" />
                {p.rating.count ? (
                  <a href="#reviews"><Stars value={p.rating.avg} count={p.rating.count} /></a>
                ) : null}
                <SpiceMeter level={p.spiceLevel} />
              </div>
              <p className="mt-4 text-body-lg text-smoke">{p.description}</p>
            </div>

            <BuyBox
              productId={p.id}
              name={p.name}
              variants={p.variants}
              sides={p.sides
                .filter((x) => x.id !== p.id)
                .map((x) => ({ id: x.id, slug: x.slug, name: x.name, fromKobo: x.fromKobo, image: x.image, variantId: x.defaultVariantId, totalStock: x.totalStock }))}
            />

            <ul className="grid gap-3 rounded-card border border-line p-4 text-sm sm:grid-cols-3">
              <li className="flex gap-2">
                <Bike className="size-5 shrink-0 text-oxblood" />
                <span>
                  <span className="block font-bold">
                    Delivery {fees.length ? `${formatNaira(Math.min(...fees))}–${formatNaira(Math.max(...fees))}` : ""}
                  </span>
                  <Link href="/shipping" className="text-muted-foreground underline">By area · 40–120 min</Link>
                </span>
              </li>
              <li className="flex gap-2">
                <Store className="size-5 shrink-0 text-oxblood" />
                <span><span className="block font-bold">Free pickup</span><span className="text-muted-foreground">Grab it fresh</span></span>
              </li>
              <li className="flex gap-2">
                <Clock className="size-5 shrink-0 text-oxblood" />
                <span><span className="block font-bold">Grilled to order</span><span className="text-muted-foreground">Made when you pay</span></span>
              </li>
            </ul>
            {!inStock ? <p className="text-sm text-muted-foreground">Today&apos;s batch is sold out. New batch tomorrow.</p> : null}
          </div>
        </div>

        <section id="reviews" className="mt-16 border-t border-line pt-12 md:mt-24">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow mb-3">Verified buyers</p>
              <h2 className="text-[36px] leading-none md:text-heading">Reviews</h2>
              {p.rating.count ? (
                <p className="mt-3 flex items-center gap-2"><span className="font-display text-heading-sm">{p.rating.avg.toFixed(1)}</span><Stars value={p.rating.avg} count={p.rating.count} /></p>
              ) : null}
            </div>
            <Suspense fallback={null}>
              <ReviewSlot productId={p.id} />
            </Suspense>
          </div>
          {p.reviews.length ? (
            <ul className="grid gap-4 md:grid-cols-2">
              {p.reviews.map((r) => (
                <li key={r.id} className="rounded-card bg-white p-5">
                  <div className="flex items-center justify-between gap-3">
                    <Stars value={r.rating} />
                    <span className="rounded-full bg-paprika px-2.5 py-1 text-xs font-bold text-oxblood">
                      {r.spiceLevel === "extra_hot" ? "Extra hot" : r.spiceLevel === "hot" ? "Hot" : "Mild"}
                    </span>
                  </div>
                  {r.title ? <p className="mt-3 font-bold">{r.title}</p> : null}
                  <p className="mt-2 text-smoke">{r.body}</p>
                  <p className="mt-3 text-sm text-muted-foreground">{r.authorName} · Verified buyer · {formatDate(r.createdAt)}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">No reviews yet. Order it, love it, tell everyone.</p>
          )}
        </section>

        {related.length ? (
          <section className="mt-16 md:mt-24">
            <h2 className="mb-8 text-[36px] leading-none md:text-heading">You might also crave</h2>
            <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((x) => <ProductCard key={x.id} p={x} />)}
            </div>
          </section>
        ) : null}
      </div>
    </>
  );
}

export default function ProductPage({ params }: PageProps<"/menu/[slug]">) {
  return (
    <Suspense fallback={<div className="container-page min-h-[70vh] py-10"><div className="aspect-square max-w-xl animate-pulse rounded-image bg-sand" /></div>}>
      <Product params={params} />
    </Suspense>
  );
}
