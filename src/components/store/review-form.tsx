"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { submitReview } from "@/app/actions/engage";
import { cn } from "@/lib/utils";

export function ReviewForm({ productId, signedIn }: { productId: number; signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [spice, setSpice] = useState<"mild" | "hot" | "extra_hot">("hot");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!signedIn) {
    return (
      <p className="text-muted-foreground">
        <Link href={`/sign-in?next=${encodeURIComponent(`/menu`)}`} className="font-bold text-char underline">Sign in</Link> to review items you&apos;ve ordered.
      </p>
    );
  }
  if (done) return <p className="rounded-2xl bg-paprika p-4 font-bold" role="status">{done}</p>;
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="h-11 rounded-full border-2 border-oxblood px-5 font-bold text-oxblood" data-testid="write-review">
        Write a review
      </button>
    );
  }
  return (
    <form
      className="flex max-w-xl flex-col gap-4 rounded-card bg-white p-5"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const res = await submitReview({ productId, rating, spiceLevel: spice, title, body });
          if (res.ok) {
            setDone(res.message ?? "Thanks!");
            toast.success("Review sent");
          } else setError(res.error);
        });
      }}
    >
      <fieldset>
        <legend className="mb-2 font-bold">Your rating</legend>
        <div className="flex gap-1" role="radiogroup">
          {[1, 2, 3, 4, 5].map((i) => (
            <button key={i} type="button" role="radio" aria-checked={rating === i} aria-label={`${i} star${i > 1 ? "s" : ""}`} onClick={() => setRating(i)} className="inline-flex size-11 items-center justify-center">
              <Star className={cn("size-7", i <= rating ? "fill-bonnet text-bonnet" : "text-line")} />
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 font-bold">How spicy did it feel?</legend>
        <div className="flex flex-wrap gap-2">
          {([["mild", "Mild"], ["hot", "Hot"], ["extra_hot", "Extra hot"]] as const).map(([v, l]) => (
            <button key={v} type="button" aria-pressed={spice === v} onClick={() => setSpice(v)} className={cn("h-11 rounded-full border-2 px-4 font-bold", spice === v ? "border-oxblood bg-paprika" : "border-line")}>
              {l}
            </button>
          ))}
        </div>
      </fieldset>
      <label className="flex flex-col gap-1.5">
        <span className="font-bold">Title (optional)</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} className="h-11 rounded-lg border border-input bg-white px-3" />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="font-bold">Your review</span>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} required minLength={10} maxLength={1500} rows={4} className="rounded-lg border border-input bg-white p-3" />
      </label>
      {error ? <p className="font-bold text-chili" role="alert">{error}</p> : null}
      <button type="submit" disabled={pending} className="h-12 rounded-full bg-bonnet font-bold text-char disabled:opacity-70">
        {pending ? "Sending…" : "Submit review"}
      </button>
    </form>
  );
}
