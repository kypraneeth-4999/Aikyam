import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { supabaseConfigured } from "@/lib/auth";

export type DiscoverEvent = {
  id: string;
  slug: string;
  title: string;
  category: string;
  starts_at: string | null;
  price: number;
  is_free: boolean;
  is_featured: boolean;
  city: string | null;
  venue_name: string | null;
  venue_type: "public" | "private";
  cover_media: string | null;
  photos: string[] | null;
  host: { handle: string; name: string } | null;
};

/**
 * Published, upcoming events across all organizers (discovery feed).
 * Optional category filter. Host display names come from the service-role
 * client (the users table is RLS-guarded).
 */
export async function fetchDiscoverEvents(
  category?: string,
): Promise<DiscoverEvent[]> {
  if (!supabaseConfigured()) return [];

  const supabase = await createClient();
  let q = supabase
    .from("events")
    .select(
      "id, slug, title, category, starts_at, price, is_free, is_featured, city, venue_name, venue_type, cover_media, photos",
    )
    .eq("status", "published")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(48);
  if (category) q = q.eq("category", category);

  const { data: events } = await q;
  if (!events || events.length === 0) return [];

  const admin = createAdminClient();
  const ids = events.map((e) => e.id);
  const { data: eos } = await admin
    .from("event_organizers")
    .select("event_id, organizer_id")
    .eq("role", "primary")
    .in("event_id", ids);

  const orgIds = [...new Set((eos ?? []).map((e) => e.organizer_id))];
  const { data: orgs } = orgIds.length
    ? await admin
        .from("organizer_profiles")
        .select("id, handle, user_id")
        .in("id", orgIds)
    : { data: [] as { id: string; handle: string; user_id: string }[] };

  const userIds = [...new Set((orgs ?? []).map((o) => o.user_id))];
  const { data: users } = userIds.length
    ? await admin.from("users").select("id, name").in("id", userIds)
    : { data: [] as { id: string; name: string | null }[] };

  const orgById = new Map((orgs ?? []).map((o) => [o.id, o]));
  const nameByUser = new Map((users ?? []).map((u) => [u.id, u.name]));
  const orgByEvent = new Map((eos ?? []).map((e) => [e.event_id, e.organizer_id]));

  return events.map((ev) => {
    const orgId = orgByEvent.get(ev.id);
    const org = orgId ? orgById.get(orgId) : null;
    const host = org
      ? { handle: org.handle, name: nameByUser.get(org.user_id) ?? org.handle }
      : null;
    return { ...ev, host } as DiscoverEvent;
  });
}
