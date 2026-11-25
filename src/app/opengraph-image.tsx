import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "Massive Barbeque: hot, smoky, fire-grilled chicken, turkey and fish delivered across Lagos";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Local files (JPG/PNG/TTF): the image renderer can't read WebP, and nothing here depends on the network.
const dataUri = (buf: Buffer, type: string) => `data:${type};base64,${buf.toString("base64")}`;

const C = { ember: "#a3200c", deep: "#5e1006", gold: "#ffb627", cream: "#fff6e8" };

/** Link preview for WhatsApp, Instagram, X, Facebook etc. (1200×630). */
export default async function OgImage() {
  const [chicken, turkey, logo, regular, bold] = await Promise.all([
    readFile(join(process.cwd(), "src/app/og-assets/chicken-platter.jpg")),
    readFile(join(process.cwd(), "src/app/og-assets/turkey.jpg")),
    readFile(join(process.cwd(), "src/app/og-assets/logo-light.png")),
    readFile(join(process.cwd(), "src/app/og-assets/outfit-500.ttf")),
    readFile(join(process.cwd(), "src/app/og-assets/outfit-800.ttf")),
  ]);

  const image = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          fontFamily: "Outfit",
          backgroundColor: C.deep,
          backgroundImage: `linear-gradient(90deg, #851708 0%, ${C.ember} 40%, ${C.ember} 100%)`,
        }}
      >
        {/* Real platter photo on the right, blended into the warm background */}
        <img src={dataUri(chicken, "image/jpeg")} alt="" width={700} height={630} style={{ position: "absolute", right: 0, top: 0, width: 700, height: 630, objectFit: "cover" }} />
        <div style={{ position: "absolute", right: 380, top: 0, width: 320, height: 630, display: "flex", backgroundImage: `linear-gradient(90deg, ${C.ember} 0%, rgba(163,32,12,0.8) 30%, rgba(163,32,12,0) 100%)` }} />

        {/* Warm glow behind the headline, laid over the photo edge so there's no visible seam */}
        <div style={{ position: "absolute", left: 0, top: 0, width: 1200, height: 630, display: "flex", backgroundImage: "radial-gradient(circle 520px at 26% 45%, rgba(236,98,34,0.85) 0%, rgba(236,98,34,0.35) 55%, rgba(236,98,34,0) 100%)" }} />

        {/* Turkey inset */}
        <div style={{ position: "absolute", right: 36, bottom: 36, display: "flex", flexDirection: "column", alignItems: "center", padding: 8, background: C.cream, borderRadius: 26, boxShadow: "0 18px 40px rgba(0,0,0,0.35)" }}>
          <img src={dataUri(turkey, "image/jpeg")} alt="" width={240} height={184} style={{ width: 240, height: 184, borderRadius: 20, objectFit: "cover" }} />
          <div style={{ display: "flex", marginTop: 6, marginBottom: 2, fontSize: 22, fontWeight: 800, color: C.deep }}>Grilled Turkey</div>
        </div>

        {/* Copy */}
        <div style={{ position: "relative", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 0 0 64px", width: 640, height: "100%", color: C.cream }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <img src={dataUri(logo, "image/png")} alt="" width={74} height={84} style={{ width: 74, height: 84 }} />
            <div style={{ display: "flex", marginLeft: 18, fontSize: 22, fontWeight: 800, letterSpacing: 4, color: C.gold }}>FIRE-GRILLED · LAGOS</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", marginTop: 26, fontSize: 78, fontWeight: 800, lineHeight: 0.98, letterSpacing: -1.5 }}>
            <span>Hot, smoky &amp;</span>
            <span style={{ color: C.gold }}>grilled to order.</span>
          </div>
          <div style={{ display: "flex", marginTop: 22, fontSize: 30, fontWeight: 500, opacity: 0.95 }}>Chicken · Turkey · Catfish · Croaker</div>
          <div style={{ display: "flex", alignItems: "center", marginTop: 36 }}>
            <div style={{ display: "flex", background: C.gold, color: "#1b1411", borderRadius: 999, padding: "16px 34px", fontSize: 28, fontWeight: 800, boxShadow: "0 10px 28px rgba(0,0,0,0.3)" }}>Order now →</div>
            <div style={{ display: "flex", marginLeft: 22, fontSize: 22, fontWeight: 500, opacity: 0.9 }}>Delivered hot across Lagos</div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Outfit", data: regular, weight: 500, style: "normal" },
        { name: "Outfit", data: bold, weight: 800, style: "normal" },
      ],
    },
  );
  // The image only changes when this file changes (the link carries a content hash), so let
  // browsers, WhatsApp and the CDN keep it instead of redrawing it for every share.
  return new Response(image.body, {
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400, s-maxage=31536000, stale-while-revalidate=86400" },
  });
}
