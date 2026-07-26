// Safe DB-guard check for reviews: one-per-booking (unique) + rating range.
// Only runs if the booking has no real review; cleans up its own test rows.
import { readFileSync } from "node:fs";
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

let pass = 0,
  fail = 0;
const check = (n, ok) => {
  console.log(`  ${ok ? "✓" : "✗"} ${n}`);
  ok ? pass++ : fail++;
};

const { data: ev } = await s.from("events").select("id").eq("slug", "free-pottery-demo").maybeSingle();
const { data: bk } = ev
  ? await s.from("bookings").select("id, attendee_user_id").eq("event_id", ev.id).limit(1).maybeSingle()
  : { data: null };
if (!bk) {
  console.log("No booking on free-pottery-demo — skipping.");
  process.exit(0);
}

const { data: existing } = await s.from("reviews").select("id").eq("booking_id", bk.id).maybeSingle();
if (existing) {
  console.log("Booking already reviewed — skipping insert test (safe).");
  process.exit(0);
}

console.log("Review DB guards:");
const base = { event_id: ev.id, booking_id: bk.id, attendee_user_id: bk.attendee_user_id };

const { data: r1, error: e1 } = await s.from("reviews").insert({ ...base, rating: 5, comment: "[test]" }).select("id").single();
check("valid review inserts", !e1 && !!r1);

const { error: e2 } = await s.from("reviews").insert({ ...base, rating: 4, comment: "[test]" });
check("duplicate review rejected (one per booking)", !!e2 && e2.code === "23505");

if (r1) await s.from("reviews").delete().eq("id", r1.id);

const { error: e3 } = await s.from("reviews").insert({ ...base, rating: 6, comment: "[test]" });
check("rating > 5 rejected (check constraint)", !!e3);

// Clean up any stray test rows.
await s.from("reviews").delete().eq("booking_id", bk.id).eq("comment", "[test]");

console.log(`RESULT: ${pass} passed, ${fail} failed.`);
process.exit(fail ? 1 : 0);
