import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import { platformFeePaise } from "@/config/app";
import { issueTicketForBooking } from "@/lib/bookings";
import { sendTicketEmail } from "@/lib/notifications";

/** Create a booking: atomic pending row, then Razorpay order (paid) or
 *  immediate confirmation + ticket (free). Payment truth still comes from the
 *  webhook — the client is never trusted to mark a booking paid. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}) as Record<string, unknown>);
  const slug = String(body.slug ?? "");
  const seats = Number(body.seats ?? 1);
  const withAddon = Boolean(body.with_addon);
  const guestNames = Array.isArray(body.guest_names)
    ? body.guest_names.map((g: unknown) => String(g).trim()).slice(0, Math.max(1, seats))
    : [];
  const idempotencyKey = String(body.idempotency_key || crypto.randomUUID());

  if (!Number.isInteger(seats) || seats < 1 || seats > 20) {
    return NextResponse.json({ error: "Choose between 1 and 20 seats." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: ev } = await admin
    .from("events")
    .select("id, price, is_free, materials_addon_price, status, title")
    .eq("slug", slug)
    .maybeSingle();
  if (!ev || ev.status !== "published") {
    return NextResponse.json({ error: "Event is not open for booking." }, { status: 404 });
  }

  const addonPer = withAddon && ev.materials_addon_price ? ev.materials_addon_price : 0;
  const amount = ev.is_free ? 0 : seats * (ev.price + addonPer);
  const fee = ev.is_free ? 0 : platformFeePaise(amount); // organizer-absorbed

  const { data: rpc, error: rpcErr } = await admin.rpc("create_booking", {
    p_event_id: ev.id,
    p_user_id: user.id,
    p_seats: seats,
    p_guest_names: guestNames,
    p_amount: amount,
    p_platform_fee: fee,
    p_idempotency_key: idempotencyKey,
  });
  if (rpcErr) {
    const m = rpcErr.message || "";
    const msg = m.includes("sold_out")
      ? "Not enough seats left."
      : m.includes("event_not_bookable")
        ? "This event isn't open for booking."
        : "Could not create the booking.";
    return NextResponse.json({ error: msg }, { status: 409 });
  }
  const booking = Array.isArray(rpc) ? rpc[0] : rpc;

  // Free event: confirm and issue the ticket right away.
  if (ev.is_free) {
    await admin
      .from("bookings")
      .update({ payment_status: "paid" })
      .eq("id", booking.id)
      .eq("payment_status", "pending");
    const ticketId = await issueTicketForBooking(admin, booking.id, ev.id);
    await sendTicketEmail(admin, booking.id);
    return NextResponse.json({ bookingId: booking.id, status: "paid", ticketId });
  }

  // Paid event: create a Razorpay order.
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return NextResponse.json({ error: "Payments are not configured yet." }, { status: 503 });
  }
  const orderRes = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
    },
    body: JSON.stringify({
      amount,
      currency: "INR",
      receipt: booking.id,
      notes: { booking_id: booking.id, event_id: ev.id },
    }),
  });
  if (!orderRes.ok) {
    return NextResponse.json({ error: "Could not start payment." }, { status: 502 });
  }
  const order = (await orderRes.json()) as { id: string };
  await admin.from("bookings").update({ razorpay_order_id: order.id }).eq("id", booking.id);

  return NextResponse.json({
    bookingId: booking.id,
    status: "pending",
    razorpayOrderId: order.id,
    amount,
    keyId,
  });
}
