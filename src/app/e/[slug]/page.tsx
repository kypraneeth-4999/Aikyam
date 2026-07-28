import type { Metadata } from "next";
import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, supabaseConfigured } from "@/lib/auth";
import { formatINR } from "@/lib/money";
import { formatEventWhen } from "@/lib/datetime";
import { fetchEventReviews, stars } from "@/lib/reviews";
import { fetchOrganizerTrust, type OrganizerTrust } from "@/lib/trust";
import { userOrganizesEvent } from "@/lib/authz";
import { HostCard } from "@/components/host-card";
import { EventGallery } from "@/components/event-gallery";
import { VenueBlock } from "@/components/venue-block";

type EventRow = {
  id: string;
  slug: string;
  title: string;
  category: string;
  description: string | null;
  starts_at: string | null;
  ends_at: string | null;
  venue_name: string | null;
  address: string | null;
  city: string | null;
  venue_type: "public" | "private";
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

type Host = {
  handle: string;
  name: string;
  photo: string | null;
  bio: string | null;
  trust: OrganizerTrust;
};

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
      .select("id, handle, user_id, bio, profile_photo")
      .eq("id", eo.organizer_id)
      .maybeSingle();
    if (op) {
      const [{ data: u }, trust] = await Promise.all([
        admin.from("users").select("name").eq("id", op.user_id).maybeSingle(),
        fetchOrganizerTrust(admin, op.id),
      ]);
      host = {
        handle: op.handle,
        name: u?.name ?? op.handle,
        photo: op.profile_photo,
        bio: op.bio,
        trust,
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
  const where = [ev.venue_name, ev.city].filter(Boolean).join(", ");
  const description =
    ev.description ??
    `${priceLabel} · ${formatEventWhen(ev.starts_at, ev.ends_at)}${where ? ` · ${where}` : ""}`;
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
  const user = await getCurrentUser();

  // A private venue's exact address is revealed to confirmed attendees and to
  // the event's own organisers.
  let revealed = false;
  if (user) {
    const { data: myBooking } = await admin
      .from("bookings")
      .select("id")
      .eq("event_id", ev.id)
      .eq("attendee_user_id", user.id)
      .eq("payment_status", "paid")
      .maybeSingle();
    revealed = !!myBooking || (await userOrganizesEvent(admin, user.id, ev.id));
  }

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
  const gallery = (ev.photos ?? []).filter(Boolean);
  const whereShort = [ev.venue_name, ev.city].filter(Boolean).join(", ");

  return (
    <>
      {/* HERO */}
      <section className="relative h-[40vh] min-h-[300px] overflow-hidden bg-surface2 sm:h-[50vh]">
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
            <h1 className="max-w-3xl font-display text-3xl leading-tight text-cream sm:text-4xl sm:leading-none md:text-6xl">
              {ev.title}
            </h1>
            {whereShort && (
              <p className="mt-3 text-sm text-cream/70">◎ {whereShort}</p>
            )}
          </div>
        </div>
      </section>

      {/* BODY — extra bottom padding on mobile clears the sticky booking bar */}
      <div className="mx-auto max-w-7xl px-4 pb-28 pt-10 sm:px-6 sm:py-12 lg:pb-12">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
          {/* LEFT */}
          <div className="space-y-10 lg:col-span-2">
            <div className="flex flex-wrap gap-3">
              <div className={infoPill}>
                <span className="text-xs text-gold">◷</span>
                {formatEventWhen(ev.starts_at, ev.ends_at)}
              </div>
              {ev.city && (
                <div className={infoPill}>
                  <span className="text-xs text-gold">◎</span>
                  {ev.city}
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
              <section>
                <h2 className="mb-5 font-display text-2xl text-cream">
                  About this event
                </h2>
                <div className="space-y-4">
                  {ev.description.split("\n\n").map((para, i) => (
                    <p key={i} className="text-sm leading-relaxed text-muted">
                      {para}
                    </p>
                  ))}
                </div>
              </section>
            )}

            <EventGallery photos={gallery} title={ev.title} />

            <VenueBlock
              venueName={ev.venue_name}
              address={ev.address}
              landmark={ev.landmark}
              city={ev.city}
              mapsUrl={ev.maps_url}
              venueType={ev.venue_type}
              revealed={revealed}
            />

            <section>
              <h2 className="mb-4 font-display text-2xl text-cream">Good to know</h2>
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
            </section>

            {host && (
              <HostCard
                handle={host.handle}
                name={host.name}
                photo={host.photo}
                bio={host.bio}
                trust={host.trust}
              />
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
                <p className="text-sm text-muted">
                  No reviews yet — only people who checked in at the event can leave one.
                </p>
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

          {/* RIGHT — reserve box (desktop; mobile uses the sticky bar below) */}
          <div className="hidden lg:col-span-1 lg:block">
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

              {host && (
                <div className="mt-4 border-t border-border pt-4 text-xs">
                  <p className="text-muted">Hosted by</p>
                  <Link
                    href={`/@${host.handle}`}
                    className="font-medium text-cream hover:text-gold"
                  >
                    {host.name}
                    {host.trust.verified ? " ✓" : ""}
                  </Link>
                  {host.trust.eventsCompleted > 0 && (
                    <p className="mt-1 text-muted">
                      {host.trust.eventsCompleted} event
                      {host.trust.eventsCompleted === 1 ? "" : "s"} completed
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sticky booking bar — phones and tablets */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-ink/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] lg:hidden">
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <div className="min-w-0">
            <p className="font-display text-xl leading-none text-gold">
              {priceLabel}
            </p>
            {seatsLeft !== null && bookable && (
              <p className="mt-1 truncate text-xs text-muted">
                {seatsLeft <= 5
                  ? `Only ${seatsLeft} left`
                  : `${seatsLeft} seats available`}
              </p>
            )}
          </div>
          {bookable ? (
            <Link
              href={`/e/${ev.slug}/book`}
              className="shrink-0 rounded-xl bg-gold px-6 py-3 text-sm font-semibold text-ink transition-colors hover:bg-saffron"
            >
              {ev.is_free ? "Register free" : "Book tickets"}
            </Link>
          ) : (
            <span className="shrink-0 rounded-xl border border-border bg-surface2 px-6 py-3 text-sm font-semibold text-muted">
              {isCancelled ? "Cancelled" : isPast ? "Ended" : "Sold out"}
            </span>
          )}
        </div>
      </div>
    </>
  );
}
