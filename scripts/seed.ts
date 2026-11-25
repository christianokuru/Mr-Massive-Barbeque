/**
 * Idempotent catalogue seed: categories, occasions, products (+ photos uploaded to
 * Neon Object Storage), sides, combos, Lagos delivery zones, welcome coupon, settings.
 *
 *   npm run seed
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { eq, inArray } from "drizzle-orm";
import { db } from "../src/db";
import * as s from "../src/db/schema";
import { uploadImage } from "../src/server/storage";

const N = (naira: number) => naira * 100;
const FOOD = path.join(process.cwd(), "images/Food");

type SeedProduct = {
  slug: string;
  name: string;
  category: string;
  short: string;
  description: string;
  image: string;
  alt: string;
  spice: number;
  reorderDays: number;
  featured?: boolean;
  isSide?: boolean;
  occasions: string[];
  variants: { name: string; price: number; stock: number }[];
};

const categories = [
  { slug: "grilled-fish", name: "Grilled Fish", description: "Whole catfish and croaker, basted in peppered marinade and grilled over open flame." },
  { slug: "chicken", name: "Chicken", description: "Flame-grilled chicken with our house pepper sauce." },
  { slug: "turkey", name: "Turkey", description: "Tender grilled turkey with a smoky dry rub." },
  { slug: "pepper-soup", name: "Pepper Soup", description: "Hot, spicy comfort in a bowl." },
  { slug: "sides", name: "Sides", description: "Plantain, yam and potatoes to complete your plate." },
];

const occasions = [
  { slug: "solo", name: "Solo lunch", blurb: "One plate, all yours. Fast, filling, fire-grilled." },
  { slug: "date-night", name: "Date night", blurb: "Couple packs and sides built for two." },
  { slug: "family", name: "Family table", blurb: "Big packs that feed the whole house." },
  { slug: "party", name: "Party & office", blurb: "Biggie fish, family packs and combos for a crowd." },
];

const products: SeedProduct[] = [
  {
    slug: "grilled-catfish",
    name: "Catfish",
    category: "grilled-fish",
    short: "Our signature whole catfish, basted in peppered marinade.",
    description:
      "Whole catfish basted in our peppered marinade and grilled slowly over open flame until the skin chars and the flesh stays soft. Served with coleslaw, chips and our house sauces. Pick a size.",
    image: "catfish.jpeg",
    alt: "Whole grilled catfish in pepper sauce with yam chips and coleslaw in foil",
    spice: 2,
    reorderDays: 7,
    featured: true,
    occasions: ["solo", "date-night", "party"],
    variants: [
      { name: "Regular", price: 8500, stock: 30 },
      { name: "Standard", price: 11000, stock: 25 },
      { name: "Biggie", price: 14000, stock: 15 },
    ],
  },
  {
    slug: "grilled-croaker",
    name: "Croaker",
    category: "grilled-fish",
    short: "Whole croaker, crispy skin and tender flesh.",
    description:
      "Whole croaker seasoned and grilled for a crisp, smoky skin and tender white flesh. Served with chips and coleslaw. Pick a size.",
    image: "croaker.jpeg",
    alt: "Whole grilled croaker fish with chips and coleslaw",
    spice: 2,
    reorderDays: 7,
    featured: true,
    occasions: ["solo", "date-night", "party"],
    variants: [
      { name: "Regular", price: 9000, stock: 30 },
      { name: "Standard", price: 12000, stock: 20 },
      { name: "Biggie", price: 15000, stock: 12 },
    ],
  },
  {
    slug: "grilled-chicken",
    name: "Chicken",
    category: "chicken",
    short: "Juicy flame-grilled chicken with house pepper sauce.",
    description:
      "Juicy chicken marinated overnight, flame-grilled and finished with our house pepper sauce. Pick regular, couple pack or family pack.",
    image: "chicken.jpeg",
    alt: "Flame-grilled whole chicken platter with chips, coleslaw and pepper sauces",
    spice: 2,
    reorderDays: 7,
    featured: true,
    occasions: ["solo", "date-night", "family", "party"],
    variants: [
      { name: "Regular", price: 7000, stock: 40 },
      { name: "Couple Pack", price: 13000, stock: 20 },
      { name: "Family Pack", price: 25000, stock: 10 },
    ],
  },
  {
    slug: "grilled-turkey",
    name: "Turkey",
    category: "turkey",
    short: "Tender grilled turkey with our house dry rub.",
    description:
      "Turkey rubbed with our smoky house spice blend and grilled until tender with crisp edges. Pick regular, couple pack or family pack.",
    image: "turkey.jpg",
    alt: "Roasted turkey with a golden, crisp spiced skin",
    spice: 1,
    reorderDays: 10,
    occasions: ["date-night", "family", "party"],
    variants: [
      { name: "Regular", price: 10000, stock: 25 },
      { name: "Couple Pack", price: 18000, stock: 12 },
      { name: "Family Pack", price: 35000, stock: 6 },
    ],
  },
  {
    slug: "catfish-pepper-soup",
    name: "Catfish Pepper Soup",
    category: "pepper-soup",
    short: "Catfish pepper soup: hot, spicy comfort in a bowl.",
    description:
      "Fresh catfish simmered in a peppery, aromatic broth with uziza and scent leaf. Hot, spicy comfort in a bowl.",
    image: "catfish-peppersoup.jpg",
    alt: "Bowl of catfish pepper soup with fresh herbs and chilli",
    spice: 3,
    reorderDays: 7,
    featured: true,
    occasions: ["solo", "family"],
    variants: [{ name: "Regular", price: 9000, stock: 20 }],
  },
  {
    slug: "plantain-bole",
    name: "Plantain Bole",
    category: "sides",
    short: "Fire-roasted plantain bole, smoky and sweet.",
    description: "Ripe plantain roasted over charcoal until smoky and sweet, served with pepper sauce.",
    image: "plantain-boli.jpg",
    alt: "Fire-roasted plantain bole with a bowl of red pepper sauce",
    spice: 1,
    reorderDays: 7,
    isSide: true,
    occasions: ["solo", "family", "party"],
    variants: [{ name: "Regular", price: 2000, stock: 60 }],
  },
  {
    slug: "plantain-fries",
    name: "Plantain Fries",
    category: "sides",
    short: "Golden plantain fries: sweet, crisp edges, soft centre.",
    description: "Ripe plantain fried golden, with crisp caramelised edges and a soft centre.",
    image: "fried-plantain.jpg",
    alt: "Golden fried plantain cubes in a white bowl",
    spice: 0,
    reorderDays: 7,
    isSide: true,
    occasions: ["solo", "date-night", "family", "party"],
    variants: [{ name: "Regular", price: 2500, stock: 60 }],
  },
  {
    slug: "yam-fries",
    name: "Yam Fries",
    category: "sides",
    short: "Crispy yam fries, salted and served hot.",
    description: "Thick-cut yam fries, crisp outside and fluffy inside, lightly salted.",
    image: "fried-yam.jpg",
    alt: "Thick-cut yam fries piled up",
    spice: 0,
    reorderDays: 7,
    isSide: true,
    occasions: ["solo", "family", "party"],
    variants: [{ name: "Regular", price: 3000, stock: 60 }],
  },
  {
    slug: "potatoes-extra",
    name: "Potatoes Extra",
    category: "sides",
    short: "Extra serving of golden potatoes, made for sharing.",
    description: "An extra serving of seasoned golden potato fries, made for sharing.",
    image: "fried-potatoes.jpg",
    alt: "Seasoned golden potato fries",
    spice: 0,
    reorderDays: 7,
    isSide: true,
    occasions: ["date-night", "family", "party"],
    variants: [{ name: "Regular", price: 2000, stock: 60 }],
  },
];

const combos = [
  {
    slug: "catfish-feast",
    name: "Catfish Feast",
    description: "Standard catfish, yam fries and plantain fries. Our best seller, made a meal.",
    image: "catfish",
    price: 15000,
    items: [
      ["grilled-catfish", "Standard", 1],
      ["yam-fries", "Regular", 1],
      ["plantain-fries", "Regular", 1],
    ] as const,
  },
  {
    slug: "date-night-duo",
    name: "Date Night Duo",
    description: "Chicken couple pack, plantain bole and potatoes for two.",
    image: "chicken",
    price: 15500,
    items: [
      ["grilled-chicken", "Couple Pack", 1],
      ["plantain-bole", "Regular", 1],
      ["potatoes-extra", "Regular", 1],
    ] as const,
  },
  {
    slug: "family-grill",
    name: "Family Grill",
    description: "Family pack chicken, Biggie croaker and two sides. Feeds 5–6.",
    image: "croaker",
    price: 44000,
    items: [
      ["grilled-chicken", "Family Pack", 1],
      ["grilled-croaker", "Biggie", 1],
      ["yam-fries", "Regular", 1],
      ["plantain-fries", "Regular", 1],
    ] as const,
  },
];

const zones = [
  { name: "Lekki – Ajah", areas: "Lekki Phase 1, Ikate, Chevron, Osapa, Agungi, Ajah, Sangotedo", fee: 2000, freeOver: 40000, eta: "45–75 min" },
  { name: "Victoria Island & Ikoyi", areas: "Victoria Island, Ikoyi, Oniru, Obalende", fee: 2000, freeOver: 40000, eta: "40–70 min" },
  { name: "Mainland", areas: "Yaba, Surulere, Ebute Metta, Akoka, Gbagada", fee: 2500, freeOver: 50000, eta: "60–90 min" },
  { name: "Ikeja & Maryland", areas: "Ikeja, GRA, Allen, Maryland, Ojota, Ogba", fee: 3000, freeOver: 50000, eta: "60–100 min" },
  { name: "Festac & Amuwo", areas: "Festac, Amuwo Odofin, Satellite Town", fee: 3500, freeOver: 60000, eta: "75–120 min" },
];

async function upload(file: string, folder: "products" | "site" | "combos", name: string) {
  const buf = await readFile(path.join(FOOD, file));
  return uploadImage(buf, folder, name);
}

async function main() {
  console.log("Seeding…");

  // Categories / occasions
  for (const [i, c] of categories.entries()) {
    await db.insert(s.category).values({ ...c, sort: i }).onConflictDoNothing({ target: s.category.slug });
  }
  for (const [i, o] of occasions.entries()) {
    await db.insert(s.occasion).values({ ...o, sort: i }).onConflictDoNothing({ target: s.occasion.slug });
  }
  const cats = Object.fromEntries((await db.select().from(s.category)).map((c) => [c.slug, c.id]));
  const occs = Object.fromEntries((await db.select().from(s.occasion)).map((o) => [o.slug, o.id]));

  // Products
  const imageUrls: Record<string, string> = {};
  for (const p of products) {
    const [existing] = await db.select().from(s.product).where(eq(s.product.slug, p.slug));
    if (existing) {
      const [img] = await db.select().from(s.productImage).where(eq(s.productImage.productId, existing.id)).limit(1);
      if (img) imageUrls[p.slug] = img.url;
      console.log(`  = ${p.name} (exists)`);
      continue;
    }
    const url = await upload(p.image, "products", p.slug);
    imageUrls[p.slug] = url;
    await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(s.product)
        .values({
          slug: p.slug,
          name: p.name,
          shortDescription: p.short,
          description: p.description,
          categoryId: cats[p.category],
          status: "active",
          featured: !!p.featured,
          spiceLevel: p.spice,
          reorderDays: p.reorderDays,
          isSide: !!p.isSide,
        })
        .returning();
      await tx.insert(s.productVariant).values(
        p.variants.map((v, i) => ({
          productId: row.id,
          name: v.name,
          sku: `MB-${p.slug.toUpperCase().replace(/-/g, "")}-${v.name.toUpperCase().replace(/\s+/g, "")}`.slice(0, 48),
          priceKobo: N(v.price),
          stock: v.stock,
          sort: i,
        })),
      );
      await tx.insert(s.productImage).values({ productId: row.id, url, alt: p.alt, sort: 0 });
      await tx
        .insert(s.productOccasion)
        .values(p.occasions.map((o) => ({ productId: row.id, occasionId: occs[o] })));
    });
    console.log(`  + ${p.name}`);
  }

  // Occasion images = first featured product of that occasion
  const occImg: Record<string, string> = {
    solo: imageUrls["catfish-pepper-soup"],
    "date-night": imageUrls["grilled-chicken"],
    family: imageUrls["grilled-turkey"],
    party: imageUrls["grilled-croaker"],
  };
  for (const [slug, url] of Object.entries(occImg)) {
    if (url) await db.update(s.occasion).set({ imageUrl: url }).where(eq(s.occasion.slug, slug));
  }

  // Sides for every main
  const all = await db.select().from(s.product);
  const sides = all.filter((p) => p.isSide);
  const mains = all.filter((p) => !p.isSide);
  for (const m of mains) {
    await db
      .insert(s.productSide)
      .values(sides.map((sd) => ({ productId: m.id, sideProductId: sd.id })))
      .onConflictDoNothing();
  }

  // Combos
  const variants = await db
    .select({ id: s.productVariant.id, name: s.productVariant.name, slug: s.product.slug })
    .from(s.productVariant)
    .innerJoin(s.product, eq(s.product.id, s.productVariant.productId));
  for (const [i, c] of combos.entries()) {
    const [existing] = await db.select().from(s.combo).where(eq(s.combo.slug, c.slug));
    if (existing) continue;
    const [row] = await db
      .insert(s.combo)
      .values({
        slug: c.slug,
        name: c.name,
        description: c.description,
        imageUrl: imageUrls[`grilled-${c.image}`],
        priceKobo: N(c.price),
        sort: i,
      })
      .returning();
    await db.insert(s.comboItem).values(
      c.items.map(([slug, size, qty]) => {
        const v = variants.find((x) => x.slug === slug && x.name === size);
        if (!v) throw new Error(`Missing variant ${slug}/${size}`);
        return { comboId: row.id, variantId: v.id, qty };
      }),
    );
    console.log(`  + combo ${c.name}`);
  }

  // Delivery zones
  const zoneCount = await db.$count(s.shippingZone);
  if (zoneCount === 0) {
    await db.insert(s.shippingZone).values(
      zones.map((z, i) => ({
        name: z.name,
        areas: z.areas,
        feeKobo: N(z.fee),
        freeOverKobo: N(z.freeOver),
        etaText: z.eta,
        sort: i,
      })),
    );
    console.log("  + delivery zones");
  }

  // Welcome coupon
  await db
    .insert(s.coupon)
    .values({ code: "WELCOME10", kind: "percent", value: 10, source: "welcome", minSubtotalKobo: N(5000) })
    .onConflictDoNothing({ target: s.coupon.code });

  // Settings
  await db
    .insert(s.storeSettings)
    .values({
      id: 1,
      bannerDesktop: "Free delivery on orders over ₦40,000 across Lekki, VI & Ikoyi · Grilled to order, every order",
      bannerMobile: "Free delivery over ₦40,000 · Grilled to order",
    })
    .onConflictDoNothing();

  // Site hero (stable key so the homepage can reference it)
  await uploadImage(await readFile(path.join(process.cwd(), "images/Hero/hero-grilled-fish.jpg")), "site", "hero-grilled-fish");
  console.log("  + site hero");

  const count = await db.$count(s.product, inArray(s.product.status, ["active"]));
  console.log(`Done. ${count} active products.`);
  await db.$client.end();
}

main().catch(async (err) => {
  console.error(err);
  await db.$client.end();
  process.exit(1);
});
