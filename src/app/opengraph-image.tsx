import { ImageResponse } from "next/og";

export const alt = "Massive Barbeque: fire-grilled BBQ delivered across Lagos";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage() {
  const hero = `${(process.env.NEXT_PUBLIC_MEDIA_URL ?? "").replace(/\/$/, "")}/site/hero-grilled-fish.webp`;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#5a1309" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: 64, width: 640, color: "#f7f2e8" }}>
          <div style={{ fontSize: 22, letterSpacing: 4, color: "#ffb627", fontWeight: 700 }}>LAGOS · NIGERIA</div>
          <div style={{ fontSize: 80, lineHeight: 0.95, marginTop: 20 }}>Massive Barbeque</div>
          <div style={{ fontSize: 34, marginTop: 24, opacity: 0.85 }}>Grilled to perfection. Served with love.</div>
          <div style={{ display: "flex", marginTop: 40, background: "#ffb627", color: "#1b1411", borderRadius: 999, padding: "16px 30px", fontSize: 26, fontWeight: 700, alignSelf: "flex-start" }}>Order online →</div>
        </div>
        <img src={hero} alt="" width={560} height={630} style={{ objectFit: "cover", width: 560, height: 630 }} />
      </div>
    ),
    size,
  );
}
