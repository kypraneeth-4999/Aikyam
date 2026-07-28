/**
 * Where the event is, and how much of that is public.
 *
 * Public venues (café, studio, hall) show the full address to everyone.
 * Private venues (a home, a personal studio) show only the area until you have
 * a confirmed booking — that protects the host, while the host still sees every
 * attendee's name and contact on their attendee list.
 */
export function VenueBlock({
  venueName,
  address,
  landmark,
  city,
  mapsUrl,
  venueType,
  revealed,
}: {
  venueName: string | null;
  address: string | null;
  landmark: string | null;
  city: string | null;
  mapsUrl: string | null;
  venueType: "public" | "private";
  /** True when the viewer has a confirmed booking (or hosts the event). */
  revealed: boolean;
}) {
  const isPrivate = venueType === "private";
  const showExact = !isPrivate || revealed;

  // Fall back to a Maps search when the organiser didn't paste a link.
  const query = [venueName, address, city].filter(Boolean).join(", ");
  const directionsUrl =
    mapsUrl ??
    (query
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
      : null);

  return (
    <section>
      <div className="mb-4 flex items-center gap-3">
        <h2 className="font-display text-2xl text-cream">Where</h2>
        <span
          className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
            isPrivate
              ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
          }`}
        >
          {isPrivate ? "Private venue" : "Public venue"}
        </span>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-5">
        {venueName && <p className="font-medium text-cream">{venueName}</p>}

        {showExact ? (
          <>
            {address && <p className="mt-1 text-sm text-muted">{address}</p>}
            {landmark && (
              <p className="mt-1 text-sm text-muted">Landmark: {landmark}</p>
            )}
            {city && !address?.includes(city) && (
              <p className="mt-1 text-sm text-muted">{city}</p>
            )}
            {directionsUrl && (
              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-saffron"
              >
                ◎ Get directions
              </a>
            )}
          </>
        ) : (
          <>
            <p className="mt-1 text-sm text-muted">
              {city ? `${city} — exact address shared after booking` : "Exact address shared after booking"}
            </p>
            {landmark && (
              <p className="mt-1 text-sm text-muted">Near {landmark}</p>
            )}
            <div className="mt-4 rounded-xl border border-border bg-surface2 p-3 text-xs text-muted">
              This event is hosted at a private venue. The full address and map
              link are sent to you as soon as your booking is confirmed.
            </div>
          </>
        )}
      </div>

      {isPrivate && (
        <div className="mt-3 rounded-2xl border border-border bg-surface p-4 text-xs leading-5 text-muted">
          <p className="mb-1 font-medium text-cream">How we keep private venues safe</p>
          <ul className="list-inside list-disc space-y-1">
            <li>The address is only shared with confirmed attendees.</li>
            <li>
              Every attendee books with a verified account, and the host sees who
              is coming before the day.
            </li>
            <li>
              Check the host&apos;s verification and track record below, and read
              reviews from people who actually attended.
            </li>
          </ul>
        </div>
      )}
    </section>
  );
}
