import { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

export type ReviewItem = {
  id: string;
  rating: number;
  comment: string | null;
  organizerResponse: string | null;
  author: string;
  createdAt: string;
};

/** Reviews for an event with author names + aggregate. */
export async function fetchEventReviews(
  admin: Admin,
  eventId: string,
): Promise<{ items: ReviewItem[]; avg: number | null; count: number }> {
  const { data } = await admin
    .from("reviews")
    .select("id, rating, comment, organizer_response, attendee_user_id, created_at")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });
  const rows = data ?? [];

  const userIds = [...new Set(rows.map((r) => r.attendee_user_id))];
  const { data: users } = userIds.length
    ? await admin.from("users").select("id, name").in("id", userIds)
    : { data: [] as { id: string; name: string | null }[] };
  const nameById = new Map((users ?? []).map((u) => [u.id, u.name]));

  const items: ReviewItem[] = rows.map((r) => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    organizerResponse: r.organizer_response,
    author: nameById.get(r.attendee_user_id) ?? "Attendee",
    createdAt: r.created_at,
  }));
  const count = items.length;
  const avg = count ? items.reduce((s, i) => s + i.rating, 0) / count : null;
  return { items, avg, count };
}

/** Aggregate rating across all of an organiser's events. */
export async function fetchOrganizerRating(
  admin: Admin,
  organizerId: string,
): Promise<{ avg: number | null; count: number }> {
  const { data: links } = await admin
    .from("event_organizers")
    .select("event_id")
    .eq("organizer_id", organizerId);
  const ids = (links ?? []).map((l) => l.event_id as string);
  if (!ids.length) return { avg: null, count: 0 };

  const { data } = await admin.from("reviews").select("rating").in("event_id", ids);
  const ratings = (data ?? []).map((r) => r.rating as number);
  const count = ratings.length;
  const avg = count ? ratings.reduce((s, r) => s + r, 0) / count : null;
  return { avg, count };
}

/** "★★★★☆" for a 1–5 rating. */
export function stars(rating: number): string {
  const r = Math.round(rating);
  return "★".repeat(r) + "☆".repeat(Math.max(0, 5 - r));
}
