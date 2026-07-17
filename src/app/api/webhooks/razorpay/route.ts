import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { issueTicketForBooking } from "@/lib/bookings";

/**
 * Razorpay webhook — the SINGLE source of payment truth (JAD §6.5).
 * Verifies the HMAC signature over the raw body, then marks the booking paid and
 * issues its ticket. Idempotent. Never trusts a client "success" callback.
 */
export async function POST(request: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }

  const raw = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  let event: {
    event?: string;
    payload?: {
      payment?: { entity?: { id?: string; order_id?: string } };
      order?: { entity?: { id?: string } };
    };
  };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const type = event.event;
  let orderId: string | undefined;
  let paymentId: string | undefined;
  if (type === "payment.captured" || type === "payment.authorized") {
    paymentId = event.payload?.payment?.entity?.id;
    orderId = event.payload?.payment?.entity?.order_id;
  } else if (type === "order.paid") {
    orderId = event.payload?.order?.entity?.id;
    paymentId = event.payload?.payment?.entity?.id;
  } else {
    return NextResponse.json({ ignored: type ?? "unknown" });
  }
  if (!orderId) return NextResponse.json({ ignored: "no order id" });

  const admin = createAdminClient();
  const { data: booking } = await admin
    .from("bookings")
    .select("id, event_id, payment_status")
    .eq("razorpay_order_id", orderId)
    .maybeSingle();
  // Ack even if unknown, so Razorpay stops retrying a payload we can't match.
  if (!booking) return NextResponse.json({ ok: true, note: "no matching booking" });

  if (booking.payment_status !== "paid") {
    await admin
      .from("bookings")
      .update({ payment_status: "paid", razorpay_payment_id: paymentId ?? null })
      .eq("id", booking.id)
      .eq("payment_status", "pending");
    await issueTicketForBooking(admin, booking.id, booking.event_id);
    await admin.from("audit_logs").insert({
      actor_user_id: null,
      action: "booking.paid",
      entity_type: "booking",
      entity_id: booking.id,
      metadata: { razorpay_order_id: orderId, razorpay_payment_id: paymentId ?? null },
    });
  }

  return NextResponse.json({ ok: true });
}
