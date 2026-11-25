"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { submitQuiz, type QuizAnswers } from "@/app/actions/quiz";
import { cn } from "@/lib/utils";

const STEPS: { key: keyof QuizAnswers; q: string; options: [string, string, string][] }[] = [
  {
    key: "crew",
    q: "Who are we feeding?",
    options: [
      ["solo", "Just me", "A proper solo plate"],
      ["two", "Two of us", "Date night or a mate"],
      ["family", "The family", "3–5 hungry people"],
      ["party", "A crowd", "Office, party, owambe"],
    ],
  },
  {
    key: "spice",
    q: "How much heat can you handle?",
    options: [
      ["mild", "Keep it mild", "Flavour, not fire"],
      ["hot", "Bring the pepper", "Proper Lagos heat"],
      ["extra_hot", "Set me on fire", "Scotch bonnet, no mercy"],
    ],
  },
  {
    key: "protein",
    q: "Fish or meat?",
    options: [
      ["fish", "Fish all day", "Catfish, croaker, pepper soup"],
      ["meat", "Meat lover", "Chicken and turkey"],
      ["both", "A bit of everything", "Surprise me"],
    ],
  },
  {
    key: "budget",
    q: "What's the budget?",
    options: [
      ["low", "Under ₦10k", "Small chops, big flavour"],
      ["mid", "₦10k – ₦25k", "Something generous"],
      ["high", "₦25k+", "Go all out"],
    ],
  },
];

export function Quiz({ signedIn }: { signedIn: boolean }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<QuizAnswers>>({});
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const total = STEPS.length + (signedIn ? 0 : 1);
  const current = STEPS[step];

  function finish() {
    setError(null);
    start(async () => {
      const res = await submitQuiz({ answers: answers as QuizAnswers, email: email || undefined });
      if (res.ok) router.push(`/quiz/results/${res.id}`);
      else setError(res.error);
    });
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8" data-testid="quiz">
      <div className="flex items-center gap-3">
        {step > 0 ? (
          <button type="button" onClick={() => setStep(step - 1)} aria-label="Back" className="inline-flex size-11 items-center justify-center rounded-full hover:bg-sand">
            <ArrowLeft className="size-5" />
          </button>
        ) : null}
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-sand" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={total} aria-label="Quiz progress">
          <div className="h-full rounded-full bg-oxblood transition-all" style={{ width: `${((step + 1) / total) * 100}%` }} />
        </div>
        <span className="text-sm font-bold">{Math.min(step + 1, total)}/{total}</span>
      </div>

      {current ? (
        <fieldset>
          <legend className="mb-6 font-display text-[36px] leading-none md:text-heading-lg">{current.q}</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {current.options.map(([v, label, sub]) => (
              <button
                key={v}
                type="button"
                onClick={() => {
                  setAnswers((a) => ({ ...a, [current.key]: v }));
                  if (step === STEPS.length - 1 && signedIn) setTimeout(() => setStep(step + 1), 0);
                  else setStep(step + 1);
                }}
                className={cn("flex min-h-20 flex-col items-start justify-center rounded-card border-2 bg-white p-5 text-left transition hover:border-oxblood", answers[current.key] === v ? "border-oxblood bg-paprika" : "border-line")}
                data-testid="quiz-option"
              >
                <span className="text-subheading font-bold">{label}</span>
                <span className="text-muted-foreground">{sub}</span>
              </button>
            ))}
          </div>
        </fieldset>
      ) : signedIn ? (
        <div className="flex flex-col items-start gap-4">
          <p className="font-display text-heading-sm">Ready? We&apos;ve got your plate.</p>
          <button type="button" onClick={finish} disabled={pending} className="inline-flex h-13 items-center gap-2 rounded-full bg-bonnet px-7 font-bold">
            {pending ? <Loader2 className="size-5 animate-spin" /> : null} Show my picks
          </button>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            finish();
          }}
          className="flex flex-col gap-4"
        >
          <p className="font-display text-[36px] leading-none md:text-heading-lg">Want 10% off your picks?</p>
          <p className="text-smoke">Drop your email and we&apos;ll send your welcome code. Or skip it, your picks are ready either way.</p>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your email (optional)" autoComplete="email" className="h-12 rounded-lg border border-input bg-white px-3" data-testid="quiz-email" />
          {error ? <p className="font-bold text-chili" role="alert">{error}</p> : null}
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={pending} className="inline-flex h-13 items-center gap-2 rounded-full bg-bonnet px-7 font-bold" data-testid="quiz-submit">
              {pending ? <Loader2 className="size-5 animate-spin" /> : null} Show my picks
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
