// Inspect bookings + tickets for an event slug and verify the QR token.
//   node scripts/check-booking.mjs <slug>
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

const slug = process.argv[2] ?? "free-pottery-demo";
const { data: ev } = await s.from("events").select("id, title, capacity").eq("slug", slug).maybeSingle();
if (!ev) {
  console.log(`No event ${slug}`);
  process.exit(1);
}

const { data: bookings } = await s
  .from("bookings")
  .select("id, seats, guest_names, amount, platform_fee_amount, payment_status, created_at")
  .eq("event_id", ev.id)
  .order("created_at", { ascending: false });

console.log(`Event: ${ev.title} (capacity ${ev.capacity})`);
console.log(`Bookings: ${(bookings ?? []).length}`);
for (const b of bookings ?? []) {
  console.log(`\n  booking ${b.id}`);
  console.log(`    status: ${b.payment_status} · seats: ${b.seats} · amount: ${b.amount} paise · fee: ${b.platform_fee_amount}`);
  console.log(`    guests: ${JSON.stringify(b.guest_names)}`);
  const { data: t } = await s.from("tickets").select("id, qr_token, status, checked_in_at").eq("booking_id", b.id).maybeSingle();
  if (!t) {
    console.log("    ticket: NONE");
    continue;
  }
  console.log(`    ticket ${t.id} · status: ${t.status}`);
  try {
    const { payload } = await jwtVerify(t.qr_token, new TextEncoder().encode(env.QR_JWT_SECRET), { issuer: "aikyam" });
    console.log(`    QR verifies ✓ (binds to booking: ${payload.bookingId === b.id})`);
  } catch (e) {
    console.log(`    QR verify FAILED: ${e.message}`);
  }
}
