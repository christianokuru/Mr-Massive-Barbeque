import type { NextConfig } from "next";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const isHttps = appUrl.startsWith("https://");
const mediaUrl = process.env.NEXT_PUBLIC_MEDIA_URL;

const mediaOrigin = mediaUrl ? new URL(mediaUrl).origin : "";
const isDev = process.env.NODE_ENV !== "production";

/** CSP: own origin + storage bucket + consent-gated analytics. Paystack is a full-page redirect. */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://www.googletagmanager.com https://www.clarity.ms https://*.clarity.ms https://connect.facebook.net`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${mediaOrigin} https://www.google-analytics.com https://www.googletagmanager.com https://*.clarity.ms https://c.bing.com https://www.facebook.com`,
  "font-src 'self' data:",
  `connect-src 'self' ${mediaOrigin} https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://*.clarity.ms https://c.bing.com https://www.facebook.com https://connect.facebook.net`,
  "frame-src 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isHttps ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  // HSTS only when the site is actually served over https.
  ...(isHttps
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  reactStrictMode: true,
  // Tailwind v4 runs as a Turbopack loader (from create-next-app).
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: mediaUrl ? [new URL(`${mediaUrl}/**`)] : [],
  },
  // Old site URLs keep their search rankings.
  async redirects() {
    const old: Record<string, string> = {
      "36": "grilled-chicken",
      "37": "grilled-catfish",
      "38": "grilled-croaker",
      "39": "grilled-turkey",
      "40": "potatoes-extra",
      "41": "yam-fries",
      "42": "plantain-fries",
      "43": "plantain-bole",
      "44": "catfish-pepper-soup",
    };
    return [
      // One address for everyone: www → bare domain (keeps sign-in cookies on one host).
      { source: "/:path*", has: [{ type: "host" as const, value: "www.massivebarbeque.com" }], destination: "https://massivebarbeque.com/:path*", permanent: true },
      ...Object.entries(old).map(([id, slug]) => ({ source: `/product/${id}`, destination: `/menu/${slug}`, permanent: true })),
      { source: "/product/:id", destination: "/menu", permanent: true },
      { source: "/login", destination: "/sign-in", permanent: true },
    ];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
