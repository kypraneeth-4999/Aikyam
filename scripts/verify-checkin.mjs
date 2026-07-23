// Verify the check-in security core against a real ticket: token signature +
// binding, atomic single-use, and tamper rejection. Resets the ticket after.
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
const secret = new TextEncoder().encode(env.QR_JWT_SECRET);

let pass = 0,
  fail = 0;
const check = (n, ok) => {
  console.log(`  ${ok ? "✓" : "✗"} ${n}`);
  ok ? pass++ : fail++;
};

const { data: ev } = await s.from("events").select("id").eq("slug", "free-pottery-demo").maybeSingle();
if (!ev) {
  console.log("No free-pottery-demo event — book it first.");
  process.exit(1);
}
const { data: bk } = await s.from("bookings").select("id").eq("event_id", ev.id).eq("payment_status", "paid").limit(1).maybeSingle();
const { data: ticket } = bk
  ? await s.from("tickets").select("id, qr_token, status").eq("booking_id", bk.id).maybeSingle()
  : { data: null };
if (!ticket) {
  console.log("No ticket for free-pottery-demo — book it first.");
  process.exit(1);
}

console.log("Check-in core:");

// 1. Token verifies + binds to this ticket/event.
try {
  const { payload } = await jwtVerify(ticket.qr_token, secret, { issuer: "aikyam" });
  check("QR token verifies + binds to ticket & event", payload.ticketId === ticket.id && payload.eventId === ev.id);
} catch {
  check("QR token verifies + binds to ticket & event", false);
}

// 2. Tampered token rejected.
let tamperRejected = false;
try {
  await jwtVerify(ticket.qr_token.slice(0, -3) + "aaa", secret, { issuer: "aikyam" });
} catch {
  tamperRejected = true;
}
check("tampered token rejected", tamperRejected);

// 3. Atomic single-use check-in.
await s.from("tickets").update({ status: "valid", checked_in_at: null }).eq("id", ticket.id);
const { data: r1 } = await s
  .from("tickets")
  .update({ status: "checked_in", checked_in_at: new Date().toISOString() })
  .eq("id", ticket.id)
  .eq("status", "valid")
  .select("id");
check("first check-in succeeds", (r1 ?? []).length === 1);
const { data: r2 } = await s
  .from("tickets")
  .update({ status: "checked_in", checked_in_at: new Date().toISOString() })
  .eq("id", ticket.id)
  .eq("status", "valid")
  .select("id");
check("second check-in blocked (atomic single-use)", (r2 ?? []).length === 0);

// Reset so the real ticket stays valid.
await s.from("tickets").update({ status: "valid", checked_in_at: null }).eq("id", ticket.id);

console.log(`RESULT: ${pass} passed, ${fail} failed.`);
process.exit(fail ? 1 : 0);
