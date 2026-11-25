import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MenuView } from "@/components/store/menu-view";
import { getCategories } from "@/server/catalogue";

export async function generateStaticParams() {
  return (await getCategories()).map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps<"/category/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const c = (await getCategories()).find((x) => x.slug === slug);
  if (!c) notFound();
  return {
    title: `${c.name} delivery in Lagos`,
    description: `${c.description} Order ${c.name.toLowerCase()} online from Massive Barbeque for hot delivery across Lagos.`,
    alternates: { canonical: `/category/${c.slug}` },
  };
}

async function Content({ params, searchParams }: PageProps<"/category/[slug]">) {
  const { slug } = await params;
  const c = (await getCategories()).find((x) => x.slug === slug);
  if (!c) notFound();
  return <MenuView eyebrow="Category" title={c.name} intro={c.description} category={c.slug} searchParams={searchParams} />;
}

export default function CategoryPage(props: PageProps<"/category/[slug]">) {
  return (
    <Suspense fallback={<div className="container-page min-h-[60vh] py-16" />}>
      <Content {...props} />
    </Suspense>
  );
}
