import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, supabaseConfigured } from "@/lib/auth";
import { formatEventWhen } from "@/lib/datetime";
import { BookingForm } from "./booking-form";

export const metadata = { title: "Book" };

export default async function BookPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!supabaseConfigured()) notFound();

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: ev } = await supabase
    .from("events")
    .select(
      "id, slug, title, starts_at, ends_at, price, is_free, materials, materials_addon_price, capacity, status",
    )
    .eq("slug", slug)
    .maybeSingle();
  if (!ev || ev.status !== "published") notFound();

  const admin = createAdminClient();
  const [{ data: paid }, { data: profile }] = await Promise.all([
    admin.from("bookings").select("seats").eq("event_id", ev.id).eq("payment_status", "paid"),
    admin.from("users").select("name").eq("id", user.id).maybeSingle(),
  ]);
  const taken = (paid ?? []).reduce((s, b) => s + (Number(b.seats) || 0), 0);
  const seatsLeft = ev.capacity != null ? Math.max(0, ev.capacity - taken) : 99;

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-6 py-10">
      <Link href={`/e/${ev.slug}`} className="text-sm text-zinc-500 underline">
        ← Back to event
      </Link>
      <h1 className="mt-3 text-xl font-semibold tracking-tight">{ev.title}</h1>
      <p className="mt-1 text-sm text-zinc-500">
        {formatEventWhen(ev.starts_at, ev.ends_at)}
      </p>

      {seatsLeft <= 0 ? (
        <p className="mt-8 rounded-lg border border-black/10 p-4 text-sm dark:border-white/15">
          This event is sold out.
        </p>
      ) : (
        <BookingForm
          slug={ev.slug}
          eventTitle={ev.title}
          isFree={ev.is_free}
          price={ev.price}
          materials={ev.materials}
          addonPrice={ev.materials_addon_price}
          maxSeats={Math.min(seatsLeft, 20)}
          defaultName={profile?.name ?? ""}
        />
      )}
    </main>
  );
}
