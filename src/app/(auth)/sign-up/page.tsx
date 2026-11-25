import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignUpForm } from "@/components/auth/forms";

export const metadata: Metadata = { title: "Join the grill", robots: { index: false } };

export default function Page() {
  return (
    <AuthShell title="Join the grill" subtitle="Save addresses, reorder in one tap and earn rewards when friends order." photo="grilled-catfish">
      <Suspense fallback={<div className="h-72" />}>
        <SignUpForm />
      </Suspense>
    </AuthShell>
  );
}
