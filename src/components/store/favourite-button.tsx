"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { toggleFavourite } from "@/app/actions/engage";
import { cn } from "@/lib/utils";

export function FavouriteButton({ productId, initial, className }: { productId: number; initial: boolean; className?: string }) {
  const [fav, setFav] = useState(initial);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      aria-pressed={fav}
      aria-label={fav ? "Remove from favourites" : "Save to favourites"}
      disabled={pending}
      data-testid="favourite-button"
      onClick={() =>
        start(async () => {
          const res = await toggleFavourite(productId);
          if (res.ok) {
            setFav(!!res.favourite);
            toast.success(res.message);
          } else if (res.signIn) {
            router.push(`/sign-in?next=${encodeURIComponent(window.location.pathname)}`);
          } else toast.error(res.error);
        })
      }
      className={cn("inline-flex size-11 items-center justify-center rounded-full border border-line bg-white transition hover:border-oxblood", className)}
    >
      <Heart className={cn("size-5", fav && "fill-chili text-chili")} />
    </button>
  );
}
