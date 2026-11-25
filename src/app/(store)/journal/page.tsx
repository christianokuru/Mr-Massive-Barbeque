import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ARTICLES } from "@/content/articles";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "Journal: BBQ guides from Lagos",
  description: "Guides to grilled fish, pepper soup and ordering BBQ for parties in Lagos, from the Massive Barbeque kitchen.",
  alternates: { canonical: "/journal" },
};

const MEDIA = (process.env.NEXT_PUBLIC_MEDIA_URL ?? "").replace(/\/$/, "");

export default function Journal() {
  return (
    <div className="container-page py-10 md:py-16">
      <p className="eyebrow mb-3">Journal</p>
      <h1 className="mb-10 text-[48px] leading-[0.88] md:text-display">Notes from the grill</h1>
      <div className="grid gap-x-6 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
        {ARTICLES.map((a, i) => (
          <article key={a.slug} className="group flex flex-col gap-3">
            <Link href={`/journal/${a.slug}`} className="relative block aspect-[4/3] overflow-hidden rounded-image bg-sand">
              <Image src={`${MEDIA}/products/${a.image}.webp`} alt="" fill priority={i === 0} sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw" className="object-cover transition duration-500 group-hover:scale-[1.03]" />
            </Link>
            <p className="text-sm text-muted-foreground">{formatDate(a.date)} · {a.readMins} min read</p>
            <h2 className="font-sans text-subheading font-bold"><Link href={`/journal/${a.slug}`} className="hover:underline">{a.title}</Link></h2>
            <p className="text-muted-foreground">{a.description}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
