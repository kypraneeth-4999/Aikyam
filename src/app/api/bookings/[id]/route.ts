import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";

/** Poll a booking's status (client waits for the webhook to confirm payment). */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: b } = await admin
    .from("bookings")
    .select("id, attendee_user_id, payment_status")
    .eq("id", id)
    .maybeSingle();
  if (!b || b.attendee_user_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let ticketId: string | null = null;
  if (b.payment_status === "paid") {
    const { data: t } = await admin
      .from("tickets")
      .select("id")
      .eq("booking_id", b.id)
      .maybeSingle();
    ticketId = (t?.id as string) ?? null;
  }

  return NextResponse.json({ status: b.payment_status, ticketId });
}
