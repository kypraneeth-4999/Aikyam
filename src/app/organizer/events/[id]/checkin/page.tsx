import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { userOrganizesEvent } from "@/lib/authz";
import { CheckinScanner } from "./checkin-scanner";

export const metadata = { title: "Check-in" };

export default async function CheckinPage({
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
    .select("id, title")
    .eq("id", id)
    .maybeSingle();
  if (!ev) notFound();

  const { count } = await admin
    .from("tickets")
    .select("id, bookings!inner(event_id)", { count: "exact", head: true })
    .eq("status", "checked_in")
    .eq("bookings.event_id", id);

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-6 py-10">
      <Link
        href={`/organizer/events/${id}`}
        className="text-sm text-muted transition-colors hover:text-cream"
      >
        ← Back to event
      </Link>
      <h1 className="mt-3 font-display text-2xl text-cream">Check-in</h1>
      <p className="mt-1 text-sm text-muted">{ev.title}</p>
      <CheckinScanner eventId={id} initialCount={count ?? 0} />
    </main>
  );
}
