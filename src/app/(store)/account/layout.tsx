import { redirect } from "next/navigation";
import { AccountSideNav, AccountTabBar } from "@/components/account/account-nav";
import { SignOutButton } from "@/components/account/account-ui";
import { getSession, isAdminSession } from "@/server/session";

// Auth-gated: per-user content, not expected to navigate instantly.
export const instant = false;

export default async function AccountLayout({ children }: LayoutProps<"/account">) {
  const session = await getSession();
  // The admin uses /admin, not the customer dashboard. (Pages still call requireUser themselves.)
  if (isAdminSession(session)) redirect("/admin");
  return (
    <div className="container-page grid gap-8 py-8 pb-28 md:py-12 lg:grid-cols-[220px_minmax(0,1fr)] lg:pb-16">
      <aside className="hidden lg:block">
        <div className="sticky top-28 flex flex-col gap-6">
          <AccountSideNav />
          <SignOutButton className="px-4 text-sm text-muted-foreground" />
        </div>
      </aside>
      <div className="min-w-0">{children}</div>
      <AccountTabBar />
    </div>
  );
}
