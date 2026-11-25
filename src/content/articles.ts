/** Journal articles (static content, rendered at build). Internal links point at real menu pages. */

export type Block = { type: "p"; text: string } | { type: "h2"; text: string } | { type: "ul"; items: string[] } | { type: "cta"; text: string; href: string };

export type Article = {
  slug: string;
  title: string;
  description: string;
  date: string;
  readMins: number;
  image: string; // product photo slug in the media bucket
  body: Block[];
};

export const ARTICLES: Article[] = [
  {
    slug: "catfish-vs-croaker-which-grilled-fish-to-order",
    title: "Catfish vs croaker: which grilled fish should you order?",
    description: "Soft and rich or crisp and flaky? A simple guide to choosing between grilled catfish and croaker in Lagos, plus which size feeds how many.",
    date: "2026-11-10",
    readMins: 4,
    image: "grilled-catfish",
    body: [
      { type: "p", text: "Ask ten Lagosians which grilled fish is best and you'll get ten loud opinions. Both catfish and croaker are proper BBQ royalty, but they eat very differently. Here's how to pick the right one for your mood, your crew and your pepper tolerance." },
      { type: "h2", text: "Catfish: rich, soft and made for pepper" },
      { type: "p", text: "Catfish has a soft, almost buttery flesh and a thicker skin that soaks up marinade. That's why we baste ours in a peppered sauce: the fat in the fish carries the heat and the smoke. If you like your fish saucy and spicy, start here." },
      { type: "ul", items: ["Texture: soft, juicy, few small bones", "Best with: yam fries and plantain", "Heat: our hottest fish, it holds pepper beautifully"] },
      { type: "h2", text: "Croaker: crisp skin, clean flaky flesh" },
      { type: "p", text: "Croaker is leaner with firm white flakes. Grilled whole, the skin crisps up and the flesh stays delicate. It's the one to order if you love picking fish off the bone and tasting the smoke more than the sauce." },
      { type: "ul", items: ["Texture: flaky, firmer, crisp skin", "Best with: chips and coleslaw", "Heat: medium, lets the grill flavour lead"] },
      { type: "h2", text: "Which size should you get?" },
      { type: "p", text: "Our Regular fish is a generous single plate. Standard is great for one very hungry person or two light eaters. Biggie is the sharing fish for two to three people, especially with a couple of sides." },
      { type: "cta", text: "Order grilled catfish", href: "/menu/grilled-catfish" },
      { type: "p", text: "Still can't decide? Order one of each, put them in the middle of the table and let everyone fight it out. That's what the Family Grill combo is for." },
      { type: "cta", text: "See the Family Grill combo", href: "/combos/family-grill" },
    ],
  },
  {
    slug: "how-to-order-bbq-for-a-party-in-lagos",
    title: "How much BBQ to order for a party in Lagos (without running out)",
    description: "A practical guide to ordering grilled fish, chicken and sides for birthdays, office lunches and owambe after-parties, with easy per-person maths.",
    date: "2026-11-14",
    readMins: 5,
    image: "grilled-croaker",
    body: [
      { type: "p", text: "Nothing kills a party faster than an empty tray. Nothing hurts the wallet more than three trays nobody touched. Here's the simple maths we use when people ask us to feed a crowd." },
      { type: "h2", text: "Rule of thumb: one main per 1.5 people" },
      { type: "p", text: "At most Lagos gatherings, people graze. Plan for roughly one main portion (a Regular fish, a chicken Regular, or a share of a family pack) for every one and a half guests, then add sides generously. Sides are cheaper and they're what people go back for." },
      { type: "ul", items: ["10 guests: 2 Biggie fish + 1 chicken Family Pack + 4 sides", "20 guests: 3 Biggie fish + 2 chicken Family Packs + 1 turkey Family Pack + 8 sides", "Office lunch for 8: 8 Regular plates, mix catfish and chicken, plus plantain"] },
      { type: "h2", text: "Mix fish and meat" },
      { type: "p", text: "There's always someone who doesn't eat fish and someone who only eats fish. A 50/50 split between fish and chicken or turkey keeps everyone happy. Pepper soup is a lovely extra for the elders and anyone who wants something warm." },
      { type: "h2", text: "Order early and pick a delivery window" },
      { type: "p", text: "Everything is grilled to order, so big orders need a little lead time. Place your order a few hours ahead, add a note with the time you want it, and we'll plan the grill around you. For very large events, message us on WhatsApp first." },
      { type: "cta", text: "Browse party & office trays", href: "/occasion/party" },
      { type: "p", text: "Tip: the free-delivery threshold applies per order, so one big order is cheaper than several small ones." },
    ],
  },
  {
    slug: "pepper-soup-guide-catfish-pepper-soup",
    title: "Catfish pepper soup: the Lagos cure for everything",
    description: "What makes a great catfish pepper soup, which spices do the work, and when Lagosians reach for a bowl. Plus how to handle the heat.",
    date: "2026-11-20",
    readMins: 3,
    image: "catfish-pepper-soup",
    body: [
      { type: "p", text: "Rainy evening? Long week? Slight cold? Nobody in Lagos needs a reason for pepper soup, but those are the classics. Catfish pepper soup is the richest version: soft fish in a thin, fiery, aromatic broth." },
      { type: "h2", text: "What's in a good pepper soup" },
      { type: "ul", items: ["Fresh catfish, cut into thick steaks so it doesn't fall apart", "Pepper soup spice: a blend of seeds and barks like calabash nutmeg and alligator pepper", "Scent leaf or uziza for that fresh, peppery perfume", "Fresh chilli, adjusted to how brave you're feeling"] },
      { type: "h2", text: "How hot is it?" },
      { type: "p", text: "Ours sits at the top of our spice scale. If you're sensitive to heat, pair it with plantain fries: the sweetness takes the edge off, and it's honestly a great combination anyway." },
      { type: "cta", text: "Order catfish pepper soup", href: "/menu/catfish-pepper-soup" },
      { type: "h2", text: "Pepper soup or grilled fish?" },
      { type: "p", text: "Pepper soup is the comfort pick, grilled catfish is the celebration pick. If you can't choose, we won't judge you for ordering both." },
      { type: "cta", text: "Compare catfish and croaker", href: "/journal/catfish-vs-croaker-which-grilled-fish-to-order" },
    ],
  },
];

export function getArticle(slug: string) {
  return ARTICLES.find((a) => a.slug === slug) ?? null;
}
