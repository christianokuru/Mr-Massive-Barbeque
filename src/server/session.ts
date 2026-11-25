import "server-only";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/lib/auth";

/** Current session or null. Waits for a request (DB access can't prerender). */
export async function getSession() {
  await connection();
  return auth.api.getSession({ headers: await headers() });
}

export function isAdminEmail(email: string | null | undefined) {
  const admin = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  return !!admin && !!email && email.trim().toLowerCase() === admin;
}

export function isAdminSession(
  session: Awaited<ReturnType<typeof getSession>>,
): boolean {
  return !!session && session.user.emailVerified && isAdminEmail(session.user.email);
}

/** Signed-in, verified customer (or admin). Redirects to sign-in otherwise. */
export async function requireUser(next = "/account") {
  const session = await getSession();
  if (!session || !session.user.emailVerified) {
    redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  }
  return session;
}

/** The single admin. Everyone else (guests included) gets a 404. */
export async function requireAdmin() {
  const session = await getSession();
  if (!isAdminSession(session)) notFound();
  return session!;
}

/** For route handlers: returns the admin session or null (caller sends 404). */
export async function adminOrNull() {
  const session = await auth.api.getSession({ headers: await headers() });
  return isAdminSession(session) ? session : null;
}
