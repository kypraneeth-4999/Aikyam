import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { formatEventWhen } from "@/lib/datetime";
import { SITE_URL } from "@/config/app";

type Admin = ReturnType<typeof createAdminClient>;

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function shell(inner: string): string {
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#14102a;">${inner}<p style="color:#999;font-size:12px;margin-top:24px;">— Aikyam</p></div>`;
}

function ticketEmailHtml(o: {
  name: string | null;
  title: string;
  when: string;
  venue: string | null;
  seats: number;
  ticketUrl: string;
}): string {
  return shell(`
    <h1 style="font-size:20px;margin:0 0 4px;">You're booked! 🎉</h1>
    <p style="color:#666;margin:0 0 20px;">Hi ${esc(o.name ?? "there")}, your ticket for <strong>${esc(o.title)}</strong> is ready.</p>
    <div style="border:1px solid #eee;border-radius:12px;padding:16px;margin-bottom:20px;">
      <p style="margin:0 0 6px;font-weight:600;">${esc(o.title)}</p>
      <p style="margin:0 0 4px;color:#555;">${esc(o.when)}</p>
      ${o.venue ? `<p style="margin:0 0 4px;color:#555;">${esc(o.venue)}</p>` : ""}
      <p style="margin:0;color:#555;">${o.seats} seat${o.seats === 1 ? "" : "s"}</p>
    </div>
    <a href="${o.ticketUrl}" style="display:inline-block;background:#F4A01C;color:#0B0914;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:999px;">View your ticket &amp; QR</a>
    <p style="color:#999;font-size:12px;margin-top:16px;">Show the QR code at the door.</p>`);
}

function cancellationHtml(o: {
  name: string | null;
  title: string;
  refundNote: string;
}): string {
  return shell(`
    <h1 style="font-size:20px;margin:0 0 4px;">Booking cancelled</h1>
    <p style="color:#666;margin:0 0 12px;">Hi ${esc(o.name ?? "there")}, your booking for <strong>${esc(o.title)}</strong> has been cancelled.</p>
    ${o.refundNote ? `<p style="color:#555;margin:0 0 12px;">${esc(o.refundNote)}</p>` : ""}
    <p style="color:#555;margin:0;">We're sorry for the inconvenience.</p>`);
}

/** Best-effort booking-confirmation email with the ticket link. Never throws. */
export async function sendTicketEmail(admin: Admin, bookingId: string): Promise<void> {
  try {
    const { data: booking } = await admin
      .from("bookings")
      .select("id, attendee_user_id, event_id, seats")
      .eq("id", bookingId)
      .maybeSingle();
    if (!booking) return;

    const [{ data: ticket }, { data: user }, { data: ev }] = await Promise.all([
      admin.from("tickets").select("id").eq("booking_id", bookingId).maybeSingle(),
      admin.from("users").select("email, name").eq("id", booking.attendee_user_id).maybeSingle(),
      admin
        .from("events")
        .select("title, starts_at, ends_at, venue_name")
        .eq("id", booking.event_id)
        .maybeSingle(),
    ]);
    if (!ticket || !user?.email || !ev) return;

    const siteUrl = SITE_URL;
    await sendEmail({
      to: user.email,
      subject: `Your ticket for ${ev.title}`,
      html: ticketEmailHtml({
        name: user.name,
        title: ev.title,
        when: formatEventWhen(ev.starts_at, ev.ends_at),
        venue: ev.venue_name,
        seats: booking.seats,
        ticketUrl: `${siteUrl}/tickets/${ticket.id}`,
      }),
    });
  } catch (e) {
    console.error("[notifications] sendTicketEmail error:", e);
  }
}

/** Best-effort cancellation/refund email. Never throws. */
export async function sendCancellationEmail(admin: Admin, bookingId: string): Promise<void> {
  try {
    const { data: booking } = await admin
      .from("bookings")
      .select("attendee_user_id, event_id, amount")
      .eq("id", bookingId)
      .maybeSingle();
    if (!booking) return;

    const [{ data: user }, { data: ev }] = await Promise.all([
      admin.from("users").select("email, name").eq("id", booking.attendee_user_id).maybeSingle(),
      admin.from("events").select("title").eq("id", booking.event_id).maybeSingle(),
    ]);
    if (!user?.email || !ev) return;

    const refundNote =
      Number(booking.amount) > 0
        ? "A full refund has been issued and should reflect in 5–7 business days."
        : "";
    await sendEmail({
      to: user.email,
      subject: `Cancelled: ${ev.title}`,
      html: cancellationHtml({ name: user.name, title: ev.title, refundNote }),
    });
  } catch (e) {
    console.error("[notifications] sendCancellationEmail error:", e);
  }
}

