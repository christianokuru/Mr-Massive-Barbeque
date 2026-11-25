import Image from "next/image";
import Link from "next/link";
import { formatNaira } from "@/lib/money";
import type { ComboCard as Combo } from "@/server/catalogue";
import { QuickAdd } from "./quick-add";

export function ComboCard({ c }: { c: Combo }) {
  const save = c.valueKobo - c.priceKobo;
  return (
    <article className="group relative flex min-w-0 flex-col">
      <Link href={`/combos/${c.slug}`} className="relative block aspect-[4/3] overflow-hidden rounded-image bg-sand">
        {c.imageUrl ? (
          <Image src={c.imageUrl} alt={c.name} fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition duration-500 group-hover:scale-[1.03]" />
        ) : null}
        {save > 0 ? (
          <span className="absolute top-3 left-3 rounded-full bg-bonnet px-3 py-1 text-xs font-bold tracking-wide text-char uppercase">
            Save {formatNaira(save)}
          </span>
        ) : null}
        {!c.available ? (
          <span className="absolute top-3 right-3 rounded-full bg-char px-3 py-1 text-xs font-bold text-cream uppercase">Sold out today</span>
        ) : null}
      </Link>
      <div className="flex items-start justify-between gap-3 pt-4">
        <div className="min-w-0">
          <h3 className="text-subheading font-bold font-sans tracking-[0.01em]">
            <Link href={`/combos/${c.slug}`}>{c.name}</Link>
          </h3>
          <p className="mt-1 line-clamp-2 text-muted-foreground">{c.description}</p>
          <p className="mt-2">
            <span className="font-bold">{formatNaira(c.priceKobo)}</span>{" "}
            {save > 0 ? <span className="text-sm text-muted-foreground line-through">{formatNaira(c.valueKobo)}</span> : null}
          </p>
        </div>
        {c.available ? <QuickAdd comboId={c.id} name={c.name} priceKobo={c.priceKobo} /> : null}
      </div>
    </article>
  );
}
