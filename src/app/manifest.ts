import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Massive Barbeque",
    short_name: "Massive BBQ",
    description: "Fire-grilled catfish, croaker, chicken and turkey, delivered hot across Lagos.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f7f2e8",
    theme_color: "#5a1309",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Menu", url: "/menu" },
      { name: "Track order", url: "/track" },
      { name: "Admin", url: "/admin" },
    ],
  };
}
