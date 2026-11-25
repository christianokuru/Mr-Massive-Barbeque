import type { Metadata } from "next";
import { InfoPage } from "@/components/store/info-page";
import { jsonLd } from "@/lib/csv";

export const metadata: Metadata = {
  title: "FAQ: delivery, payment and orders",
  description: "Answers about Massive Barbeque delivery areas in Lagos, payment by card, transfer or USSD, order tracking, spice levels and refunds.",
  alternates: { canonical: "/faq" },
};

const FAQS: [string, string][] = [
  ["Where do you deliver?", "Across Lagos: Lekki, Ajah, Victoria Island, Ikoyi, Yaba, Surulere, Gbagada, Ikeja, Maryland, Festac and nearby areas. Fees and times for each zone are on our Delivery page, and you'll see the exact fee at checkout."],
  ["How long does delivery take?", "Everything is grilled to order, so most orders arrive in 40–120 minutes depending on your area and traffic. You can track every step from your order page."],
  ["How do I pay?", "Online through Paystack: debit card, bank transfer or USSD. Your order is held for 60 minutes while you complete payment."],
  ["Is there free delivery?", "Yes. Orders above the free-delivery amount for your zone ship free. Your bag shows how close you are."],
  ["Can I pick up instead?", "Yes, pickup is always free. Choose Pickup at checkout and we'll message you when it's ready."],
  ["How spicy is the food?", "Each item shows a heat rating from No heat to Extra hot. Add a note at checkout if you want it milder or hotter and we'll do our best."],
  ["Can I order for a party or office?", "Absolutely. Order Biggie fish, family packs and combos, add the time you need it in the notes, or message us on WhatsApp for very large orders."],
  ["What if something is wrong with my order?", "Message us within 2 hours of delivery with your order number and a photo. See our Refunds page for details."],
  ["Do I need an account?", "No, guest checkout works fine. An account lets you save addresses, reorder in one tap, track orders and earn referral rewards."],
];

export default function Faq() {
  const ld = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  };
  return (
    <InfoPage eyebrow="Help" title="Questions, answered">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ld) }} />
      <div className="flex flex-col divide-y divide-line rounded-card bg-white px-5">
        {FAQS.map(([q, a]) => (
          <details key={q} className="group py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-char">
              {q}
              <span className="text-2xl leading-none transition group-open:rotate-45" aria-hidden>+</span>
            </summary>
            <p className="mt-3">{a}</p>
          </details>
        ))}
      </div>
    </InfoPage>
  );
}
