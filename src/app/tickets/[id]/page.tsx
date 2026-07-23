import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, supabaseConfigured } from "@/lib/auth";
import { qrDataUrl } from "@/lib/tickets";
import { formatEventWhen } from "@/lib/datetime";
import { googleCalUrl, icsDataUri } from "@/lib/ics";

export const metadata = { title: "Your ticket" };

export default async function TicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!supabaseConfigured()) notFound();

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: ticket } = await admin
    .from("tickets")
    .select("id, qr_token, status, checked_in_at, booking_id")
    .eq("id", id)
    .maybeSingle();
  if (!ticket) notFound();

  const { data: booking } = await admin
    .from("bookings")
    .select("id, attendee_user_id, event_id, seats, guest_names")
    .eq("id", ticket.booking_id)
    .maybeSingle();
  if (!booking || booking.attendee_user_id !== user.id) notFound();

  const { data: ev } = await admin
    .from("events")
    .select("title, slug, starts_at, ends_at, venue_name, maps_url, landmark, description")
    .eq("id", booking.event_id)
    .maybeSingle();

  const qr = await qrDataUrl(ticket.qr_token);
  const guests = Array.isArray(booking.guest_names)
    ? (booking.guest_names as string[]).filter(Boolean)
    : [];

  const cal = ev
    ? {
        uid: ticket.id,
        title: ev.title,
        description: ev.description,
        location: ev.venue_name,
        start: ev.starts_at as string,
        end: ev.ends_at as string | null,
      }
    : null;

  const statusLabel =
    ticket.status === "checked_in"
      ? "Checked in"
      : ticket.status === "cancelled"
        ? "Cancelled"
        : "Valid";

  const calBtn =
    "rounded-xl border border-border bg-surface px-3 py-2 text-center text-sm font-medium text-cream transition-colors hover:border-gold/30";

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-6 py-10">
      <div className="rounded-2xl border border-border bg-surface p-6 text-center">
        <span
          className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
            ticket.status === "valid"
              ? "bg-emerald-600/25 text-emerald-300"
              : "bg-surface2 text-muted"
          }`}
        >
          {statusLabel}
        </span>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qr}
          alt="Ticket QR code"
          width={240}
          height={240}
          className="mx-auto mt-4 h-60 w-60 rounded-xl bg-white p-2"
        />

        <h1 className="mt-4 font-display text-xl text-cream">{ev?.title}</h1>
        <p className="mt-1 text-sm text-muted">
          {formatEventWhen(ev?.starts_at ?? null, ev?.ends_at ?? null)}
        </p>
        {ev?.venue_name && (
          <p className="mt-1 text-sm text-muted">
            {ev.venue_name}
            {ev.landmark ? ` · ${ev.landmark}` : ""}
          </p>
        )}
        <p className="mt-3 text-sm text-cream">
          {booking.seats} seat{booking.seats === 1 ? "" : "s"}
        </p>
        {guests.length > 0 && (
          <p className="text-xs text-muted">{guests.join(", ")}</p>
        )}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        {cal && (
          <a href={googleCalUrl(cal)} target="_blank" rel="noopener noreferrer" className={calBtn}>
            Add to Calendar
          </a>
        )}
        {cal && (
          <a href={icsDataUri(cal)} download={`${ev?.slug ?? "event"}.ics`} className={calBtn}>
            Download .ics
          </a>
        )}
        {ev?.maps_url && (
          <a
            href={ev.maps_url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className={`col-span-2 ${calBtn}`}
          >
            Get directions
          </a>
        )}
      </div>

      <p className="mt-4 text-center text-xs text-muted">
        Show this QR at the door. WhatsApp + email delivery arrive in a later slice.
      </p>
      {ev?.slug && (
        <p className="mt-2 text-center">
          <Link href={`/e/${ev.slug}`} className="text-sm text-gold transition-colors hover:text-saffron">
            View event
          </Link>
        </p>
      )}
    </main>
  );
}
