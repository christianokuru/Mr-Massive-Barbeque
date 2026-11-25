import type { Metadata } from "next";
import { InfoPage } from "@/components/store/info-page";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = { title: "Terms of service", description: "The terms for ordering from Massive Barbeque in Lagos.", alternates: { canonical: "/terms" } };

export default function Terms() {
  return (
    <InfoPage eyebrow="Legal" title="Terms of service">
      <h2>Orders</h2>
      <p>An order is confirmed when payment is received through Paystack. Unpaid orders are held for 60 minutes and then cancelled automatically. Items are subject to the day&apos;s availability.</p>
      <h2>Prices</h2>
      <p>Prices are in Nigerian Naira and include VAT where applicable. Delivery fees depend on your zone and are shown before you pay. We may change prices at any time; you pay the price shown at checkout.</p>
      <h2>Discount codes</h2>
      <p>Codes can be used once per email unless stated otherwise, can&apos;t be combined, and have no cash value. Referral rewards apply to a friend&apos;s first paid order only and can&apos;t be used on your own referral.</p>
      <h2>Delivery</h2>
      <p>Delivery times are estimates. Please make sure someone is available at the address and phone number you give us.</p>
      <h2>Allergies</h2>
      <p>Our kitchen handles fish, peppers and common allergens. Tell us about allergies in your order notes, but we can&apos;t guarantee an allergen-free kitchen.</p>
      <h2>Contact</h2>
      <p><a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a></p>
    </InfoPage>
  );
}
