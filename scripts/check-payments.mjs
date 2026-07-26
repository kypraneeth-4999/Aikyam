// Show recent paid bookings with fee + ticket status (post-payment verification).
import { readFileSync } from "node:fs";
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

const { data: bookings } = await s
  .from("bookings")
  .select("id, event_id, seats, amount, platform_fee_amount, payment_status, razorpay_order_id, razorpay_payment_id, created_at")
  .not("razorpay_order_id", "is", null)
  .order("created_at", { ascending: false })
  .limit(5);

if (!bookings?.length) {
  console.log("No Razorpay bookings found yet.");
  process.exit(0);
}

for (const b of bookings) {
  const { data: ev } = await s.from("events").select("title").eq("id", b.event_id).maybeSingle();
  const { data: t } = await s.from("tickets").select("id, qr_token, status").eq("booking_id", b.id).maybeSingle();
  const rupees = (p) => `₹${(p / 100).toFixed(2)}`;
  const expectedFee = Math.round((b.amount * Number(env.PLATFORM_FEE_BPS ?? 500)) / 10000);

  console.log(`\n${ev?.title ?? "?"}  (${b.created_at})`);
  console.log(`  status:      ${b.payment_status}`);
  console.log(`  amount:      ${rupees(b.amount)} · seats ${b.seats}`);
  console.log(`  platform fee:${rupees(b.platform_fee_amount)}  (expected ${rupees(expectedFee)}) ${b.platform_fee_amount === expectedFee ? "✓" : "✗ MISMATCH"}`);
  console.log(`  organiser gets: ${rupees(b.amount - b.platform_fee_amount)}`);
  console.log(`  razorpay:    order ${b.razorpay_order_id} · payment ${b.razorpay_payment_id ?? "—"}`);
  if (t) {
    let qrOk = false;
    try {
      const { payload } = await jwtVerify(t.qr_token, new TextEncoder().encode(env.QR_JWT_SECRET), { issuer: "aikyam" });
      qrOk = payload.bookingId === b.id;
    } catch { /* invalid */ }
    console.log(`  ticket:      ${t.id} (${t.status}) · QR verifies ${qrOk ? "✓" : "✗"}`);
  } else {
    console.log("  ticket:      NONE");
  }
}
