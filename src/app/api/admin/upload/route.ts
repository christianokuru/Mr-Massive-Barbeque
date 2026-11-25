import { revalidateTag } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { rateLimit } from "@/server/rate-limit";
import { adminOrNull } from "@/server/session";
import { ImageValidationError, uploadImage } from "@/server/storage";

/** Admin image upload: real-image validation, EXIF stripped, WebP, random key. */
export async function POST(req: Request) {
  const session = await adminOrNull();
  if (!session) return new Response("Not found", { status: 404 });
  if (!(await rateLimit(`upload:${session.user.id}`, 60, 600))) return Response.json({ error: "Too many uploads. Wait a few minutes." }, { status: 429 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: "Upload a file." }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Upload a file." }, { status: 400 });
  if (file.size > 4 * 1024 * 1024) return Response.json({ error: "Image must be 4 MB or smaller." }, { status: 400 });
  const productId = Number(form.get("productId") ?? 0) || null;
  const folder = form.get("folder") === "combos" ? "combos" : form.get("folder") === "site" ? "site" : "products";

  try {
    const url = await uploadImage(Buffer.from(await file.arrayBuffer()), folder);
    let imageId: number | null = null;
    if (productId) {
      const [p] = await db.select({ id: s.product.id, name: s.product.name }).from(s.product).where(eq(s.product.id, productId));
      if (!p) return Response.json({ error: "Product not found." }, { status: 404 });
      const [{ next }] = await db
        .select({ next: sql<number>`coalesce(max(${s.productImage.sort}) + 1, 0)`.mapWith(Number) })
        .from(s.productImage)
        .where(eq(s.productImage.productId, productId));
      const [img] = await db.insert(s.productImage).values({ productId, url, alt: p.name, sort: next }).returning({ id: s.productImage.id });
      imageId = img.id;
      revalidateTag("catalogue", "max");
    }
    return Response.json({ url, imageId });
  } catch (err) {
    if (err instanceof ImageValidationError) return Response.json({ error: err.message }, { status: 400 });
    console.warn("[upload]", err);
    return Response.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}
