import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatEventWhen } from "@/lib/datetime";
import { ReviewForm } from "@/components/review-form";

export const metadata = { title: "My tickets" };

type Row = {
  bookingId: string;
  ticketId: string | null;
  slug: string | null;
  title: string;
  startsAt: string | null;
  endsAt: string | null;
  venue: string | null;
  seats: number;
  payment: string;
  eventStatus: string;
  ticketStatus: string | null;
  reviewEligible: boolean;
};

function group(rows: Row[]) {
  const now = Date.now();
  const cancelled: Row[] = [];
  const upcoming: Row[] = [];
  const past: Row[] = [];
  for (const r of rows) {
    const isCancelled =
      r.payment === "refunded" ||
      r.payment === "cancelled" ||
      r.eventStatus === "cancelled";
    if (isCancelled) cancelled.push(r);
    else if (r.startsAt && new Date(r.startsAt).getTime() >= now) upcoming.push(r);
    else past.push(r);
  }
  return { upcoming, past, cancelled };
}

function TicketRow({ r }: { r: Row }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-cream">{r.title}</p>
          <p className="text-xs text-muted">
            {formatEventWhen(r.startsAt, r.endsAt)}
            {r.venue ? ` · ${r.venue}` : ""}
          </p>
          <p className="mt-1 text-xs text-muted">
            {r.seats} seat{r.seats === 1 ? "" : "s"}
            {r.ticketStatus === "checked_in" ? " · checked in" : ""}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1 text-sm">
          {r.ticketId && r.payment === "paid" ? (
            <Link href={`/tickets/${r.ticketId}`} className="font-medium text-gold hover:text-saffron">
              View ticket
            </Link>
          ) : (
            <span className="text-xs text-muted">
              {r.payment === "refunded" ? "Refunded" : r.payment}
            </span>
          )}
          {r.slug && (
            <Link href={`/e/${r.slug}`} className="text-xs text-muted hover:text-cream">
              Event
            </Link>
          )}
        </div>
      </div>
      {r.reviewEligible && (
        <div className="mt-3 border-t border-border pt-3">
          <ReviewForm bookingId={r.bookingId} />
        </div>
      )}
    </div>
  );
}

function Section({ title, rows }: { title: string; rows: Row[] }) {
  if (rows.length === 0) return null;
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
        {title}
      </h2>
      <div className="space-y-2">
        {rows.map((r) => (
          <TicketRow key={r.bookingId} r={r} />
        ))}
      </div>
    </section>
  );
}

export default async function MyTicketsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: bookings } = await admin
    .from("bookings")
    .select("id, event_id, seats, payment_status, created_at")
    .eq("attendee_user_id", user.id)
    .order("created_at", { ascending: false });
  const list = bookings ?? [];

  const eventIds = [...new Set(list.map((b) => b.event_id))];
  const { data: events } = eventIds.length
    ? await admin
        .from("events")
        .select("id, slug, title, starts_at, ends_at, venue_name, status")
        .in("id", eventIds)
    : { data: [] as Record<string, unknown>[] };
  const evById = new Map((events ?? []).map((e) => [e.id as string, e]));

  const bookingIds = list.map((b) => b.id);
  const { data: tickets } = bookingIds.length
    ? await admin.from("tickets").select("id, booking_id, status").in("booking_id", bookingIds)
    : { data: [] as { id: string; booking_id: string; status: string }[] };
  const ticketByBooking = new Map((tickets ?? []).map((t) => [t.booking_id, t]));

  const { data: reviews } = bookingIds.length
    ? await admin.from("reviews").select("booking_id").in("booking_id", bookingIds)
    : { data: [] as { booking_id: string }[] };
  const reviewed = new Set((reviews ?? []).map((r) => r.booking_id));

  const rows: Row[] = list.map((b) => {
    const e = evById.get(b.event_id) as Record<string, unknown> | undefined;
    const t = ticketByBooking.get(b.id);
    return {
      bookingId: b.id,
      ticketId: t?.id ?? null,
      slug: (e?.slug as string) ?? null,
      title: (e?.title as string) ?? "Event",
      startsAt: (e?.starts_at as string) ?? null,
      endsAt: (e?.ends_at as string) ?? null,
      venue: (e?.venue_name as string) ?? null,
      seats: b.seats as number,
      payment: b.payment_status as string,
      eventStatus: (e?.status as string) ?? "published",
      ticketStatus: t?.status ?? null,
      reviewEligible: t?.status === "checked_in" && !reviewed.has(b.id),
    };
  });

  const { upcoming, past, cancelled } = group(rows);

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-6 py-10">
      <h1 className="font-display text-3xl text-cream">My tickets</h1>
      {rows.length === 0 ? (
        <p className="mt-8 text-sm text-muted">
          No bookings yet.{" "}
          <Link href="/" className="text-gold hover:text-saffron">
            Discover events →
          </Link>
        </p>
      ) : (
        <>
          <Section title="Upcoming" rows={upcoming} />
          <Section title="Past" rows={past} />
          <Section title="Cancelled" rows={cancelled} />
        </>
      )}
    </main>
  );
}
