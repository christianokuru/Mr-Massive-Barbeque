import type { Metadata } from "next";
import Link from "next/link";
import { CookieSettingsLink } from "@/components/store/consent";
import { InfoPage } from "@/components/store/info-page";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = { title: "Privacy policy", description: "How Massive Barbeque collects, uses and protects your personal data, in line with the Nigeria Data Protection Act.", alternates: { canonical: "/privacy" } };

export default function Privacy() {
  return (
    <InfoPage eyebrow="Legal" title="Privacy policy" intro="We collect only what we need to grill, deliver and improve your orders. This policy follows the Nigeria Data Protection Act (NDPA) 2023.">
      <h2>What we collect</h2>
      <ul>
        <li>Order details: your name, email, phone number, delivery address and what you ordered.</li>
        <li>Account details if you sign up: name, email, saved addresses, favourites and quiz answers.</li>
        <li>Payment status from Paystack. We never see or store your card details.</li>
        <li>Analytics (only if you accept cookies): pages visited and device type, via Google Analytics and Microsoft Clarity.</li>
      </ul>
      <h2>How we use it</h2>
      <ul>
        <li>To prepare, deliver and support your orders, and send order updates.</li>
        <li>To send reminders about items left in your bag (at most two) and reorder suggestions.</li>
        <li>To send offers only if you subscribed or opted in. You can opt out anytime.</li>
        <li>To prevent fraud and keep the site secure.</li>
      </ul>
      <h2>Cookies</h2>
      <p>Essential cookies keep your bag and sign-in working. Analytics cookies load only after you click Accept on the cookie banner. You can change your choice anytime: <CookieSettingsLink className="font-bold underline" />.</p>
      <h2>Who we share it with</h2>
      <p>Paystack (payments), our email provider (order emails), our hosting and database providers, and analytics tools if you consent. We don&apos;t sell your data.</p>
      <h2>Your rights</h2>
      <p>You can access, download, correct or delete your data. Signed-in customers can do this themselves in <Link href="/account/settings#privacy">Account → Settings → Privacy</Link>: turn marketing on or off, download your data, or delete your account. Orders are kept for accounting, without your account link.</p>
      <h2>Contact</h2>
      <p>Questions or requests: <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>.</p>
    </InfoPage>
  );
}
