import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import { userOrganizesEvent } from "@/lib/authz";
import { refundBooking } from "@/lib/refunds";
import { sendCancellationEmail } from "@/lib/notifications";

/** Cancel an event: refund all paid bookings and notify attendees (P8 / F4). */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  if (!(await userOrganizesEvent(admin, user.id, id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: ev } = await admin
    .from("events")
    .select("id, status")
    .eq("id", id)
    .maybeSingle();
  if (!ev) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (ev.status === "cancelled") return NextResponse.json({ ok: true, refunded: 0 });

  await admin.from("events").update({ status: "cancelled" }).eq("id", id);

  const { data: paidBookings } = await admin
    .from("bookings")
    .select("id")
    .eq("event_id", id)
    .eq("payment_status", "paid");

  let refunded = 0;
  for (const b of paidBookings ?? []) {
    const r = await refundBooking(admin, b.id, user.id);
    if (r.ok) refunded++;
    await sendCancellationEmail(admin, b.id);
  }

  await admin.from("audit_logs").insert({
    actor_user_id: user.id,
    action: "event.cancelled",
    entity_type: "event",
    entity_id: id,
    metadata: { refunded },
  });

  return NextResponse.json({ ok: true, refunded });
}
