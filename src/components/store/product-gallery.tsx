"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** Swipeable (scroll-snap) gallery with dots on mobile and thumbnails on desktop. */
export function ProductGallery({ images, name }: { images: { id: number; url: string; alt: string }[]; name: string }) {
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const go = (i: number) => {
    const el = track.current;
    if (!el) return;
    el.scrollTo({ left: el.clientWidth * i, behavior: "smooth" });
  };
  if (!images.length) return <div className="aspect-square rounded-image bg-sand" />;
  return (
    <div className="flex flex-col gap-3">
      <div
        ref={track}
        onScroll={(e) => {
          const el = e.currentTarget;
          setActive(Math.round(el.scrollLeft / Math.max(el.clientWidth, 1)));
        }}
        className="flex snap-x snap-mandatory overflow-x-auto rounded-image [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label={`${name} photos`}
      >
        {images.map((img, i) => (
          <div key={img.id} className="relative aspect-square w-full shrink-0 snap-center bg-sand">
            <Image src={img.url} alt={img.alt} fill priority={i === 0} sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
          </div>
        ))}
      </div>
      {images.length > 1 ? (
        <>
          <div className="flex justify-center gap-2 md:hidden">
            {images.map((img, i) => (
              <button key={img.id} type="button" onClick={() => go(i)} aria-label={`Photo ${i + 1}`} className={cn("size-2.5 rounded-full", i === active ? "bg-oxblood" : "bg-line")} />
            ))}
          </div>
          <div className="hidden gap-3 md:flex">
            {images.map((img, i) => (
              <button
                key={img.id}
                type="button"
                onClick={() => go(i)}
                aria-label={`Show photo ${i + 1}`}
                className={cn("relative size-20 overflow-hidden rounded-xl border-2", i === active ? "border-oxblood" : "border-transparent")}
              >
                <Image src={img.url} alt="" fill sizes="80px" className="object-cover" />
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
