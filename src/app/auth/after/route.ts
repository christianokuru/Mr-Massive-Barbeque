import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { safeNext } from "@/lib/validation";
import { isAdminSession } from "@/server/session";

/**
 * Post sign-in / email-verification hop: the admin lands on /admin,
 * customers on their (open-redirect-safe) `next` or /account.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const session = await auth.api.getSession({ headers: await headers() });
  const base = process.env.NEXT_PUBLIC_APP_URL ?? url.origin;
  if (!session) return NextResponse.redirect(new URL("/sign-in", base));
  const dest = isAdminSession(session) ? "/admin" : safeNext(url.searchParams.get("next"), "/account");
  return NextResponse.redirect(new URL(dest, base));
}
