import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { ComboCard } from "@/components/store/combo-card";
import { ProductGrid } from "@/components/store/product-card";
import { getAllProductCards, getCombos } from "@/server/catalogue";

export const metadata: Metadata = { title: "Your picks", robots: { index: false } };

const COMBO_FOR: Record<string, string> = { two: "date-night-duo", family: "family-grill", party: "family-grill", solo: "catfish-feast" };

async function Results({ params }: { params: PageProps<"/quiz/results/[id]">["params"] }) {
  const { id } = await params;
  await connection();
  if (!/^\d+$/.test(id)) notFound();
  const [r] = await db.select().from(s.quizResult).where(eq(s.quizResult.id, Number(id)));
  if (!r) notFound();
  const [cards, combos] = await Promise.all([getAllProductCards(), getCombos()]);
  const picks = r.productIds.map((pid) => cards.find((c) => c.id === pid)).filter((c): c is NonNullable<typeof c> => !!c);
  const answers = r.answers as { crew?: string };
  const combo = combos.find((c) => c.slug === COMBO_FOR[answers.crew ?? ""] && c.available);
  return (
    <>
      {picks.length ? <ProductGrid products={picks} priorityCount={3} /> : <p>Everything&apos;s sold out today. Check back tomorrow!</p>}
      {combo ? (
        <section className="mt-16">
          <h2 className="mb-6 text-heading">Or make it a combo</h2>
          <div className="max-w-md"><ComboCard c={combo} /></div>
        </section>
      ) : null}
    </>
  );
}

export default function QuizResults({ params }: PageProps<"/quiz/results/[id]">) {
  return (
    <div className="container-page py-10 md:py-16">
      <p className="eyebrow mb-3">Your picks</p>
      <h1 className="mb-3 text-[length:clamp(32px,9vw,48px)] leading-[0.88] md:text-display">Here&apos;s your plate</h1>
      <p className="mb-10 text-body-lg text-smoke">Picked for your crew, your heat level and your budget. Use WELCOME10 on your first order. <Link href="/quiz" className="underline">Retake the quiz</Link></p>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-card bg-sand" />}>
        <Results params={params} />
      </Suspense>
    </div>
  );
}
