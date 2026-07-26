import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";

/** Submit a review. Only the attendee, and only after checking in (P11). */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}) as Record<string, unknown>);
  const bookingId = String(body.bookingId ?? "");
  const rating = Number(body.rating);
  const comment =
    typeof body.comment === "string" ? body.comment.trim().slice(0, 1000) || null : null;

  if (!bookingId || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Pick a rating from 1 to 5." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: booking } = await admin
    .from("bookings")
    .select("id, attendee_user_id, event_id")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking || booking.attendee_user_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: ticket } = await admin
    .from("tickets")
    .select("status")
    .eq("booking_id", bookingId)
    .maybeSingle();
  if (ticket?.status !== "checked_in") {
    return NextResponse.json(
      { error: "You can review only after checking in at the event." },
      { status: 403 },
    );
  }

  const { error } = await admin.from("reviews").insert({
    event_id: booking.event_id,
    booking_id: bookingId,
    attendee_user_id: user.id,
    rating,
    comment,
  });
  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "You already reviewed this event." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
