import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminSidebar, AdminTopBar } from "@/components/admin/admin-nav";
import { sidebarBadges } from "@/server/admin";
import { requireAdmin } from "@/server/session";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin" }, robots: { index: false, follow: false } };

// Auth-gated and per-request; no instant-navigation expectations.
export const instant = false;

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin(); // 404 for guests/customers (pages and actions check again)
  const badges = await sidebarBadges();
  return (
    <div className="flex min-h-svh bg-[#f3eee4] print:bg-white">
      <Suspense fallback={<div className="hidden w-64 shrink-0 bg-white lg:block" />}>
        <AdminSidebar badges={badges} />
      </Suspense>
      <div className="flex min-w-0 flex-1 flex-col">
        <Suspense fallback={<div className="h-14 bg-white lg:hidden" />}>
          <AdminTopBar badges={badges} />
        </Suspense>
        <main className="w-full min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8 2xl:px-12 print:p-0">{children}</main>
      </div>
    </div>
  );
}
