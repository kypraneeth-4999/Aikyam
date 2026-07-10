import { createAdminClient } from "@/lib/supabase/admin";
import { validateHandleFormat, isPremiumHandle } from "@/lib/handles";

export type HandleCheck = { available: boolean; reason?: string };

/**
 * Server-side availability check for a normalized (lowercase, no "@") handle.
 * Runs format rules, the reserved blocklist / grace holds, premium gating, and
 * case-insensitive uniqueness. Uses the service-role client (reserved_handles is
 * server-only).
 */
export async function checkHandleAvailability(
  handle: string,
  opts: { verified?: boolean } = {},
): Promise<HandleCheck> {
  const fmt = validateHandleFormat(handle);
  if (fmt) return { available: false, reason: fmt };

  const admin = createAdminClient();

  // Reserved blocklist + post-change grace holds.
  const { data: reserved } = await admin
    .from("reserved_handles")
    .select("handle, reason, reserved_until")
    .eq("handle", handle)
    .maybeSingle();
  if (reserved) {
    const stillHeld =
      !reserved.reserved_until ||
      new Date(reserved.reserved_until as string) > new Date();
    if (stillHeld) return { available: false, reason: "This handle is reserved." };
  }

  // Short/premium handles require verification.
  if (isPremiumHandle(handle) && !opts.verified) {
    return {
      available: false,
      reason: "Short handles are reserved for verified organizers.",
    };
  }

  // Case-insensitive uniqueness (handle_normalised is citext).
  const { data: existing } = await admin
    .from("organizer_profiles")
    .select("id")
    .eq("handle_normalised", handle)
    .maybeSingle();
  if (existing) return { available: false, reason: "That handle is taken." };

  return { available: true };
}
