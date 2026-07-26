import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { userOrganizesEvent } from "@/lib/authz";
import { formatEventWhen } from "@/lib/datetime";
import { formatINR } from "@/lib/money";
import { ExportCsv } from "./export-csv";
import { CancelEventButton, RefundButton } from "./manage-actions";

export const metadata = { title: "Manage event" };

type Attendee = {
  bookingId: string;
  name: string;
  email: string;
  seats: number;
  guests: string;
  payment: string;
  checkedIn: boolean;
};

export default async function ManagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  if (!(await userOrganizesEvent(admin, user.id, id))) notFound();

  const { data: ev } = await admin
    .from("events")
    .select("id, slug, title, status, starts_at, ends_at, venue_name, capacity")
    .eq("id", id)
    .maybeSingle();
  if (!ev) notFound();

  const { data: bookings } = await admin
    .from("bookings")
    .select("id, attendee_user_id, seats, guest_names, amount, payment_status, created_at")
    .eq("event_id", id)
    .order("created_at", { ascending: true });
  const list = bookings ?? [];

  const userIds = [...new Set(list.map((b) => b.attendee_user_id))];
  const { data: users } = userIds.length
    ? await admin.from("users").select("id, name, email").in("id", userIds)
    : { data: [] as { id: string; name: string | null; email: string | null }[] };
  const nameById = new Map((users ?? []).map((u) => [u.id, u.name]));
  const emailById = new Map((users ?? []).map((u) => [u.id, u.email]));

  const bookingIds = list.map((b) => b.id);
  const { data: tickets } = bookingIds.length
    ? await admin.from("tickets").select("booking_id, status").in("booking_id", bookingIds)
    : { data: [] as { booking_id: string; status: string }[] };
  const ticketStatusByBooking = new Map(
    (tickets ?? []).map((t) => [t.booking_id, t.status]),
  );

  const attendees: Attendee[] = list.map((b) => ({
    bookingId: b.id,
    name: nameById.get(b.attendee_user_id) ?? "—",
    email: emailById.get(b.attendee_user_id) ?? "",
    seats: b.seats as number,
    guests: Array.isArray(b.guest_names)
      ? (b.guest_names as string[]).filter(Boolean).join("; ")
      : "",
    payment: b.payment_status as string,
    checkedIn: ticketStatusByBooking.get(b.id) === "checked_in",
  }));

  const paid = list.filter((b) => b.payment_status === "paid");
  const bookedSeats = paid.reduce((s, b) => s + (Number(b.seats) || 0), 0);
  const revenue = paid.reduce((s, b) => s + (Number(b.amount) || 0), 0);
  const checkedIn = (tickets ?? []).filter((t) => t.status === "checked_in").length;

  const headers = ["Name", "Email", "Seats", "Guests", "Payment", "Checked in"];
  const csvRows = attendees.map((a) => ({
    Name: a.name,
    Email: a.email,
    Seats: a.seats,
    Guests: a.guests,
    Payment: a.payment,
    "Checked in": a.checkedIn ? "Yes" : "No",
  }));

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <Link href="/dashboard" className="text-sm text-muted transition-colors hover:text-cream">
        ← Dashboard
      </Link>
      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl text-cream">{ev.title}</h1>
          <p className="mt-1 text-sm text-muted">
            {formatEventWhen(ev.starts_at, ev.ends_at)}
            {ev.venue_name ? ` · ${ev.venue_name}` : ""}
          </p>
          <p className="mt-1 text-xs uppercase tracking-wide text-muted">{ev.status}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          {ev.status !== "cancelled" && (
            <Link
              href={`/organizer/events/${ev.id}/checkin`}
              className="rounded-full bg-gold px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-saffron"
            >
              Check-in
            </Link>
          )}
          {ev.status !== "cancelled" && ev.status !== "completed" && (
            <CancelEventButton eventId={ev.id} />
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-border bg-surface p-4 text-center">
          <p className="font-display text-2xl text-gold">
            {bookedSeats}
            {ev.capacity != null ? `/${ev.capacity}` : ""}
          </p>
          <p className="text-xs text-muted">Seats booked</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4 text-center">
          <p className="font-display text-2xl text-gold">{checkedIn}</p>
          <p className="text-xs text-muted">Checked in</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4 text-center">
          <p className="font-display text-2xl text-gold">{formatINR(revenue)}</p>
          <p className="text-xs text-muted">Revenue</p>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Attendees ({attendees.length})
        </h2>
        {attendees.length > 0 && (
          <ExportCsv
            rows={csvRows}
            headers={headers}
            filename={`${ev.slug ?? "event"}-attendees.csv`}
          />
        )}
      </div>

      {attendees.length === 0 ? (
        <p className="mt-3 text-sm text-muted">No bookings yet.</p>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="p-3">Attendee</th>
                <th className="p-3">Seats</th>
                <th className="p-3">Payment</th>
                <th className="p-3">In</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {attendees.map((a) => (
                <tr key={a.bookingId} className="border-t border-border">
                  <td className="p-3">
                    <p className="text-cream">{a.name}</p>
                    {a.email && <p className="text-xs text-muted">{a.email}</p>}
                    {a.guests && <p className="text-xs text-muted">Guests: {a.guests}</p>}
                  </td>
                  <td className="p-3 text-muted">{a.seats}</td>
                  <td className="p-3 text-muted">{a.payment}</td>
                  <td className="p-3">
                    {a.checkedIn ? (
                      <span className="text-emerald-400">✓</span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    {a.payment === "paid" ? (
                      <RefundButton bookingId={a.bookingId} />
                    ) : a.payment === "refunded" ? (
                      <span className="text-xs text-muted">Refunded</span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
