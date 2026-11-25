import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignInForm } from "@/components/auth/forms";

export const metadata: Metadata = { title: "Welcome back", robots: { index: false } };

export default function Page() {
  return (
    <AuthShell title="Welcome back" subtitle="Sign in to track orders, reorder favourites and use your rewards." photo="grilled-chicken">
      <Suspense fallback={<div className="h-72" />}>
        <SignInForm />
      </Suspense>
    </AuthShell>
  );
}
