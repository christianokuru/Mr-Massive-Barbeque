import { Flame, Star } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { formatNaira, percentOff } from "@/lib/money";
import { statusLabel, statusTone, type OrderStatus } from "@/lib/order-status";

/** Small shared presentational pieces (server-safe). */

export function Price({ kobo, compareKobo, from, className }: { kobo: number; compareKobo?: number | null; from?: boolean; className?: string }) {
  const off = percentOff(kobo, compareKobo);
  return (
    <span className={cn("inline-flex items-baseline gap-2", className)}>
      <span className="font-bold">
        {from ? <span className="font-normal text-muted-foreground">From </span> : null}
        {formatNaira(kobo)}
      </span>
      {off > 0 && compareKobo ? (
        <span className="text-sm text-muted-foreground line-through">{formatNaira(compareKobo)}</span>
      ) : null}
    </span>
  );
}

export function Stars({ value, count, className }: { value: number; count?: number; className?: string }) {
  const rounded = Math.round(value);
  return (
    <span className={cn("inline-flex items-center gap-1 text-sm", className)} aria-label={`Rated ${value} out of 5${count ? ` from ${count} reviews` : ""}`}>
      <span className="flex" aria-hidden>
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} className={cn("size-3.5", i <= rounded ? "fill-bonnet text-bonnet" : "text-line")} />
        ))}
      </span>
      {count !== undefined ? <span className="text-muted-foreground">({count})</span> : null}
    </span>
  );
}

const SPICE_LABEL = ["No heat", "Mild", "Hot", "Extra hot"];

export function SpiceMeter({ level, className }: { level: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm", className)} title={SPICE_LABEL[level]}>
      <span className="flex" aria-hidden>
        {[1, 2, 3].map((i) => (
          <Flame key={i} className={cn("size-4", i <= level ? "fill-chili text-chili" : "text-line")} />
        ))}
      </span>
      <span className="text-muted-foreground">{SPICE_LABEL[level]}</span>
    </span>
  );
}

const toneClass = {
  neutral: "bg-sand text-char",
  warn: "bg-bonnet/25 text-char",
  good: "bg-[#dcebd6] text-[#1f4a1a]",
  bad: "bg-[#f6d6d0] text-[#7a1a0c]",
  info: "bg-paprika text-oxblood",
};

export function StatusBadge({ status, method = "delivery", className }: { status: OrderStatus; method?: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap", toneClass[statusTone(status)], className)}>
      {statusLabel(status, method)}
    </span>
  );
}

export function Pill({ children, tone = "neutral", className }: { children: ReactNode; tone?: keyof typeof toneClass; className?: string }) {
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold", toneClass[tone], className)}>{children}</span>;
}

export function EmptyState({ title, body, action, icon }: { title: string; body?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-line px-6 py-14 text-center">
      {icon ? <div className="text-oxblood">{icon}</div> : null}
      <h2 className="font-display text-heading-sm">{title}</h2>
      {body ? <p className="max-w-sm text-muted-foreground">{body}</p> : null}
      {action}
    </div>
  );
}

export function SectionHeading({ eyebrow, title, action, className }: { eyebrow?: string; title: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("mb-6 flex flex-wrap items-end justify-between gap-4 md:mb-8", className)}>
      <div>
        {eyebrow ? <p className="eyebrow mb-3">{eyebrow}</p> : null}
        <h2 className="text-[length:clamp(24px,7vw,34px)] leading-[0.95] md:text-heading-lg">{title}</h2>
      </div>
      {action}
    </div>
  );
}
