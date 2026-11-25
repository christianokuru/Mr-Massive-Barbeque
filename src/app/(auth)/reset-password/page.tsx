import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetForm } from "@/components/auth/forms";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

export default function Page() {
  return (
    <AuthShell title="Choose a new password" subtitle="Use at least 8 characters. Longer is stronger." photo="grilled-turkey">
      <Suspense fallback={<div className="h-72" />}>
        <ResetForm />
      </Suspense>
    </AuthShell>
  );
}
