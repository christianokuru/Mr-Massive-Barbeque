/** Client-safe brand + site constants. Secrets never live here. */
export const siteConfig = {
  name: "Massive Barbeque",
  tagline: "Fire-grilled BBQ in Lagos",
  description:
    "Fire-grilled catfish, croaker, chicken and turkey with spicy pepper sauce and sides. Order online for hot delivery across Lagos or quick pickup.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  locale: "en_NG",
  timeZone: "Africa/Lagos",
  currency: "NGN",
  social: {
    instagram: "https://www.instagram.com/massivebarbeque",
    x: "https://twitter.com/massivebarbeque",
    facebook: "https://www.facebook.com/massivebarbeque",
  },
  credit: { label: "Kylva", url: "https://kylva.com" },
} as const;
