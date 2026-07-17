import type { Metadata } from "next";
import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { supabaseConfigured } from "@/lib/auth";
import { formatINR } from "@/lib/money";
import { formatEventWhen } from "@/lib/datetime";

type EventRow = {
  id: string;
  slug: string;
  title: string;
  category: string;
  description: string | null;
  starts_at: string | null;
  ends_at: string | null;
  venue_name: string | null;
  maps_url: string | null;
  landmark: string | null;
  capacity: number | null;
  price: number;
  is_free: boolean;
  cover_media: string | null;
  photos: string[] | null;
  what_to_bring: string | null;
  materials: "included" | "byo";
  materials_addon_price: number | null;
  cancellation_policy: string | null;
  languages: string[] | null;
  age_suitability: string | null;
  tags: string[] | null;
  status: "draft" | "published" | "cancelled" | "completed";
};

type Host = { handle: string; name: string; verified: boolean };

const fetchEvent = cache(async (slug: string) => {
  if (!supabaseConfigured()) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (!data) return null;
  const ev = data as EventRow;

  // Host (primary organizer). event_organizers + organizer_profiles are public;
  // the display name lives behind RLS, so read it with the service-role client.
  const admin = createAdminClient();
  let host: Host | null = null;
  const { data: eo } = await admin
    .from("event_organizers")
    .select("organizer_id")
    .eq("event_id", ev.id)
    .eq("role", "primary")
    .maybeSingle();
  if (eo) {
    const { data: op } = await admin
      .from("organizer_profiles")
      .select("handle, user_id, verification_status")
      .eq("id", eo.organizer_id)
      .maybeSingle();
    if (op) {
      const { data: u } = await admin
        .from("users")
        .select("name")
        .eq("id", op.user_id)
        .maybeSingle();
      host = {
        handle: op.handle,
        name: u?.name ?? op.handle,
        verified: op.verification_status === "verified",
      };
    }
  }

  // seats_left = capacity − paid seats (server truth; bookings are RLS-guarded).
  const { data: paid } = await admin
    .from("bookings")
    .select("seats")
    .eq("event_id", ev.id)
    .eq("payment_status", "paid");
  const taken = (paid ?? []).reduce(
    (sum, b) => sum + (Number(b.seats) || 0),
    0,
  );
  const seatsLeft = ev.capacity != null ? Math.max(0, ev.capacity - taken) : null;

  return { ev, host, seatsLeft };
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = await fetchEvent(slug);
  if (!result) return { title: "Event not found" };
  const { ev } = result;
  const priceLabel = ev.is_free ? "Free" : formatINR(ev.price);
  const description =
    ev.description ??
    `${priceLabel} · ${formatEventWhen(ev.starts_at, ev.ends_at)}`;
  const images = ev.cover_media
    ? [ev.cover_media]
    : ev.photos && ev.photos.length
      ? [ev.photos[0]]
      : undefined;
  return {
    title: ev.title,
    description,
    openGraph: {
      title: `${ev.title} · Aikyam`,
      description,
      type: "website",
      url: `/e/${ev.slug}`,
      images,
    },
    twitter: {
      card: images ? "summary_large_image" : "summary",
      title: `${ev.title} · Aikyam`,
      description,
      images,
    },
  };
}

export default async function EventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await fetchEvent(slug);
  if (!result) notFound();
  const { ev, host, seatsLeft } = result;

  const isCancelled = ev.status === "cancelled";
  const isPast =
    ev.status === "completed" ||
    (ev.starts_at ? new Date(ev.starts_at).getTime() < Date.now() : false);
  const soldOut = seatsLeft !== null && seatsLeft <= 0;
  const priceLabel = ev.is_free ? "Free" : formatINR(ev.price);

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-6 py-10">
      {/* Cover placeholder (media upload arrives later in this slice) */}
      <div className="flex aspect-[16/9] w-full items-center justify-center rounded-xl bg-zinc-100 text-sm text-zinc-400 dark:bg-zinc-900">
        {ev.category}
      </div>

      <div className="mt-5 flex items-center gap-2 text-xs">
        <span className="rounded-full bg-zinc-100 px-2 py-1 font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          {ev.category}
        </span>
        {isCancelled && (
          <span className="rounded-full bg-red-100 px-2 py-1 font-medium text-red-700 dark:bg-red-950/50 dark:text-red-300">
            Cancelled
          </span>
        )}
        {!isCancelled && isPast && (
          <span className="rounded-full bg-zinc-200 px-2 py-1 font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
            Ended
          </span>
        )}
      </div>

      <h1 className="mt-3 text-2xl font-semibold tracking-tight">{ev.title}</h1>

      <div className="mt-3 space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
        <p>{formatEventWhen(ev.starts_at, ev.ends_at)}</p>
        {ev.venue_name && (
          <p>
            {ev.maps_url ? (
              <a href={ev.maps_url} target="_blank" rel="noopener noreferrer nofollow" className="underline">
                {ev.venue_name}
              </a>
            ) : (
              ev.venue_name
            )}
            {ev.landmark ? ` · ${ev.landmark}` : ""}
          </p>
        )}
      </div>

      {host && (
        <Link
          href={`/@${host.handle}`}
          className="mt-4 flex items-center gap-3 rounded-lg border border-black/10 p-3 dark:border-white/15"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-200 text-sm font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            {host.name.slice(0, 1).toUpperCase()}
          </div>
          <div className="text-sm">
            <p className="font-medium">
              {host.name}
              {host.verified ? " ✓" : ""}
            </p>
            <p className="text-zinc-500">@{host.handle}</p>
          </div>
        </Link>
      )}

      {ev.description && (
        <p className="mt-5 whitespace-pre-line text-sm leading-6 text-zinc-700 dark:text-zinc-300">
          {ev.description}
        </p>
      )}

      <dl className="mt-5 space-y-2 text-sm">
        {ev.what_to_bring && (
          <div>
            <dt className="font-medium">What to bring</dt>
            <dd className="text-zinc-600 dark:text-zinc-400">{ev.what_to_bring}</dd>
          </div>
        )}
        <div>
          <dt className="font-medium">Materials</dt>
          <dd className="text-zinc-600 dark:text-zinc-400">
            {ev.materials === "included"
              ? "Included"
              : `Bring your own${
                  ev.materials_addon_price
                    ? ` (add-on ${formatINR(ev.materials_addon_price)})`
                    : ""
                }`}
          </dd>
        </div>
        {ev.languages && ev.languages.length > 0 && (
          <div>
            <dt className="font-medium">Languages</dt>
            <dd className="text-zinc-600 dark:text-zinc-400">{ev.languages.join(", ")}</dd>
          </div>
        )}
        {ev.age_suitability && (
          <div>
            <dt className="font-medium">Age</dt>
            <dd className="text-zinc-600 dark:text-zinc-400">{ev.age_suitability}</dd>
          </div>
        )}
        {ev.cancellation_policy && (
          <div>
            <dt className="font-medium">Cancellation</dt>
            <dd className="text-zinc-600 dark:text-zinc-400">{ev.cancellation_policy}</dd>
          </div>
        )}
      </dl>

      {/* Reserve bar */}
      <div className="mt-8 flex items-center justify-between rounded-xl border border-black/10 p-4 dark:border-white/15">
        <div>
          <p className="text-lg font-semibold">{priceLabel}</p>
          {seatsLeft !== null && !isCancelled && !isPast && (
            <p className="text-xs text-zinc-500">
              {soldOut
                ? "Sold out"
                : seatsLeft <= 5
                  ? `Only ${seatsLeft} seat${seatsLeft === 1 ? "" : "s"} left`
                  : `${seatsLeft} seats left`}
            </p>
          )}
        </div>
        <button
          type="button"
          disabled
          className="rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background disabled:opacity-50"
          title="Booking opens in the next slice"
        >
          {isCancelled ? "Cancelled" : isPast ? "Ended" : soldOut ? "Sold out" : "Reserve"}
        </button>
      </div>
      {!isCancelled && !isPast && !soldOut && (
        <p className="mt-2 text-center text-xs text-zinc-500">
          Booking &amp; payment arrive in the next slice.
        </p>
      )}
    </main>
  );
}