/**
 * Best-effort event reminder email (24h / 3h before start). Never throws.
 * Returns true only if an email was actually sent.
 */
export async function sendReminderEmail(
  admin: Admin,
  bookingId: string,
  kind: "reminder_24h" | "reminder_3h",
): Promise<boolean> {
  try {
    const { data: booking } = await admin
      .from("bookings")
      .select("attendee_user_id, event_id, seats")
      .eq("id", bookingId)
      .maybeSingle();
    if (!booking) return false;

    const [{ data: ticket }, { data: user }, { data: ev }] = await Promise.all([
      admin.from("tickets").select("id").eq("booking_id", bookingId).maybeSingle(),
      admin.from("users").select("email, name").eq("id", booking.attendee_user_id).maybeSingle(),
      admin
        .from("events")
        .select("title, starts_at, ends_at, venue_name, maps_url, landmark, what_to_bring")
        .eq("id", booking.event_id)
        .maybeSingle(),
    ]);
    if (!ticket || !user?.email || !ev) return false;

    const soon = kind === "reminder_3h" ? "in about 3 hours" : "tomorrow";
    const heading = kind === "reminder_3h" ? "Starting soon ⏰" : "See you tomorrow 👋";
    const ticketUrl = `${SITE_URL}/tickets/${ticket.id}`;

    return await sendEmail({
      to: user.email,
      subject: `Reminder: ${ev.title} is ${soon}`,
      html: shell(`
        <h1 style="font-size:20px;margin:0 0 4px;">${heading}</h1>
        <p style="color:#666;margin:0 0 16px;">Hi ${esc(user.name ?? "there")}, <strong>${esc(ev.title)}</strong> starts ${soon}.</p>
        <div style="border:1px solid #eee;border-radius:12px;padding:16px;margin-bottom:20px;">
          <p style="margin:0 0 4px;color:#555;">${esc(formatEventWhen(ev.starts_at, ev.ends_at))}</p>
          ${ev.venue_name ? `<p style="margin:0 0 4px;color:#555;">${esc(ev.venue_name)}${ev.landmark ? ` · ${esc(ev.landmark)}` : ""}</p>` : ""}
          <p style="margin:0;color:#555;">${booking.seats} seat${booking.seats === 1 ? "" : "s"}</p>
          ${ev.what_to_bring ? `<p style="margin:8px 0 0;color:#555;"><strong>Bring:</strong> ${esc(ev.what_to_bring)}</p>` : ""}
        </div>
        <a href="${ticketUrl}" style="display:inline-block;background:#F4A01C;color:#0B0914;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:999px;">Open your ticket</a>
        ${ev.maps_url ? `<p style="margin:16px 0 0;"><a href="${ev.maps_url}" style="color:#666;font-size:13px;">Get directions</a></p>` : ""}`),
    });
  } catch (e) {
    console.error("[notifications] sendReminderEmail error:", e);
    return false;
  }
}

/** Best-effort co-organiser invite email. Never throws. */
export async function sendCoorganizerInvite(
  admin: Admin,
  eventId: string,
  invitedUserId: string,
): Promise<void> {
  try {
    const [{ data: user }, { data: ev }] = await Promise.all([
      admin.from("users").select("email, name").eq("id", invitedUserId).maybeSingle(),
      admin.from("events").select("title").eq("id", eventId).maybeSingle(),
    ]);
    if (!user?.email || !ev) return;
    const siteUrl = SITE_URL;
    await sendEmail({
      to: user.email,
      subject: `Invite to co-organise ${ev.title}`,
      html: shell(`
        <h1 style="font-size:20px;margin:0 0 4px;">Co-organiser invite</h1>
        <p style="color:#666;margin:0 0 16px;">Hi ${esc(user.name ?? "there")}, you've been invited to co-organise <strong>${esc(ev.title)}</strong> on Aikyam.</p>
        <a href="${siteUrl}/dashboard" style="display:inline-block;background:#F4A01C;color:#0B0914;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:999px;">Review invite</a>`),
    });
  } catch (e) {
    console.error("[notifications] sendCoorganizerInvite error:", e);
  }
}
