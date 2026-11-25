import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

const MEDIA = (process.env.NEXT_PUBLIC_MEDIA_URL ?? "").replace(/\/$/, "");

/** Split layout: form left, photo right. On phones the photo becomes a short banner with an overlapping form panel. */
export function AuthShell({ title, subtitle, children, photo = "grilled-chicken" }: { title: string; subtitle?: ReactNode; children: ReactNode; photo?: string }) {
  const src = `${MEDIA}/products/${photo}.webp`;
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="relative h-56 lg:order-2 lg:h-auto">
        <Image src={src} alt="Fire-grilled food from Massive Barbeque" fill priority sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
        <div className="absolute inset-0 bg-char/20" />
      </div>
      <div className="relative -mt-8 flex flex-col rounded-t-[28px] bg-cream px-4 pt-6 pb-10 sm:px-8 lg:mt-0 lg:rounded-none lg:px-16 lg:pt-10">
        <Link href="/" className="mb-8 inline-flex w-fit items-center gap-2" aria-label="Massive Barbeque home">
          <Image src="/brand/logo.png" alt="Massive Barbeque" width={467} height={530} className="h-14 w-auto" />
        </Link>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
          <h1 className="text-[44px] leading-[0.9] md:text-[56px]">{title}</h1>
          {subtitle ? <div className="mt-3 text-body-lg text-smoke">{subtitle}</div> : null}
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
