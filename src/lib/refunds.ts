import { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

/**
 * Refund a booking: issue a Razorpay refund when a payment + keys exist,
 * then mark the booking refunded, cancel its ticket, and write an AuditLog.
 * Idempotent. Free bookings (no payment) just get marked/cancelled.
 */
export async function refundBooking(
  admin: Admin,
  bookingId: string,
  actorUserId: string | null,
): Promise<{ ok: boolean; error?: string }> {
  const { data: booking } = await admin
    .from("bookings")
    .select("id, payment_status, razorpay_payment_id, amount")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking) return { ok: false, error: "not_found" };
  if (booking.payment_status === "refunded" || booking.payment_status === "cancelled") {
    return { ok: true };
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  let refundId: string | null = null;

  if (booking.razorpay_payment_id && keyId && keySecret) {
    try {
      const res = await fetch(
        `https://api.razorpay.com/v1/payments/${booking.razorpay_payment_id}/refund`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
          },
          body: JSON.stringify({}),
        },
      );
      if (!res.ok) return { ok: false, error: "razorpay_refund_failed" };
      const d = (await res.json()) as { id?: string };
      refundId = d.id ?? null;
    } catch {
      return { ok: false, error: "razorpay_error" };
    }
  }

  await admin.from("bookings").update({ payment_status: "refunded" }).eq("id", booking.id);
  await admin.from("tickets").update({ status: "cancelled" }).eq("booking_id", booking.id);
  await admin.from("audit_logs").insert({
    actor_user_id: actorUserId,
    action: "booking.refunded",
    entity_type: "booking",
    entity_id: booking.id,
    metadata: { razorpay_refund_id: refundId, amount: booking.amount },
  });
  return { ok: true };
}
