import { getSession } from "@/server/session";
import { orderLiveState } from "@/server/order-view";

/**
 * Live order status (polled by open order pages). Returns a few bytes:
 * { status, v } where `v` changes when the status or rider details change.
 * Access: the signed-in owner, or ?email= matching the order (same as /track).
 */
export async function GET(req: Request, ctx: RouteContext<"/api/orders/[number]/status">) {
  const { number } = await ctx.params;
  const email = new URL(req.url).searchParams.get("email")?.slice(0, 254) ?? null;
  const session = email ? null : await getSession();
  const state = await orderLiveState(number.trim().toUpperCase().slice(0, 20), {
    email,
    userId: session?.user.emailVerified ? session.user.id : null,
    userEmail: session?.user.emailVerified ? session.user.email : null,
  });
  if (!state) return Response.json({ error: "not_found" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  return Response.json(
    { status: state.status, v: state.v },
    // Several tabs/devices on the same order within a few seconds share one answer.
    { headers: { "Cache-Control": "private, max-age=5" } },
  );
}
