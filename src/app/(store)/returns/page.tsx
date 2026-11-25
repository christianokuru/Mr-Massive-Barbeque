import type { Metadata } from "next";
import { InfoPage } from "@/components/store/info-page";

export const metadata: Metadata = { title: "Refunds & order issues", description: "What to do if something is wrong with your Massive Barbeque order, and how refunds work.", alternates: { canonical: "/returns" } };

export default function Returns() {
  return (
    <InfoPage eyebrow="Help" title="Refunds & order issues" intro="Food can't be returned, but we always make it right when we get it wrong.">
      <h2>Something wrong with your order?</h2>
      <p>If an item is missing, wrong or not up to standard, message us within 2 hours of delivery with your order number and a photo. We&apos;ll replace it or refund it.</p>
      <h2>Cancelling</h2>
      <p>Unpaid orders cancel themselves after 60 minutes. Once paid, your order goes on the grill quickly, so contact us immediately if you need to cancel. Orders that haven&apos;t been prepared yet can be refunded in full.</p>
      <h2>How refunds work</h2>
      <p>Refunds go back to the card or account you paid with through Paystack. Banks usually take 3–10 working days to show them.</p>
      <h2>Late or failed delivery</h2>
      <p>If your order doesn&apos;t arrive or arrives very late, tell us and we&apos;ll sort it out, including a refund of the delivery fee where it&apos;s our fault.</p>
    </InfoPage>
  );
}
