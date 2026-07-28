import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import { normalizeHandleInput, validateHandleFormat } from "@/lib/handles";
import { checkHandleAvailability } from "@/lib/supabase/handle-service";

/** Days the old handle stays reserved (and redirecting) after a change — JAD P2. */
const GRACE_DAYS = 90;

/**
 * Change an organiser's handle (JAD P2). The old handle keeps redirecting to the
 * new one and is reserved for a grace period, so a link already sitting in
 * someone's Instagram bio never dies.
 */
export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("organizer_profiles")
    .select("id, handle, handle_normalised, handle_history, verification_status")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile) {
    return NextResponse.json({ error: "No organiser profile." }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}) as Record<string, unknown>);
  const next = normalizeHandleInput(String(body.handle ?? ""));

  const fmt = validateHandleFormat(next);
  if (fmt) return NextResponse.json({ error: fmt }, { status: 400 });
  if (next === profile.handle_normalised) {
    return NextResponse.json({ error: "That's already your handle." }, { status: 400 });
  }

  const availability = await checkHandleAvailability(next, {
    verified: profile.verification_status === "verified",
  });
  if (!availability.available) {
    return NextResponse.json(
      { error: availability.reason ?? "Handle unavailable." },
      { status: 409 },
    );
  }

  const releasedAt = new Date(Date.now() + GRACE_DAYS * 864e5).toISOString();
  const history = Array.isArray(profile.handle_history)
    ? (profile.handle_history as { old_handle: string; released_at: string }[])
    : [];
  history.push({ old_handle: profile.handle_normalised, released_at: releasedAt });

  const { error } = await admin
    .from("organizer_profiles")
    .update({ handle: next, handle_normalised: next, handle_history: history })
    .eq("id", profile.id);
  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "That handle is taken." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Hold the old handle so nobody can grab it while links still point there.
  await admin.from("reserved_handles").upsert(
    {
      handle: profile.handle_normalised,
      reason: "redirect_grace",
      reserved_until: releasedAt,
    },
    { onConflict: "handle" },
  );

  await admin.from("audit_logs").insert({
    actor_user_id: user.id,
    action: "organizer.handle_changed",
    entity_type: "organizer_profile",
    entity_id: profile.id,
    metadata: { from: profile.handle_normalised, to: next, grace_until: releasedAt },
  });

  return NextResponse.json({ ok: true, handle: next });
}
