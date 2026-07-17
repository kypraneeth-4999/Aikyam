import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { signQrToken } from "@/lib/tickets";

type Admin = ReturnType<typeof createAdminClient>;

/**
 * Issue the (single) ticket for a paid booking. Idempotent: safe to call from
 * both the free-event path and the webhook, and safe under duplicate webhooks
 * (unique index on tickets.booking_id).
 */
export async function issueTicketForBooking(
  admin: Admin,
  bookingId: string,
  eventId: string,
): Promise<string> {
  const { data: existing } = await admin
    .from("tickets")
    .select("id")
    .eq("booking_id", bookingId)
    .maybeSingle();
  if (existing) return existing.id as string;

  const ticketId = crypto.randomUUID();
  const token = await signQrToken({ ticketId, bookingId, eventId });
  const { error } = await admin.from("tickets").insert({
    id: ticketId,
    booking_id: bookingId,
    qr_token: token,
    status: "valid",
  });
  if (error) {
    if (error.code === "23505") {
      // Lost a race — the other writer created it; return that one.
      const { data } = await admin
        .from("tickets")
        .select("id")
        .eq("booking_id", bookingId)
        .maybeSingle();
      if (data) return data.id as string;
    }
    throw error;
  }
  return ticketId;
}
