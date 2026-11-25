import { siteConfig } from "./site";

/** Dates always render in the store timezone (servers run UTC). Client-safe. */
const dateFmt = new Intl.DateTimeFormat("en-NG", {
  timeZone: siteConfig.timeZone,
  day: "numeric",
  month: "short",
  year: "numeric",
});
const dateTimeFmt = new Intl.DateTimeFormat("en-NG", {
  timeZone: siteConfig.timeZone,
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});
const dayKeyFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: siteConfig.timeZone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function formatDate(d: Date | string | null | undefined) {
  return d ? dateFmt.format(new Date(d)) : "";
}

export function formatDateTime(d: Date | string | null | undefined) {
  return d ? dateTimeFmt.format(new Date(d)) : "";
}

/** YYYY-MM-DD in Lagos time. */
export function lagosDayKey(d: Date | string) {
  return dayKeyFmt.format(new Date(d));
}

export function initials(name: string | null | undefined) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "MB";
}

export function pluralize(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}
