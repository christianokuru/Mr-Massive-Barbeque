import "server-only";
import { randomUUID } from "node:crypto";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import sharp, { type Metadata } from "sharp";

const MAX_BYTES = 4 * 1024 * 1024;
const MIN_PX = 400;
const MAX_PX = 1800;
const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp", "avif", "heif"]);

let client: S3Client | null = null;

function s3() {
  if (client) return client;
  const { NEON_STORAGE_ENDPOINT, NEON_STORAGE_REGION, NEON_STORAGE_ACCESS_KEY_ID, NEON_STORAGE_SECRET_ACCESS_KEY } =
    process.env;
  if (!NEON_STORAGE_ENDPOINT || !NEON_STORAGE_ACCESS_KEY_ID || !NEON_STORAGE_SECRET_ACCESS_KEY) {
    throw new Error("Image storage is not configured (NEON_STORAGE_* env vars).");
  }
  client = new S3Client({
    region: NEON_STORAGE_REGION ?? "eu-central-1",
    endpoint: NEON_STORAGE_ENDPOINT,
    forcePathStyle: true,
    requestChecksumCalculation: "WHEN_REQUIRED",
    credentials: {
      accessKeyId: NEON_STORAGE_ACCESS_KEY_ID,
      secretAccessKey: NEON_STORAGE_SECRET_ACCESS_KEY,
    },
  });
  return client;
}

function bucket() {
  return process.env.NEON_STORAGE_BUCKET ?? "media";
}

export function mediaBase() {
  return (process.env.NEXT_PUBLIC_MEDIA_URL ?? "").replace(/\/+$/, "");
}

/** Stored image URLs must point at our own bucket. */
export function isOurMediaUrl(url: string) {
  const base = mediaBase();
  if (!base) return false;
  try {
    const u = new URL(url);
    return url.startsWith(`${base}/`) && !u.pathname.includes("..");
  } catch {
    return false;
  }
}

export class ImageValidationError extends Error {}

/**
 * Validate a real image, strip metadata (EXIF/GPS), resize, convert to WebP and upload.
 * Returns the public URL.
 */
export async function uploadImage(
  input: Buffer,
  folder: "products" | "site" | "combos" = "products",
  /** Fixed key name (seed/site assets only). Defaults to a random UUID. */
  name?: string,
) {
  if (input.byteLength > MAX_BYTES) throw new ImageValidationError("Image must be 4 MB or smaller.");
  let meta: Metadata;
  try {
    meta = await sharp(input, { failOn: "error" }).metadata();
  } catch {
    throw new ImageValidationError("That file is not a valid image.");
  }
  if (!meta.format || !ALLOWED_FORMATS.has(meta.format)) {
    throw new ImageValidationError("Use a JPG, PNG, WebP or AVIF image.");
  }
  if (!meta.width || !meta.height || Math.min(meta.width, meta.height) < MIN_PX) {
    throw new ImageValidationError(`Image must be at least ${MIN_PX}px on each side.`);
  }
  const body = await sharp(input)
    .rotate() // apply EXIF orientation before stripping
    .resize({ width: MAX_PX, height: MAX_PX, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer(); // sharp drops EXIF/GPS unless withMetadata() is used

  const key = `${folder}/${name ? name.replace(/[^a-z0-9-]/gi, "") : randomUUID()}.webp`;
  await s3().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: body,
      ContentType: "image/webp",
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
  return `${mediaBase()}/${key}`;
}

export async function deleteImage(url: string) {
  if (!isOurMediaUrl(url)) return;
  const key = url.slice(mediaBase().length + 1);
  await s3().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
}
