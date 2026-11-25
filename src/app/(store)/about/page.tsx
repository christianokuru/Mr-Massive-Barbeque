import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { InfoPage } from "@/components/store/info-page";

export const metadata: Metadata = {
  title: "Our story",
  description: "Massive Barbeque grills catfish, croaker, chicken and turkey to order in Lagos, basted in our own pepper marinades and delivered hot.",
  alternates: { canonical: "/about" },
};

export default function About() {
  return (
    <InfoPage eyebrow="Our story" title="Grilled to perfection. Served with love." intro="Massive Barbeque is a Lagos grill house built on one simple idea: BBQ should arrive hot, generous and full of pepper.">
      <Image src="/brand/badge.png" alt="Massive Barbeque badge: Grilled to perfection, served with love" width={524} height={680} className="mx-auto h-56 w-auto" />
      <h2>Fire first</h2>
      <p>Every plate is grilled when you order, never batch-cooked and left under a lamp. Fish is basted in our peppered marinade while it chars; chicken and turkey get a dry rub and a slow finish over the coals.</p>
      <h2>Lagos portions</h2>
      <p>Regular means a proper plate. Biggie means sharing. Family Pack means the whole house eats. We&apos;d rather you have leftovers than leave hungry.</p>
      <h2>Order your way</h2>
      <p>Order online for hot delivery across Lekki, VI, Ikoyi, Ikeja and the Mainland, or skip the fee and pick it up. Pay by card, bank transfer or USSD through Paystack, and track your order from the grill to your door.</p>
      <p><Link href="/menu">See the menu</Link> · <Link href="/contact">Get in touch</Link></p>
    </InfoPage>
  );
}
