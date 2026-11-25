import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { Download, MapPin } from "lucide-react";
import { db } from "@/db";
import * as s from "@/db/schema";
import { DeleteAccount, MarketingToggle, PasswordForm, ProfileForm, SignOutButton } from "@/components/account/account-ui";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Settings", robots: { index: false } };

// Auth-gated, per-request data: not expected to navigate instantly.
export const instant = false;

function Card({ title, children, id }: { title: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="rounded-card bg-white p-5 md:p-6">
      <h2 className="mb-5 text-heading-sm">{title}</h2>
      {children}
    </section>
  );
}

export default async function SettingsPage() {
  const session = await requireUser("/account/settings");
  const [profile] = await db.select().from(s.profile).where(eq(s.profile.userId, session.user.id));
  const hasPassword = (await db.$count(s.account, eq(s.account.userId, session.user.id))) > 0;
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[length:clamp(30px,8.5vw,44px)] leading-[0.9] md:text-heading-lg">Settings</h1>
      <p className="-mt-3 text-muted-foreground">Signed in as {session.user.email}</p>
      <Card title="Profile">
        <ProfileForm name={session.user.name} phone={profile?.phone ?? ""} />
      </Card>
      <Link href="/account/addresses" className="flex items-center gap-3 rounded-card bg-white p-5 font-bold lg:hidden">
        <MapPin className="size-5 text-oxblood" /> Saved addresses
      </Link>
      {hasPassword ? (
        <Card title="Password">
          <PasswordForm />
        </Card>
      ) : null}
      <Card title="Privacy" id="privacy">
        <div className="flex flex-col gap-6">
          <MarketingToggle initial={profile?.marketingOptIn ?? false} />
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
            <span>
              <span className="block font-bold">Download my data</span>
              <span className="text-sm text-muted-foreground">Your profile, addresses, orders and reviews as JSON.</span>
            </span>
            <a href="/account/export" className="inline-flex h-11 items-center gap-2 rounded-full border-2 border-oxblood px-5 font-bold text-oxblood" data-testid="export-data">
              <Download className="size-4" /> Download
            </a>
          </div>
          <div className="border-t border-line pt-5">
            <p className="font-bold">Delete account</p>
            <p className="mb-4 text-sm text-muted-foreground">Permanent. Orders are kept for accounting without your account details.</p>
            <DeleteAccount />
          </div>
        </div>
      </Card>
      <SignOutButton className="w-fit lg:hidden" />
    </div>
  );
}
