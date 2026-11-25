import type { Metadata } from "next";
import { Suspense } from "react";
import { Quiz } from "@/components/store/quiz";
import { getSession } from "@/server/session";

export const metadata: Metadata = {
  title: "Find your plate: BBQ quiz",
  description: "Not sure what to order? Answer 4 quick questions about your crew, spice level and budget and we'll pick your perfect grilled plate.",
  alternates: { canonical: "/quiz" },
};

async function QuizSlot() {
  const session = await getSession();
  return <Quiz signedIn={!!session?.user.emailVerified} />;
}

export default function QuizPage() {
  return (
    <div className="container-page py-10 md:py-16">
      <p className="eyebrow mb-3 text-center">60-second quiz</p>
      <h1 className="mb-10 text-center text-[48px] leading-[0.88] md:text-display">Find your plate</h1>
      <Suspense fallback={<div className="mx-auto h-96 max-w-2xl animate-pulse rounded-card bg-sand" />}>
        <QuizSlot />
      </Suspense>
    </div>
  );
}
