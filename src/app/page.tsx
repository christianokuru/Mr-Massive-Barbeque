import { siteConfig } from "@/lib/site";

/** Phase 0 placeholder. Replaced by the real storefront in Phase 1. */
export default function Home() {
  return (
    <main className="container-page flex flex-1 flex-col justify-center gap-6 py-24">
      <p className="eyebrow">Lagos · Nigeria</p>
      <h1 className="text-[56px] leading-[0.88] md:text-display-lg">
        {siteConfig.name}
        <span className="block font-accent font-light italic text-oxblood">
          fire-grilled, served hot.
        </span>
      </h1>
      <p className="max-w-md text-body-lg text-muted-foreground">
        New storefront in progress.
      </p>
    </main>
  );
}
