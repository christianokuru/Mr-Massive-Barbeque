import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MessageCircle, Package } from "lucide-react";
import { siteConfig } from "@/lib/site";
import { getSettings } from "@/server/catalogue";

export const metadata: Metadata = { title: "Contact us", description: "Contact Massive Barbeque in Lagos by WhatsApp or email for orders, parties and feedback.", alternates: { canonical: "/contact" } };

export default async function Contact() {
  const { whatsappNumber } = await getSettings();
  const card = "flex items-center gap-4 rounded-card bg-white p-5 hover:ring-2 hover:ring-oxblood/30";
  return (
    <div className="container-page max-w-3xl py-10 md:py-16">
      <p className="eyebrow mb-3">Contact</p>
      <h1 className="text-[44px] leading-[0.9] md:text-[64px]">Talk to the grill</h1>
      <p className="mt-4 text-body-lg text-smoke">Questions about an order, a party, or just want to tell us how much you loved the catfish? We&apos;re listening.</p>
      <div className="mt-10 grid gap-4">
        {whatsappNumber ? (
          <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener noreferrer" className={card}>
            <MessageCircle className="size-8 text-[#25D366]" />
            <span><span className="block text-subheading font-bold">WhatsApp</span><span className="text-muted-foreground">Fastest for orders and parties</span></span>
          </a>
        ) : null}
        <a href="mailto:info@massivebarbeque.com" className={card}>
          <Mail className="size-8 text-oxblood" />
          <span><span className="block text-subheading font-bold">info@massivebarbeque.com</span><span className="text-muted-foreground">We reply within a day</span></span>
        </a>
        <Link href="/track" className={card}>
          <Package className="size-8 text-oxblood" />
          <span><span className="block text-subheading font-bold">Track an order</span><span className="text-muted-foreground">Order number + email</span></span>
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
