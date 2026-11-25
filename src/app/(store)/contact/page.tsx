import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MapPin, MessageCircle, Package } from "lucide-react";
import { siteConfig } from "@/lib/site";
import { getSettings } from "@/server/catalogue";

export const metadata: Metadata = { title: "Contact us", description: "Contact Massive Barbeque in Lagos by WhatsApp or email for orders, parties and feedback.", alternates: { canonical: "/contact" } };

export default async function Contact() {
  const { whatsappNumber } = await getSettings();
  const card = "flex min-w-0 items-center gap-4 rounded-card bg-white p-5 hover:ring-2 hover:ring-oxblood/30";
  return (
    <div className="container-page max-w-3xl py-10 md:py-16">
      <p className="eyebrow mb-3">Contact</p>
      <h1 className="text-[length:clamp(30px,8.5vw,44px)] leading-[0.9] md:text-[64px]">Talk to the grill</h1>
      <p className="mt-4 text-body-lg text-smoke">Questions about an order, a party, or just want to tell us how much you loved the catfish? We&apos;re listening.</p>
      <div className="mt-10 grid gap-4">
        {whatsappNumber ? (
          <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener noreferrer" className={card}>
            <MessageCircle className="size-8 shrink-0 text-[#25D366]" />
            <span className="min-w-0"><span className="block text-subheading font-bold [overflow-wrap:anywhere]">WhatsApp</span><span className="text-muted-foreground">Fastest for orders and parties</span></span>
          </a>
        ) : null}
        <a href={`mailto:${siteConfig.email}`} className={card}>
          <Mail className="size-8 shrink-0 text-oxblood" />
          <span className="min-w-0"><span className="block text-subheading font-bold [overflow-wrap:anywhere]">{siteConfig.email}</span><span className="text-muted-foreground">We reply within a day</span></span>
        </a>
        <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(siteConfig.pickup.full)}`} target="_blank" rel="noopener noreferrer" className={card}>
          <MapPin className="size-8 shrink-0 text-oxblood" />
          <span className="min-w-0"><span className="block text-subheading font-bold [overflow-wrap:anywhere]">Pickup</span><span className="text-muted-foreground">{siteConfig.pickup.full}</span></span>
        </a>
        <Link href="/track" className={card}>
          <Package className="size-8 shrink-0 text-oxblood" />
          <span className="min-w-0"><span className="block text-subheading font-bold [overflow-wrap:anywhere]">Track an order</span><span className="text-muted-foreground">Order number + email</span></span>
        </Link>
      </div>
      <div className="mt-10 flex flex-wrap gap-2">
        {Object.entries(siteConfig.social).map(([k, url]) => (
          <a key={k} href={url} target="_blank" rel="noopener noreferrer" className="rounded-full border border-line bg-white px-4 py-2 font-bold capitalize">{k === "x" ? "X" : k}</a>
        ))}
      </div>
    </div>
  );
}
