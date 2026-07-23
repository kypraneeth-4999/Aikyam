import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { organizerProfileId } from "@/lib/authz";
import { formatEventShort } from "@/lib/datetime";
import { formatINR } from "@/lib/money";

export const metadata = { title: "Dashboard" };

type Row = {
  id: string;
  slug: string | null;
  title: string;
  status: string;
  starts_at: string | null;
  capacity: number | null;
  booked: number;
  revenue: number;
};

function EventRow({ e }: { e: Row }) {
  return (
    <Link
      href={`/organizer/events/${e.id}`}
      className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-gold/30"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-cream">{e.title}</p>
        <p className="text-xs text-muted">{formatEventShort(e.starts_at)}</p>
      </div>
      <div className="shrink-0 text-right text-xs">
        <p className="text-cream">
          {e.booked}
          {e.capacity != null ? ` / ${e.capacity}` : ""} booked
        </p>
        <p className="text-gold">{formatINR(e.revenue)}</p>
      </div>
    </Link>
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
        {rows.map((e) => (
          <EventRow key={e.id} e={e} />
        ))}
      </div>
    </section>
  );
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const orgId = await organizerProfileId(admin, user.id);
  if (!orgId) redirect("/organizer/new");

  const { data: links } = await admin
    .from("event_organizers")
    .select("event_id")
    .eq("organizer_id", orgId);
  const ids = (links ?? []).map((l) => l.event_id as string);

  let events: Row[] = [];
  if (ids.length) {
    const { data: evs } = await admin
      .from("events")
      .select("id, slug, title, status, starts_at, capacity")
      .in("id", ids);
    const { data: bks } = await admin
      .from("bookings")
      .select("event_id, seats, amount")
      .in("event_id", ids)
      .eq("payment_status", "paid");

    const stats = new Map<string, { booked: number; revenue: number }>();
    for (const b of bks ?? []) {
      const s = stats.get(b.event_id) ?? { booked: 0, revenue: 0 };
      s.booked += Number(b.seats) || 0;
      s.revenue += Number(b.amount) || 0;
      stats.set(b.event_id, s);
    }
    events = (evs ?? []).map((e) => ({
      ...e,
      booked: stats.get(e.id)?.booked ?? 0,
      revenue: stats.get(e.id)?.revenue ?? 0,
    })) as Row[];
  }

  const now = Date.now();
  const isPast = (e: Row) =>
    e.status === "completed" ||
    (e.starts_at ? new Date(e.starts_at).getTime() < now : false);
  const upcoming = events
    .filter((e) => e.status === "published" && !isPast(e))
    .sort((a, b) => (a.starts_at ?? "").localeCompare(b.starts_at ?? ""));
  const drafts = events.filter((e) => e.status === "draft");
  const past = events.filter((e) => e.status !== "draft" && e.status !== "cancelled" && isPast(e));
  const cancelled = events.filter((e) => e.status === "cancelled");

  const totalRevenue = events.reduce((s, e) => s + e.revenue, 0);
  const totalBooked = events.reduce((s, e) => s + e.booked, 0);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl text-cream">Dashboard</h1>
        <Link
          href="/organizer/events/new"
          className="rounded-full bg-gold px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-saffron"
        >
          Create event
        </Link>
      </div>

      {events.length > 0 && (
        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-border bg-surface p-4 text-center">
            <p className="font-display text-2xl text-gold">{events.length}</p>
            <p className="text-xs text-muted">Events</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-4 text-center">
            <p className="font-display text-2xl text-gold">{totalBooked}</p>
            <p className="text-xs text-muted">Seats booked</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-4 text-center">
            <p className="font-display text-2xl text-gold">{formatINR(totalRevenue)}</p>
            <p className="text-xs text-muted">Revenue</p>
          </div>
        </div>
      )}

      {events.length === 0 && (
        <p className="mt-10 text-sm text-muted">
          No events yet. Create your first one to get started.
        </p>
      )}

      <Section title="Upcoming" rows={upcoming} />
      <Section title="Drafts" rows={drafts} />
      <Section title="Past" rows={past} />
      <Section title="Cancelled" rows={cancelled} />
    </main>
  );
}
