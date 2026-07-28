import Link from "next/link";
import { stars } from "@/lib/reviews";
import { formatMonthYear, type OrganizerTrust } from "@/lib/trust";

/**
 * Everything a prospective attendee needs to decide "can I trust this host":
 * verification, on-platform track record, ratings, and linked socials.
 */
export function HostCard({
  handle,
  name,
  photo,
  bio,
  trust,
}: {
  handle: string;
  name: string;
  photo: string | null;
  bio: string | null;
  trust: OrganizerTrust;
}) {
  const since = formatMonthYear(trust.memberSince);
  const socials = Object.entries(trust.socials).filter(([, v]) => !!v);

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <p className="mb-4 text-xs uppercase tracking-widest text-muted">
        Meet your host
      </p>

      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gold/20 bg-gold/10">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="font-display text-xl text-gold">
              {name.slice(0, 1).toUpperCase()}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/@${handle}`}
              className="font-semibold text-cream hover:text-gold"
            >
              {name}
            </Link>
            {trust.verified ? (
              <span
                title="Aikyam has verified this organiser's identity"
                className="rounded-full border border-gold/30 bg-gold/15 px-2 py-0.5 text-xs font-medium text-gold"
              >
                ✓ Verified
              </span>
            ) : (
              <span
                title="This organiser hasn't completed identity verification yet"
                className="rounded-full border border-border px-2 py-0.5 text-xs text-muted"
              >
                Not yet verified
              </span>
            )}
          </div>
          <p className="text-xs text-muted">@{handle}</p>

          {trust.reviewCount > 0 && trust.avgRating !== null && (
            <p className="mt-1 text-sm text-gold">
              {stars(trust.avgRating)}{" "}
              <span className="text-cream">{trust.avgRating.toFixed(1)}</span>
              <span className="text-muted"> · {trust.reviewCount} review{trust.reviewCount === 1 ? "" : "s"}</span>
            </p>
          )}
        </div>
      </div>

      {bio && (
        <p className="mt-4 text-sm leading-6 text-muted">{bio}</p>
      )}

      {/* Track record — computed from on-platform activity only */}
      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl border border-border bg-surface2 p-2">
          <dt className="sr-only">Events hosted</dt>
          <dd className="font-display text-lg text-gold">{trust.eventsHosted}</dd>
          <p className="text-xs text-muted">events</p>
        </div>
        <div className="rounded-xl border border-border bg-surface2 p-2">
          <dt className="sr-only">Events completed</dt>
          <dd className="font-display text-lg text-gold">{trust.eventsCompleted}</dd>
          <p className="text-xs text-muted">completed</p>
        </div>
        <div className="rounded-xl border border-border bg-surface2 p-2">
          <dt className="sr-only">Attendees hosted</dt>
          <dd className="font-display text-lg text-gold">{trust.attendeesHosted}</dd>
          <p className="text-xs text-muted">guests</p>
        </div>
      </dl>

      {since && (
        <p className="mt-3 text-xs text-muted">Hosting on Aikyam since {since}</p>
      )}

      {socials.length > 0 && (
        <div className="mt-3">
          <p className="text-xs text-muted">Linked accounts</p>
          <div className="mt-1 flex flex-wrap gap-3 text-sm">
            {socials.map(([key, url]) => (
              <a
                key={key}
                href={url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="capitalize text-gold hover:text-saffron"
              >
                {key} ↗
              </a>
            ))}
          </div>
          <p className="mt-1 text-xs text-muted">
            Linked by the organiser — shows their public presence, not an identity check.
          </p>
        </div>
      )}

      <Link
        href={`/@${handle}`}
        className="mt-4 inline-block text-sm text-muted underline hover:text-cream"
      >
        See all their events
      </Link>
    </div>
  );
}
