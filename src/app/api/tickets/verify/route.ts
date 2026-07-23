import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import { verifyQrToken } from "@/lib/tickets";
import { userOrganizesEvent } from "@/lib/authz";

type Admin = ReturnType<typeof createAdminClient>;

async function checkedInCount(admin: Admin, eventId: string): Promise<number> {
  const { count } = await admin
    .from("tickets")
    .select("id, bookings!inner(event_id)", { count: "exact", head: true })
    .eq("status", "checked_in")
    .eq("bookings.event_id", eventId);
  return count ?? 0;
}

/**
 * Check in a ticket from its scanned QR token. Signature-verified, authorised to
 * the event's organiser, and atomic single-use (JAD §6.5 / F2). Never marks a
 * ticket checked-in twice.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}) as Record<string, unknown>);
  const token = String(body.token ?? "").trim();
  const eventId = String(body.eventId ?? "");
  if (!token || !eventId) {
    return NextResponse.json({ error: "Missing token or event." }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!(await userOrganizesEvent(admin, user.id, eventId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const claims = await verifyQrToken(token);
  if (!claims) return NextResponse.json({ result: "invalid" });
  if (claims.eventId !== eventId) return NextResponse.json({ result: "wrong_event" });

  const { data: ticket } = await admin
    .from("tickets")
    .select("id, status, booking_id")
    .eq("id", claims.ticketId)
    .maybeSingle();
  if (!ticket) return NextResponse.json({ result: "invalid" });

  const { data: booking } = await admin
    .from("bookings")
    .select("attendee_user_id, seats, event_id")
    .eq("id", ticket.booking_id)
    .maybeSingle();
  if (!booking || booking.event_id !== eventId) {
    return NextResponse.json({ result: "wrong_event" });
  }

  const { data: u } = await admin
    .from("users")
    .select("name")
    .eq("id", booking.attendee_user_id)
    .maybeSingle();
  const attendee = u?.name ?? "Guest";
  const seats = booking.seats as number;

  if (ticket.status === "cancelled") {
    return NextResponse.json({
      result: "cancelled",
      attendee,
      seats,
      count: await checkedInCount(admin, eventId),
    });
  }
  if (ticket.status === "checked_in") {
    return NextResponse.json({
      result: "duplicate",
      attendee,
      seats,
      count: await checkedInCount(admin, eventId),
    });
  }

  // Atomic: only transitions a still-valid ticket. A concurrent scan loses the race.
  const { data: updated } = await admin
    .from("tickets")
    .update({ status: "checked_in", checked_in_at: new Date().toISOString() })
    .eq("id", ticket.id)
    .eq("status", "valid")
    .select("id")
    .maybeSingle();
  if (!updated) {
    return NextResponse.json({
      result: "duplicate",
      attendee,
      seats,
      count: await checkedInCount(admin, eventId),
    });
  }

  await admin.from("audit_logs").insert({
    actor_user_id: user.id,
    action: "ticket.checked_in",
    entity_type: "ticket",
    entity_id: ticket.id,
    metadata: { event_id: eventId },
  });

  return NextResponse.json({
    result: "success",
    attendee,
    seats,
    count: await checkedInCount(admin, eventId),
  });
}
