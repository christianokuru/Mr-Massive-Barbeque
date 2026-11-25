import { neon } from "@neondatabase/serverless";

import "../test-db";

const E2E = "e2e-%@example.com";

/**
 * The E2E database is the real store, so after every run put things back:
 * return stock held by test orders, give back coupon uses, then delete test data.
 */
export default async function teardown() {
  const sql = neon(process.env.DATABASE_URL!);
  await sql`update product_variant v set stock = v.stock + r.qty
    from (select variant_id, sum(qty)::int as qty from order_reservation
          where order_id in (select id from "order" where email like ${E2E} and status = 'pending_payment')
          group by variant_id) r
    where v.id = r.variant_id`;
  await sql`update coupon c set used_count = greatest(0, c.used_count - r.n)
    from (select coupon_id, count(*)::int as n from coupon_redemption
          where order_id in (select id from "order" where email like ${E2E})
          group by coupon_id) r
    where c.id = r.coupon_id`;
  await sql`delete from "order" where email like ${E2E}`;
  await sql`delete from subscriber where email like ${E2E}`;
  await sql`delete from "user" where email like ${E2E}`;
}
