import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendReminderEmail } from "@/lib/notifications";

type Kind = "reminder_24h" | "reminder_3h";

/**
 * Send 24h / 3h event reminders (JAD F3). Designed to be run on a schedule
 * (hourly is plenty) — sends are idempotent via notification_log's unique
 * (booking_id, kind, channel) constraint, so re-running never double-messages.
 *
 * Protected by CRON_SECRET rather than a user session; the proxy exempts
 * /api/cron/ from the CSRF origin check for that reason.
 */
async function runReminders() {
  const admin = createAdminClient();
  const now = Date.now();
  const in24h = new Date(now + 24 * 3600_000).toISOString();
  const in3h = now + 3 * 3600_000;

  // Published events starting within the next 24 hours.
  const { data: events } = await admin
    .from("events")
    .select("id, starts_at")
    .eq("status", "published")
    .gte("starts_at", new Date(now).toISOString())
    .lte("starts_at", in24h);
  if (!events?.length) return { checked: 0, sent: 0 };

  const eventIds = events.map((e) => e.id as string);
  const { data: bookings } = await admin
    .from("bookings")
    .select("id, event_id")
    .in("event_id", eventIds)
    .eq("payment_status", "paid");
  if (!bookings?.length) return { checked: 0, sent: 0 };

  const startsById = new Map(
    events.map((e) => [e.id as string, new Date(e.starts_at as string).getTime()]),
  );

  // What's already been sent, so we only attempt genuinely-new reminders.
  const bookingIds = bookings.map((b) => b.id as string);
  const { data: logs } = await admin
    .from("notification_log")
    .select("booking_id, kind")
    .in("booking_id", bookingIds);
  const already = new Set((logs ?? []).map((l) => `${l.booking_id}:${l.kind}`));

  let sent = 0;
  for (const b of bookings) {
    const startsAt = startsById.get(b.event_id as string);
    if (startsAt === undefined) continue;

    const due: Kind[] = ["reminder_24h"];
    if (startsAt <= in3h) due.push("reminder_3h");

    for (const kind of due) {
      if (already.has(`${b.id}:${kind}`)) continue;

      // Claim the send first — the unique constraint means a concurrent run
      // loses the race and skips, so nobody gets two of the same reminder.
      const { error: claimErr } = await admin
        .from("notification_log")
        .insert({ booking_id: b.id, kind, channel: "email" });
      if (claimErr) continue; // already claimed elsewhere

      const ok = await sendReminderEmail(admin, b.id as string, kind);
      if (ok) {
        sent++;
      } else {
        // Sending failed — release the claim so a later run can retry.
        await admin
          .from("notification_log")
          .delete()
          .eq("booking_id", b.id)
          .eq("kind", kind)
          .eq("channel", "email");
      }
    }
  }

  return { checked: bookings.length, sent };
}

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization") ?? "";
  return auth === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await runReminders();
  return NextResponse.json({ ok: true, ...result });
}

// GET allowed too, so the job can be triggered by any scheduler.
export async function GET(request: Request) {
  return POST(request);
}
