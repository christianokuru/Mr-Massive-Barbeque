"use server";

import { z } from "zod";
import { db } from "@/db";
import * as s from "@/db/schema";
import { emailSchema } from "@/lib/validation";
import { getAllProductCards } from "@/server/catalogue";
import { emails } from "@/server/email";
import { enforceRateLimit, RateLimitError } from "@/server/rate-limit";
import { getSession } from "@/server/session";

const answersSchema = z.object({
  crew: z.enum(["solo", "two", "family", "party"]),
  spice: z.enum(["mild", "hot", "extra_hot"]),
  protein: z.enum(["fish", "meat", "both"]),
  budget: z.enum(["low", "mid", "high"]),
});
export type QuizAnswers = z.infer<typeof answersSchema>;

const SPICE = { mild: 1, hot: 2, extra_hot: 3 } as const;
const FISH = new Set(["grilled-fish", "pepper-soup"]);
const BUDGET_MAX = { low: 10000_00, mid: 25000_00, high: Infinity } as const;

export async function submitQuiz(input: { answers: QuizAnswers; email?: string }): Promise<{ ok: true; id: number } | { ok: false; error: string }> {
  try {
    await enforceRateLimit("quiz", 20, 600);
  } catch (err) {
    if (err instanceof RateLimitError) return { ok: false, error: err.message };
  }
  const answers = answersSchema.safeParse(input.answers);
  if (!answers.success) return { ok: false, error: "Answer every question first." };
  let email: string | null = null;
  if (input.email) {
    const e = emailSchema.safeParse(input.email);
    if (!e.success) return { ok: false, error: "Enter a valid email or leave it blank." };
    email = e.data;
  }
  const a = answers.data;
  const cards = (await getAllProductCards()).filter((c) => !c.isSide && c.totalStock > 0);
  const scored = cards
    .map((c) => {
      let score = 0;
      score += 3 - Math.abs(c.spiceLevel - SPICE[a.spice]);
      const isFish = FISH.has(c.categorySlug ?? "");
      if (a.protein === "fish") score += isFish ? 3 : -2;
      if (a.protein === "meat") score += isFish ? -2 : 3;
      if (c.fromKobo <= BUDGET_MAX[a.budget]) score += 2;
      if (c.featured) score += 1;
      if (a.crew === "solo" && c.categorySlug === "pepper-soup") score += 1;
      return { id: c.id, score };
    })
    .sort((x, y) => y.score - x.score)
    .slice(0, 3)
    .map((x) => x.id);

  const session = await getSession();
  const [row] = await db
    .insert(s.quizResult)
    .values({
      userId: session?.user.emailVerified ? session.user.id : null,
      email: email ?? (session?.user.emailVerified ? session.user.email.toLowerCase() : null),
      answers: a,
      productIds: scored,
    })
    .returning({ id: s.quizResult.id });

  if (email) {
    const ins = await db.insert(s.subscriber).values({ email, source: "quiz" }).onConflictDoNothing().returning();
    if (ins.length) await emails.welcome(email, "WELCOME10");
  }
  return { ok: true, id: row.id };
}
