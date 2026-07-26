import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import { userOrganizesEvent } from "@/lib/authz";
import { refundBooking } from "@/lib/refunds";
import { sendCancellationEmail } from "@/lib/notifications";

/** Refund a single booking (organiser of the booking's event only). */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: booking } = await admin
    .from("bookings")
    .select("id, event_id")
    .eq("id", id)
    .maybeSingle();
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!(await userOrganizesEvent(admin, user.id, booking.event_id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const r = await refundBooking(admin, id, user.id);
  if (!r.ok) {
    return NextResponse.json({ error: r.error ?? "Refund failed." }, { status: 502 });
  }
  await sendCancellationEmail(admin, id);
  return NextResponse.json({ ok: true });
}
