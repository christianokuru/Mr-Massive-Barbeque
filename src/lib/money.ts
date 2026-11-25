/** Money is stored as integer kobo (1 NGN = 100 kobo). Client-safe. */

const ngn = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

/** ₦12,500 (rounded to whole naira for display). */
export function formatNaira(kobo: number): string {
  return ngn.format(Math.round(kobo / 100));
}

export function nairaToKobo(naira: number): number {
  return Math.round(naira * 100);
}

export function koboToNaira(kobo: number): number {
  return Math.round(kobo / 100);
}

/** Percent saved, rounded down, for "Save 15%" badges. */
export function percentOff(priceKobo: number, compareKobo: number | null | undefined) {
  if (!compareKobo || compareKobo <= priceKobo) return 0;
  return Math.floor(((compareKobo - priceKobo) / compareKobo) * 100);
}
