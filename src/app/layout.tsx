import type { Metadata, Viewport } from "next";
import { Fraunces, Inter, Outfit } from "next/font/google";
import { Providers } from "@/components/providers";
import { ConsentAndAnalytics } from "@/components/store/consent";
import { siteConfig } from "@/lib/site";
import "./globals.css";

const display = Outfit({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  display: "swap",
});

const accent = Fraunces({
  variable: "--font-accent",
  subsets: ["latin"],
  weight: ["300"],
  style: ["normal", "italic"],
  display: "swap",
});

const body = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} | ${siteConfig.tagline}`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  openGraph: {
    type: "website",
    siteName: siteConfig.name,
    locale: "en_NG",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#5a1309",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-NG"
      className={`${display.variable} ${accent.variable} ${body.variable} h-full`}
    >
      <body className="flex min-h-full flex-col">
        {children}
        <Providers />
        <ConsentAndAnalytics />
      </body>
    </html>
  );
}
