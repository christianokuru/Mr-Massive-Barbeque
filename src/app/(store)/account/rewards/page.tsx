import type { Metadata } from "next";
import { Gift } from "lucide-react";
import { ReferralShare } from "@/components/account/account-ui";
import { Pill } from "@/components/store/bits";
import { formatDate } from "@/lib/format";
import { formatNaira } from "@/lib/money";
import { siteConfig } from "@/lib/site";
import { getOrCreateReferralCode, referralStats, rewardsWallet } from "@/server/account";
import { REFERRAL_FRIEND_OFF_KOBO, REFERRAL_REWARD_KOBO } from "@/server/pricing";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Rewards", robots: { index: false } };

function maskEmail(e: string) {
  const [u, d] = e.split("@");
  return `${u.slice(0, 2)}${"•".repeat(Math.max(1, u.length - 2))}@${d}`;
}

export default async function RewardsPage() {
  const session = await requireUser("/account/rewards");
  const { id, email, name } = session.user;
  const [code, wallet, friends] = await Promise.all([getOrCreateReferralCode(id, name), rewardsWallet(id, email), referralStats(id)]);
  const url = `${siteConfig.url}/sign-up?ref=${encodeURIComponent(code)}`;
  const earned = friends.reduce((s, f) => s + (f.value ?? 0), 0);
  const tone = { Ready: "good", Used: "neutral", Expired: "bad" } as const;

  return (
    <div className="flex flex-col gap-10">
      <h1 className="text-[44px] leading-[0.9] md:text-heading-lg">Rewards</h1>

      <section className="rounded-card bg-paprika p-5 md:p-8">
        <p className="eyebrow mb-2">Refer a friend</p>
        <h2 className="font-display text-heading-sm md:text-heading">Give {formatNaira(REFERRAL_FRIEND_OFF_KOBO)}, get {formatNaira(REFERRAL_REWARD_KOBO)}</h2>
        <p className="mt-2 mb-5 max-w-lg text-smoke">
          Friends get {formatNaira(REFERRAL_FRIEND_OFF_KOBO)} off their first order of ₦5,000+. When they pay, you get a {formatNaira(REFERRAL_REWARD_KOBO)} code. No limit.
        </p>
        <ReferralShare code={code} url={url} />
      </section>

      <section>
        <h2 className="mb-4 text-heading-sm">Your codes</h2>
        {wallet.length ? (
          <ul className="grid gap-3 sm:grid-cols-2" data-testid="wallet">
            {wallet.map((w) => (
              <li key={w.code} className="flex items-center justify-between gap-3 rounded-card bg-white p-4">
                <div>
                  <p className="text-sm text-muted-foreground">{w.label} · {w.detail}</p>
                  <p className="font-display text-heading-sm tracking-wide">{w.code}</p>
                </div>
                <Pill tone={tone[w.status]}>{w.status}</Pill>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">No codes yet. Refer a friend to earn your first one.</p>
        )}
      </section>

      <section>
        <h2 className="mb-1 text-heading-sm">Friends who ordered</h2>
        <p className="mb-4 text-muted-foreground">{friends.length} friend{friends.length === 1 ? "" : "s"} · {formatNaira(earned)} earned</p>
        {friends.length ? (
          <ul className="divide-y divide-line rounded-card bg-white px-4">
            {friends.map((f) => (
              <li key={f.refereeEmail} className="flex items-center justify-between gap-3 py-3">
                <span className="flex items-center gap-2"><Gift className="size-4 text-oxblood" /> {maskEmail(f.refereeEmail)}</span>
                <span className="text-sm text-muted-foreground">{formatDate(f.createdAt)}{f.code ? ` · ${f.code}` : ""}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
