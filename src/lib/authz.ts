import { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

/** The organizer_profiles.id for a user, or null if they aren't an organiser. */
export async function organizerProfileId(
  admin: Admin,
  userId: string,
): Promise<string | null> {
  const { data } = await admin
    .from("organizer_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.id ?? null;
}

/** True if the user is an *accepted* organiser (primary or co-host) of the event. */
export async function userOrganizesEvent(
  admin: Admin,
  userId: string,
  eventId: string,
): Promise<boolean> {
  const orgId = await organizerProfileId(admin, userId);
  if (!orgId) return false;
  const { data } = await admin
    .from("event_organizers")
    .select("event_id")
    .eq("event_id", eventId)
    .eq("organizer_id", orgId)
    .eq("status", "accepted")
    .maybeSingle();
  return !!data;
}

/** True only for the primary organiser — gates destructive actions (cancel, etc.). */
export async function userIsPrimaryOrganizer(
  admin: Admin,
  userId: string,
  eventId: string,
): Promise<boolean> {
  const orgId = await organizerProfileId(admin, userId);
  if (!orgId) return false;
  const { data } = await admin
    .from("event_organizers")
    .select("event_id")
    .eq("event_id", eventId)
    .eq("organizer_id", orgId)
    .eq("role", "primary")
    .eq("status", "accepted")
    .maybeSingle();
  return !!data;
}
