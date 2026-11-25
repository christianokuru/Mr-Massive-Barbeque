import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotForm } from "@/components/auth/forms";

export const metadata: Metadata = { title: "Forgot your password?", robots: { index: false } };

export default function Page() {
  return (
    <AuthShell title="Forgot your password?" subtitle="Enter your email and we&apos;ll send you a reset link." photo="grilled-croaker">
      <Suspense fallback={<div className="h-72" />}>
        <ForgotForm />
      </Suspense>
    </AuthShell>
  );
}
