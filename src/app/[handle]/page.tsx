import type { Metadata } from "next";
import { cache } from "react";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, supabaseConfigured } from "@/lib/auth";
import { normalizeHandleInput } from "@/lib/handles";
import { formatEventShort } from "@/lib/datetime";
import { formatINR } from "@/lib/money";
import { fetchOrganizerRating, stars } from "@/lib/reviews";

type Profile = {
  id: string;
  user_id: string;
  handle: string;
  bio: string | null;
  city: string | null;
  profile_photo: string | null;
  intro_video_url: string | null;
  social_links: Record<string, string> | null;
  verification_status: "unverified" | "verified";
  name: string | null;
};

type EventCard = {
  slug: string;
  title: string;
  category: string;
  starts_at: string | null;
  price: number;
  is_free: boolean;
};

const fetchProfile = cache(
  async (handleParam: string): Promise<Profile | null> => {
    if (!supabaseConfigured()) return null;
    const handle = normalizeHandleInput(decodeURIComponent(handleParam));
    if (!handle) return null;

    const supabase = await createClient();
    const { data } = await supabase
      .from("organizer_profiles")
      .select(
        "id, user_id, handle, bio, city, profile_photo, intro_video_url, social_links, verification_status",
      )
      .eq("handle_normalised", handle)
      .maybeSingle();
    if (!data) return null;

    const admin = createAdminClient();
    const { data: u } = await admin
      .from("users")
      .select("name")
      .eq("id", data.user_id)
      .maybeSingle();

    return { ...(data as Omit<Profile, "name">), name: u?.name ?? null };
  },
);

async function fetchOrganizerEvents(
  organizerId: string,
): Promise<{ upcoming: EventCard[]; past: EventCard[] }> {
  const supabase = await createClient();
  const { data: links } = await supabase
    .from("event_organizers")
    .select("event_id")
    .eq("organizer_id", organizerId)
    .eq("status", "accepted");
  const ids = (links ?? []).map((l) => l.event_id as string);
  if (!ids.length) return { upcoming: [], past: [] };

  const { data } = await supabase
    .from("events")
    .select("slug, title, category, starts_at, price, is_free")
    .in("id", ids)
    .eq("status", "published")
    .order("starts_at", { ascending: true });
  const all = (data ?? []) as EventCard[];
  const now = Date.now();
  const upcoming = all.filter(
    (e) => e.starts_at && new Date(e.starts_at).getTime() >= now,
  );
  const past = all
    .filter((e) => !e.starts_at || new Date(e.starts_at).getTime() < now)
    .reverse();
  return { upcoming, past };
}

/**
 * If a handle was changed, its old form still resolves — we look it up in
 * handle_history and permanently redirect (JAD P2: links in an Instagram bio
 * must never die).
 */
async function findRenamedHandle(handleParam: string): Promise<string | null> {
  if (!supabaseConfigured()) return null;
  const old = normalizeHandleInput(decodeURIComponent(handleParam));
  if (!old) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("organizer_profiles")
    .select("handle, handle_history")
    .contains("handle_history", [{ old_handle: old }])
    .maybeSingle();
  return (data?.handle as string) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const profile = await fetchProfile(handle);
  if (!profile) return { title: "Profile not found" };

  const name = profile.name ?? profile.handle;
  const ogTitle = `${name} · Aikyam`;
  const description =
    profile.bio ?? `${name} hosts cultural experiences on Aikyam.`;
  const images = profile.profile_photo ? [profile.profile_photo] : undefined;

  return {
    title: name,
    description,
    openGraph: {
      title: ogTitle,
      description,
      type: "profile",
      url: `/@${profile.handle}`,
      images,
    },
    twitter: { card: "summary", title: ogTitle, description, images },
  };
}

function EventList({ events }: { events: EventCard[] }) {
  return (
    <ul className="mt-3 space-y-2">
      {events.map((ev) => (
        <li key={ev.slug}>
          <Link
            href={`/e/${ev.slug}`}
            className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-3 transition-colors hover:border-gold/30"
          >
            <div>
              <p className="text-sm font-medium text-cream">{ev.title}</p>
              <p className="text-xs text-muted">
                {ev.category} · {formatEventShort(ev.starts_at)}
              </p>
            </div>
            <span className="shrink-0 text-sm font-semibold text-gold">
              {ev.is_free ? "Free" : formatINR(ev.price)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function OrganizerProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const profile = await fetchProfile(handle);
  if (!profile) {
    const renamed = await findRenamedHandle(handle);
    if (renamed) permanentRedirect(`/@${renamed}`);
    notFound();
  }

  const [user, events] = await Promise.all([
    getCurrentUser(),
    fetchOrganizerEvents(profile.id),
  ]);
  const rating = await fetchOrganizerRating(createAdminClient(), profile.id);
  const isOwner = user?.id === profile.user_id;
  const name = profile.name ?? profile.handle;
  const social = profile.social_links ?? {};

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 sm:px-6 py-12">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-gold/20 bg-gold/10 font-display text-2xl text-gold">
          {name.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl text-cream">{name}</h1>
            {profile.verification_status === "verified" && (
              <span title="Verified" className="text-sm text-gold">
                ✓
              </span>
            )}
          </div>
          <p className="text-sm text-muted">
            @{profile.handle}
            {profile.city ? ` · ${profile.city}` : ""}
          </p>
          {rating.count > 0 && rating.avg !== null && (
            <p className="mt-0.5 text-sm text-gold">
              {stars(rating.avg)} {rating.avg.toFixed(1)} ({rating.count})
            </p>
          )}
        </div>
      </div>

      {profile.bio && (
        <p className="mt-5 text-sm leading-6 text-muted">{profile.bio}</p>
      )}

      {(social.instagram || social.youtube || social.website) && (
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          {social.instagram && (
            <a className="text-gold hover:text-saffron" href={social.instagram} target="_blank" rel="noopener noreferrer nofollow">
              Instagram
            </a>
          )}
          {social.youtube && (
            <a className="text-gold hover:text-saffron" href={social.youtube} target="_blank" rel="noopener noreferrer nofollow">
              YouTube
            </a>
          )}
          {social.website && (
            <a className="text-gold hover:text-saffron" href={social.website} target="_blank" rel="noopener noreferrer nofollow">
              Website
            </a>
          )}
        </div>
      )}

      {isOwner && (
        <div className="mt-6 rounded-2xl border border-border bg-surface p-4 text-sm">
          <p className="font-medium text-cream">This is your public page.</p>
          <p className="mt-1 text-muted">
            Put <span className="font-mono text-gold">aikyam.app/@{profile.handle}</span>{" "}
            in your Instagram bio.
          </p>
          <Link
            href="/organizer/events/new"
            className="mt-3 inline-block rounded-full bg-gold px-4 py-2 text-xs font-semibold text-ink transition-colors hover:bg-saffron"
          >
            Create an event
          </Link>
        </div>
      )}

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Upcoming events
        </h2>
        {events.upcoming.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No upcoming events yet.</p>
        ) : (
          <EventList events={events.upcoming} />
        )}
      </section>

      {events.past.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Past events
          </h2>
          <EventList events={events.past} />
        </section>
      )}
    </main>
  );
}
