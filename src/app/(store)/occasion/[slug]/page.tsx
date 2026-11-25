import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MenuView } from "@/components/store/menu-view";
import { getOccasions } from "@/server/catalogue";

export async function generateStaticParams() {
  return (await getOccasions()).map((o) => ({ slug: o.slug }));
}

export async function generateMetadata({ params }: PageProps<"/occasion/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const o = (await getOccasions()).find((x) => x.slug === slug);
  if (!o) notFound();
  return {
    title: `BBQ for ${o.name.toLowerCase()} in Lagos`,
    description: `${o.blurb} Grilled fish, chicken and turkey from Massive Barbeque, delivered hot across Lagos.`,
    alternates: { canonical: `/occasion/${o.slug}` },
  };
}

async function Content({ params, searchParams }: PageProps<"/occasion/[slug]">) {
  const { slug } = await params;
  const o = (await getOccasions()).find((x) => x.slug === slug);
  if (!o) notFound();
  return <MenuView eyebrow="Shop by occasion" title={o.name} intro={o.blurb} occasion={o.slug} searchParams={searchParams} />;
}

export default function OccasionPage(props: PageProps<"/occasion/[slug]">) {
  return (
    <Suspense fallback={<div className="container-page min-h-[60vh] py-16" />}>
      <Content {...props} />
    </Suspense>
  );
}
