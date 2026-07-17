// Verifies Slice 3 without Razorpay: atomic booking / overbooking, ticket
// issuance, and the signed webhook. Uses the real create_booking() RPC and the
// real /api/webhooks/razorpay route. Cleans up after itself.
import { readFileSync } from "node:fs";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { jwtVerify } from "jose";

function loadEnv(path) {
  const o = {};
  for (const l of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) o[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return o;
}
const env = loadEnv(".env.local");
const s = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const WH = env.RAZORPAY_WEBHOOK_SECRET;
const QR = env.QR_JWT_SECRET;
const BASE = "http://localhost:3000";
const SLUGS = ["seed-free-demo", "seed-paid-demo", "free-pottery-demo"];

let pass = 0,
  fail = 0;
const check = (name, ok, extra = "") => {
  console.log(`  ${ok ? "✓" : "✗"} ${name}${extra ? ` — ${extra}` : ""}`);
  ok ? pass++ : fail++;
};

async function cleanup() {
  for (const slug of SLUGS) {
    const { data } = await s.from("events").select("id").eq("slug", slug).maybeSingle();
    if (data) await s.from("events").delete().eq("id", data.id);
  }
}

async function makeEvent(orgId, slug, { free, cap, price }) {
  const start = new Date(Date.now() + 7 * 864e5).toISOString();
  const { data: ev } = await s
    .from("events")
    .insert({
      slug,
      title: slug,
      category: "Pottery",
      starts_at: start,
      venue_name: "Test Venue",
      capacity: cap,
      price: free ? 0 : price,
      is_free: free,
      currency: "INR",
      materials: "included",
      status: "published",
    })
    .select("id")
    .single();
  await s.from("event_organizers").insert({ event_id: ev.id, organizer_id: orgId, role: "primary" });
  return ev.id;
}

async function book(eventId, userId, seats, key, amount, fee) {
  return s.rpc("create_booking", {
    p_event_id: eventId,
    p_user_id: userId,
    p_seats: seats,
    p_guest_names: ["Test Guest"],
    p_amount: amount,
    p_platform_fee: fee,
    p_idempotency_key: key,
  });
}

async function main() {
  await cleanup();
  const { data: org } = await s
    .from("organizer_profiles")
    .select("id, user_id")
    .eq("handle_normalised", "ykpraneeth")
    .maybeSingle();
  if (!org) {
    console.log("No @ykpraneeth organizer found.");
    process.exit(1);
  }
  const uid = org.user_id;

  const freeId = await makeEvent(org.id, "seed-free-demo", { free: true, cap: 2 });
  const paidId = await makeEvent(org.id, "seed-paid-demo", { free: false, cap: 5, price: 80000 });

  console.log("\n[1] Atomic booking / overbooking (capacity = 2)");
  const r1 = await book(freeId, uid, 2, "k-a", 0, 0);
  check("book 2 of 2 seats succeeds", !r1.error);
  const r1b = await book(freeId, uid, 2, "k-a", 0, 0);
  const b1 = Array.isArray(r1.data) ? r1.data[0] : r1.data;
  const b1b = Array.isArray(r1b.data) ? r1b.data[0] : r1b.data;
  check("same idempotency key returns same booking", !r1b.error && b1?.id === b1b?.id);
  const r2 = await book(freeId, uid, 1, "k-b", 0, 0);
  check("3rd seat rejected (overbooking blocked)", !!r2.error && /sold_out/.test(r2.error.message || ""),
    r2.error?.message);

  console.log("\n[2/3] Webhook marks paid + issues signed ticket");
  const rb = await book(paidId, uid, 1, "k-c", 80000, 4000);
  const booking = Array.isArray(rb.data) ? rb.data[0] : rb.data;
  await s.from("bookings").update({ razorpay_order_id: "order_SEED123" }).eq("id", booking.id);

  const payload = {
    event: "payment.captured",
    payload: { payment: { entity: { id: "pay_SEED123", order_id: "order_SEED123" } } },
  };
  const raw = JSON.stringify(payload);
  const sig = crypto.createHmac("sha256", WH).update(raw).digest("hex");

  const resp = await fetch(`${BASE}/api/webhooks/razorpay`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-razorpay-signature": sig },
    body: raw,
  });
  check("valid signed webhook returns 200", resp.status === 200, `status ${resp.status}`);

  const { data: after } = await s
    .from("bookings")
    .select("payment_status, razorpay_payment_id")
    .eq("id", booking.id)
    .maybeSingle();
  check("booking marked paid", after?.payment_status === "paid");
  check("razorpay_payment_id stored", after?.razorpay_payment_id === "pay_SEED123");

  const { data: tickets } = await s.from("tickets").select("id, qr_token").eq("booking_id", booking.id);
  check("exactly one ticket issued", (tickets ?? []).length === 1);
  if (tickets?.[0]) {
    try {
      const { payload: claims } = await jwtVerify(tickets[0].qr_token, new TextEncoder().encode(QR), {
        issuer: "aikyam",
      });
      check("QR token verifies + binds to booking", claims.bookingId === booking.id);
    } catch (e) {
      check("QR token verifies + binds to booking", false, e.message);
    }
  }

  const badResp = await fetch(`${BASE}/api/webhooks/razorpay`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-razorpay-signature": "deadbeef" },
    body: raw,
  });
  check("forged signature rejected (400)", badResp.status === 400, `status ${badResp.status}`);

  const again = await fetch(`${BASE}/api/webhooks/razorpay`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-razorpay-signature": sig },
    body: raw,
  });
  const { data: t2 } = await s.from("tickets").select("id").eq("booking_id", booking.id);
  check("duplicate webhook is idempotent (still 1 ticket)", again.status === 200 && (t2 ?? []).length === 1);

  // Clean the test events, then leave one bookable free event for a UI test.
  await cleanup();
  await makeEvent(org.id, "free-pottery-demo", { free: true, cap: 10 });

  console.log(`\nRESULT: ${pass} passed, ${fail} failed.`);
  console.log("Left a bookable free event at /e/free-pottery-demo for a UI test.");
  process.exit(fail ? 1 : 0);
}

main();
