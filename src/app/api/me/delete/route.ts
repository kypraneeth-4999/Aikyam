import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

/**
 * Delete account (P12). Anonymises PII and bans the auth user so they can no
 * longer sign in. We keep the (anonymised) user row rather than hard-deleting,
 * because bookings reference it (ON DELETE RESTRICT) — anonymisation satisfies
 * the privacy requirement without breaking booking/audit integrity.
 */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  await admin
    .from("users")
    .update({ name: null, email: null, phone: null, city: null, google_id: null })
    .eq("id", user.id);

  await admin.from("audit_logs").insert({
    actor_user_id: user.id,
    action: "account.deleted",
    entity_type: "user",
    entity_id: user.id,
    metadata: {},
  });

  // Prevent future sign-in (can't hard-delete due to booking FK restrictions).
  try {
    await admin.auth.admin.updateUserById(user.id, { ban_duration: "876000h" });
  } catch {
    /* best-effort */
  }

  // Clear the current session.
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    /* ignore */
  }

  return NextResponse.json({ ok: true });
}
