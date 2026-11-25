import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { slugExists } from "@/server/slugs";

/**
 * Runs before streaming starts, so it can set real status codes:
 *  - /admin, /api/admin: a true 404 for anyone but the verified ADMIN_EMAIL user.
 *  - /account: optimistic redirect to sign-in when there's no session cookie.
 *  - /menu|category|occasion|combos/[slug]: a true 404 for unknown slugs (SEO).
 * Pages, actions and route handlers still enforce access themselves.
 */
export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    const admin = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const session = getSessionCookie(req) ? await auth.api.getSession({ headers: req.headers }).catch(() => null) : null;
    const ok = !!admin && !!session?.user.emailVerified && session.user.email.toLowerCase() === admin;
    if (!ok) {
      if (pathname.startsWith("/api/")) return new NextResponse("Not found", { status: 404 });
      // Render the normal not-found page with a real 404 status.
      return NextResponse.rewrite(new URL("/__not-found", req.url), { status: 404 });
    }
    return NextResponse.next();
  }

  // Real 404s (before streaming) for unknown catalogue URLs.
  const m = pathname.match(/^\/(menu|category|occasion|combos|journal)\/([^/]+)\/?$/);
  if (m && !(await slugExists(m[1] as "menu" | "category" | "occasion" | "combos" | "journal", decodeURIComponent(m[2])))) {
    return NextResponse.rewrite(new URL("/__not-found", req.url), { status: 404 });
  }

  if (pathname.startsWith("/account") && !getSessionCookie(req)) {
    const url = new URL("/sign-in", req.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/account/:path*", "/menu/:slug", "/category/:slug", "/occasion/:slug", "/combos/:slug", "/journal/:slug"],
};
