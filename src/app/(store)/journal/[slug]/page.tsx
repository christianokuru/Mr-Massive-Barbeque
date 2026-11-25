import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { ARTICLES, getArticle } from "@/content/articles";
import { jsonLd } from "@/lib/csv";
import { formatDate } from "@/lib/format";
import { siteConfig } from "@/lib/site";

const MEDIA = (process.env.NEXT_PUBLIC_MEDIA_URL ?? "").replace(/\/$/, "");

export function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: PageProps<"/journal/[slug]">): Promise<Metadata> {
  const a = getArticle((await params).slug);
  if (!a) notFound();
  return {
    title: a.title,
    description: a.description,
    alternates: { canonical: `/journal/${a.slug}` },
    openGraph: { type: "article", title: a.title, description: a.description, publishedTime: a.date, images: [`${MEDIA}/products/${a.image}.webp`] },
  };
}

export default async function ArticlePage({ params }: PageProps<"/journal/[slug]">) {
  const a = getArticle((await params).slug);
  if (!a) notFound();
  const ld = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: a.title,
    description: a.description,
    datePublished: a.date,
    image: [`${MEDIA}/products/${a.image}.webp`],
    author: { "@type": "Organization", name: siteConfig.name },
    publisher: { "@type": "Organization", name: siteConfig.name, logo: { "@type": "ImageObject", url: `${siteConfig.url}/brand/logo.png` } },
    mainEntityOfPage: `${siteConfig.url}/journal/${a.slug}`,
  };
  const more = ARTICLES.filter((x) => x.slug !== a.slug);
  return (
    <article className="container-page max-w-3xl py-10 md:py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ld) }} />
      <Link href="/journal" className="eyebrow">Journal</Link>
      <h1 className="mt-4 text-[42px] leading-[0.92] md:text-[60px]">{a.title}</h1>
      <p className="mt-4 text-muted-foreground">{formatDate(a.date)} · {a.readMins} min read</p>
      <div className="relative mt-8 aspect-[16/10] overflow-hidden rounded-image bg-sand">
        <Image src={`${MEDIA}/products/${a.image}.webp`} alt="" fill priority sizes="(min-width: 768px) 768px, 100vw" className="object-cover" />
      </div>
      <div className="mt-10 flex flex-col gap-5 text-body-lg leading-relaxed">
        {a.body.map((b, i) =>
          b.type === "h2" ? (
            <h2 key={i} className="mt-4 text-heading-sm md:text-heading">{b.text}</h2>
          ) : b.type === "ul" ? (
            <ul key={i} className="flex list-disc flex-col gap-2 pl-6">{b.items.map((it) => <li key={it}>{it}</li>)}</ul>
          ) : b.type === "cta" ? (
            <Link key={i} href={b.href} className="inline-flex w-fit items-center gap-2 font-bold text-oxblood underline">{b.text} <ArrowRight className="size-4" /></Link>
          ) : (
            <p key={i} className="text-smoke">{b.text}</p>
          ),
        )}
      </div>
      <aside className="mt-16 border-t border-line pt-10">
        <h2 className="mb-6 text-heading-sm">Keep reading</h2>
        <ul className="flex flex-col gap-3">
          {more.map((m) => <li key={m.slug}><Link href={`/journal/${m.slug}`} className="font-bold hover:underline">{m.title}</Link></li>)}
        </ul>
      </aside>
    </article>
  );
}
