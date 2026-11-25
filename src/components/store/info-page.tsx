import type { ReactNode } from "react";

/** Shared layout for content pages (about, FAQ, policies). */
export function InfoPage({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro?: string; children: ReactNode }) {
  return (
    <div className="container-page max-w-3xl py-10 md:py-16">
      <p className="eyebrow mb-3">{eyebrow}</p>
      <h1 className="text-[44px] leading-[0.9] md:text-[64px]">{title}</h1>
      {intro ? <p className="mt-4 text-body-lg text-smoke">{intro}</p> : null}
      <div className="prose-mb mt-10 flex flex-col gap-5 text-body-lg leading-relaxed [&_a]:font-bold [&_a]:underline [&_h2]:mt-6 [&_h2]:text-heading-sm [&_li]:ml-6 [&_li]:list-disc [&_p]:text-smoke">{children}</div>
    </div>
  );
}
