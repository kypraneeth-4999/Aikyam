import { createAdminClient } from "@/lib/supabase/admin";
import { fetchOrganizerRating } from "@/lib/reviews";

type Admin = ReturnType<typeof createAdminClient>;

export type OrganizerTrust = {
  verified: boolean;
  /** Published events they've hosted (past + upcoming). */
  eventsHosted: number;
  /** Events that have already happened — the real track record. */
  eventsCompleted: number;
  /** Seats actually paid for across their events. */
  attendeesHosted: number;
  avgRating: number | null;
  reviewCount: number;
  memberSince: string | null;
  /** Linked social profiles — presence, not identity proof. */
  socials: { instagram?: string; youtube?: string; website?: string };
};

/**
 * Everything a prospective attendee needs to judge a host: verification,
 * track record, ratings, and linked socials. All computed from on-platform
 * activity only — the JAD's retention hook (metrics that accrue only here).
 */
export async function fetchOrganizerTrust(
  admin: Admin,
  organizerId: string,
): Promise<OrganizerTrust> {
  const [{ data: profile }, { data: links }, rating] = await Promise.all([
    admin
      .from("organizer_profiles")
      .select("verification_status, social_links, created_at")
      .eq("id", organizerId)
      .maybeSingle(),
    admin.from("event_organizers").select("event_id").eq("organizer_id", organizerId).eq("status", "accepted"),
    fetchOrganizerRating(admin, organizerId),
  ]);

  const ids = (links ?? []).map((l) => l.event_id as string);
  let eventsHosted = 0;
  let eventsCompleted = 0;
  let attendeesHosted = 0;

  if (ids.length) {
    const { data: events } = await admin
      .from("events")
      .select("id, starts_at, status")
      .in("id", ids)
      .eq("status", "published");
    const now = Date.now();
    eventsHosted = (events ?? []).length;
    eventsCompleted = (events ?? []).filter(
      (e) => e.starts_at && new Date(e.starts_at as string).getTime() < now,
    ).length;

    const { data: paid } = await admin
      .from("bookings")
      .select("seats")
      .in("event_id", ids)
      .eq("payment_status", "paid");
    attendeesHosted = (paid ?? []).reduce((s, b) => s + (Number(b.seats) || 0), 0);
  }

  return {
    verified: profile?.verification_status === "verified",
    eventsHosted,
    eventsCompleted,
    attendeesHosted,
    avgRating: rating.avg,
    reviewCount: rating.count,
    memberSince: (profile?.created_at as string) ?? null,
    socials: (profile?.social_links ?? {}) as OrganizerTrust["socials"],
  };
}

/** "July 2026" — for "Hosting since …". */
export function formatMonthYear(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}
