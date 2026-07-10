import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import { normalizeHandleInput, validateHandleFormat } from "@/lib/handles";
import { checkHandleAvailability } from "@/lib/supabase/handle-service";

/** First-time organizer profile claim (P2). Auth required. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const handle = normalizeHandleInput(String(body?.handle ?? ""));
  const bio =
    typeof body?.bio === "string" ? body.bio.trim().slice(0, 500) || null : null;
  const city =
    typeof body?.city === "string" ? body.city.trim().slice(0, 100) || null : null;

  const fmt = validateHandleFormat(handle);
  if (fmt) return NextResponse.json({ error: fmt }, { status: 400 });

  const admin = createAdminClient();

  // One organizer profile per user.
  const { data: existingProfile } = await admin
    .from("organizer_profiles")
    .select("handle")
    .eq("user_id", user.id)
    .maybeSingle();
  if (existingProfile) {
    return NextResponse.json(
      { error: "You already have an organizer profile.", handle: existingProfile.handle },
      { status: 409 },
    );
  }

  const availability = await checkHandleAvailability(handle);
  if (!availability.available) {
    return NextResponse.json(
      { error: availability.reason ?? "Handle unavailable." },
      { status: 409 },
    );
  }

  const { data: created, error } = await admin
    .from("organizer_profiles")
    .insert({
      user_id: user.id,
      handle,
      handle_normalised: handle,
      bio,
      city,
    })
    .select("handle")
    .single();

  if (error) {
    // Unique-violation race: someone claimed it a moment ago.
    if (error.code === "23505") {
      return NextResponse.json({ error: "That handle is taken." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Promote their default role to organizer.
  await admin.from("users").update({ default_role: "organizer" }).eq("id", user.id);

  return NextResponse.json({ ok: true, handle: created.handle });
}
