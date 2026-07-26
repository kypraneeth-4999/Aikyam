import type { Metadata } from "next";
import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { supabaseConfigured } from "@/lib/auth";
import { formatINR } from "@/lib/money";
import { formatEventWhen } from "@/lib/datetime";
import { fetchEventReviews, stars } from "@/lib/reviews";

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
  collaborators: { name: string }[] | null;
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

  const { data: paid } = await admin
    .from("bookings")
    .select("seats")
    .eq("event_id", ev.id)
    .eq("payment_status", "paid");
  const taken = (paid ?? []).reduce((s, b) => s + (Number(b.seats) || 0), 0);
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
    : ev.photos?.length
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

const infoPill =
  "flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm text-muted";

export default async function EventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await fetchEvent(slug);
  if (!result) notFound();
  const { ev, host, seatsLeft } = result;

  const admin = createAdminClient();
  const reviews = await fetchEventReviews(admin, ev.id);

  const { data: coLinks } = await admin
    .from("event_organizers")
    .select("organizer_id")
    .eq("event_id", ev.id)
    .eq("role", "cohost")
    .eq("status", "accepted");
  const coIds = (coLinks ?? []).map((c) => c.organizer_id as string);
  let cohosts: { handle: string; name: string }[] = [];
  if (coIds.length) {
    const { data: cps } = await admin
      .from("organizer_profiles")
      .select("id, handle, user_id")
      .in("id", coIds);
    const cuIds = (cps ?? []).map((p) => p.user_id);
    const { data: cus } = cuIds.length
      ? await admin.from("users").select("id, name").in("id", cuIds)
      : { data: [] as { id: string; name: string | null }[] };
    const nm = new Map((cus ?? []).map((u) => [u.id, u.name]));
    cohosts = (cps ?? []).map((p) => ({
      handle: p.handle,
      name: nm.get(p.user_id) ?? p.handle,
    }));
  }
  const collaborators = Array.isArray(ev.collaborators)
    ? (ev.collaborators as { name: string }[])
    : [];

  const isCancelled = ev.status === "cancelled";
  const isPast =
    ev.status === "completed" ||
    (ev.starts_at ? new Date(ev.starts_at).getTime() < Date.now() : false);
  const soldOut = seatsLeft !== null && seatsLeft <= 0;
  const bookable = !isCancelled && !isPast && !soldOut;
  const priceLabel = ev.is_free ? "Free" : formatINR(ev.price);
  const heroImg = ev.cover_media ?? ev.photos?.[0] ?? null;

  return (
    <>
      {/* HERO */}
      <section className="relative h-[50vh] overflow-hidden bg-surface2">
        {heroImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={heroImg} alt={ev.title} className="h-full w-full object-cover opacity-60" />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-display text-6xl text-muted/25">
            {ev.category}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/60 to-transparent" />
        <div className="absolute inset-x-0 bottom-0">
          <div className="mx-auto max-w-7xl px-6 pb-8">
            <div className="mb-3 flex items-center gap-2 text-sm">
              <Link href="/" className="text-muted transition-colors hover:text-cream">
                Events
              </Link>
              <span className="text-border">›</span>
              <span className="text-muted">{ev.category}</span>
            </div>
            <span className="mb-3 inline-block rounded-full border border-gold/25 bg-gold/15 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-gold">
              {ev.category}
              {isCancelled ? " · Cancelled" : isPast ? " · Ended" : ""}
            </span>
            <h1 className="max-w-3xl font-display text-4xl leading-none text-cream md:text-6xl">
              {ev.title}
            </h1>
          </div>
        </div>
      </section>

      {/* BODY */}
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
          {/* LEFT */}
          <div className="space-y-10 lg:col-span-2">
            <div className="flex flex-wrap gap-3">
              <div className={infoPill}>
                <span className="text-xs text-gold">◷</span>
                {formatEventWhen(ev.starts_at, ev.ends_at)}
              </div>
              {ev.venue_name && (
                <div className={infoPill}>
                  <span className="text-xs text-gold">◎</span>
                  {ev.maps_url ? (
                    <a href={ev.maps_url} target="_blank" rel="noopener noreferrer nofollow" className="hover:text-cream">
                      {ev.venue_name}
                    </a>
                  ) : (
                    ev.venue_name
                  )}
                  {ev.landmark ? ` · ${ev.landmark}` : ""}
                </div>
              )}
              {ev.languages && ev.languages.length > 0 && (
                <div className={infoPill}>
                  <span className="text-xs text-gold">◆</span>
                  {ev.languages.join(", ")}
                </div>
              )}
              {ev.age_suitability && (
                <div className={infoPill}>
                  <span className="text-xs text-gold">✦</span>
                  {ev.age_suitability}
                </div>
              )}
            </div>

            {ev.description && (
              <div>
                <h2 className="mb-5 font-display text-2xl text-cream">About this event</h2>
                <div className="space-y-4">
                  {ev.description.split("\n\n").map((para, i) => (
                    <p key={i} className="text-sm leading-relaxed text-muted">
                      {para}
                    </p>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h2 className="mb-5 font-display text-2xl text-cream">Details</h2>
              <dl className="space-y-3 text-sm">
                {ev.what_to_bring && (
                  <div>
                    <dt className="text-cream">What to bring</dt>
                    <dd className="text-muted">{ev.what_to_bring}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-cream">Materials</dt>
                  <dd className="text-muted">
                    {ev.materials === "included"
                      ? "Included"
                      : `Bring your own${
                          ev.materials_addon_price
                            ? ` (add-on ${formatINR(ev.materials_addon_price)})`
                            : ""
                        }`}
                  </dd>
                </div>
                {ev.cancellation_policy && (
                  <div>
                    <dt className="text-cream">Cancellation</dt>
                    <dd className="text-muted">{ev.cancellation_policy}</dd>
                  </div>
                )}
              </dl>
            </div>

            {host && (
              <Link
                href={`/@${host.handle}`}
                className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-gold/30"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-full border border-gold/20 bg-gold/10 text-sm font-bold text-gold">
                  {host.name.slice(0, 1).toUpperCase()}
                </div>
                <div className="text-sm">
                  <p className="text-xs text-muted">Organised by</p>
                  <p className="font-medium text-cream">
                    {host.name}
                    {host.verified ? " ✓" : ""}
                  </p>
                </div>
              </Link>
            )}

            {(cohosts.length > 0 || collaborators.length > 0) && (
              <div>
                <p className="mb-2 text-xs uppercase tracking-wide text-muted">
                  Co-organisers
                </p>
                <div className="flex flex-wrap gap-2 text-sm">
                  {cohosts.map((c) => (
                    <Link
                      key={c.handle}
                      href={`/@${c.handle}`}
                      className="rounded-full border border-border bg-surface px-3 py-1 text-cream transition-colors hover:border-gold/30"
                    >
                      {c.name}
                    </Link>
                  ))}
                  {collaborators.map((c) => (
                    <span
                      key={c.name}
                      title="External collaborator (unverified)"
                      className="rounded-full border border-border bg-surface px-3 py-1 text-muted"
                    >
                      {c.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            <section>
              <div className="mb-4 flex items-baseline gap-3">
                <h2 className="font-display text-2xl text-cream">Reviews</h2>
                {reviews.count > 0 && reviews.avg !== null && (
                  <span className="text-sm text-gold">
                    {stars(reviews.avg)} {reviews.avg.toFixed(1)} ({reviews.count})
                  </span>
                )}
              </div>
              {reviews.items.length === 0 ? (
                <p className="text-sm text-muted">No reviews yet.</p>
              ) : (
                <div className="space-y-4">
                  {reviews.items.map((rv) => (
                    <div
                      key={rv.id}
                      className="rounded-2xl border border-border bg-surface p-4"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-cream">{rv.author}</p>
                        <span className="text-sm text-gold">{stars(rv.rating)}</span>
                      </div>
                      {rv.comment && (
                        <p className="mt-2 text-sm text-muted">{rv.comment}</p>
                      )}
                      {rv.organizerResponse && (
                        <div className="mt-3 rounded-xl border border-border bg-surface2 p-3">
                          <p className="text-xs font-semibold text-gold">
                            Organiser response
                          </p>
                          <p className="mt-1 text-xs text-muted">
                            {rv.organizerResponse}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* RIGHT — reserve box */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 rounded-2xl border border-border bg-surface p-6">
              <p className="mb-1 text-xs uppercase tracking-widest text-muted">
                {ev.is_free ? "Free event" : "Tickets from"}
              </p>
              <p className="mb-4 font-display text-3xl text-gold">{priceLabel}</p>
              {seatsLeft !== null && bookable && (
                <p className="mb-4 text-xs text-muted">
                  {seatsLeft <= 5
                    ? `Only ${seatsLeft} seat${seatsLeft === 1 ? "" : "s"} left`
                    : `${seatsLeft} seats available`}
                </p>
              )}
              {bookable ? (
                <Link
                  href={`/e/${ev.slug}/book`}
                  className="block w-full rounded-xl bg-gold py-3.5 text-center text-sm font-semibold text-ink transition-all hover:bg-saffron hover:scale-[1.02] active:scale-[0.98]"
                >
                  {ev.is_free ? "Register free" : "Book tickets"}
                </Link>
              ) : (
                <div className="w-full rounded-xl border border-border bg-surface2 py-3.5 text-center text-sm font-semibold text-muted">
                  {isCancelled ? "Event cancelled" : isPast ? "Event ended" : "Sold out"}
                </div>
              )}
              <p className="mt-3 text-center text-xs text-muted">
                Payment confirmed securely before your ticket is issued.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
