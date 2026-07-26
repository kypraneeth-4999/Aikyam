// End-to-end test of the reminder job: seed an event starting in ~2h with a
// paid booking + ticket, run the cron route, report what happened, clean up.
import { readFileSync } from "node:fs";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

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
const BASE = process.argv[2] || "http://localhost:3000";
const SLUG = "reminder-test-event";

async function cleanup() {
  const { data: ev } = await s.from("events").select("id").eq("slug", SLUG).maybeSingle();
  if (!ev) return;
  const { data: bks } = await s.from("bookings").select("id").eq("event_id", ev.id);
  for (const b of bks ?? []) {
    await s.from("notification_log").delete().eq("booking_id", b.id);
  }
  await s.from("bookings").delete().eq("event_id", ev.id);
  await s.from("events").delete().eq("id", ev.id);
}

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

// Event starting in ~2 hours → both 24h and 3h reminders are due.
const startsAt = new Date(Date.now() + 2 * 3600_000).toISOString();
const { data: ev } = await s
  .from("events")
  .insert({
    slug: SLUG,
    title: "Reminder Test Event",
    category: "Pottery",
    starts_at: startsAt,
    venue_name: "Test Venue, Pune",
    what_to_bring: "An apron",
    capacity: 10,
    price: 0,
    is_free: true,
    currency: "INR",
    materials: "included",
    status: "published",
  })
  .select("id")
  .single();
await s.from("event_organizers").insert({
  event_id: ev.id,
  organizer_id: org.id,
  role: "primary",
  status: "accepted",
});

const { data: booking } = await s
  .from("bookings")
  .insert({
    event_id: ev.id,
    attendee_user_id: org.user_id,
    seats: 1,
    guest_names: ["Reminder Test"],
    amount: 0,
    platform_fee_amount: 0,
    payment_status: "paid",
    idempotency_key: `reminder-test-${crypto.randomUUID()}`,
  })
  .select("id")
  .single();
await s.from("tickets").insert({
  booking_id: booking.id,
  qr_token: "test-token-not-used",
  status: "valid",
});
console.log(`Seeded event starting ${startsAt} with 1 paid booking.\n`);

const res = await fetch(`${BASE}/api/cron/reminders`, {
  method: "POST",
  headers: { authorization: `Bearer ${env.CRON_SECRET}` },
});
console.log("cron response:", res.status, await res.text());

const { data: logs } = await s
  .from("notification_log")
  .select("kind, channel, sent_at")
  .eq("booking_id", booking.id);
console.log("\nnotification_log rows for this booking:");
if (!logs?.length) {
  console.log("  (none — the send failed, so the claim was released for retry)");
} else {
  for (const l of logs) console.log(`  ✓ ${l.kind} via ${l.channel} at ${l.sent_at}`);
}

await cleanup();
console.log("\nCleaned up test data.");
