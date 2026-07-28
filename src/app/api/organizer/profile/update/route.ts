import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import { moderateText } from "@/lib/moderation";

function cleanUrl(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) return null;
  const withProto = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  try {
    const u = new URL(withProto);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

/** Edit the signed-in organiser's public profile (bio, city, socials, photo). */
export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("organizer_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile) {
    return NextResponse.json({ error: "No organiser profile." }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}) as Record<string, unknown>);
  const bio =
    typeof body.bio === "string" ? body.bio.trim().slice(0, 500) || null : null;
  if (bio) {
    const mod = moderateText(bio);
    if (!mod.ok) return NextResponse.json({ error: mod.reason }, { status: 400 });
  }

  const social: Record<string, string> = {};
  for (const key of ["instagram", "youtube", "website"] as const) {
    const url = cleanUrl((body.social_links as Record<string, unknown>)?.[key]);
    if (url) social[key] = url;
  }

  const { error } = await admin
    .from("organizer_profiles")
    .update({
      bio,
      city:
        typeof body.city === "string" ? body.city.trim().slice(0, 100) || null : null,
      profile_photo:
        typeof body.profile_photo === "string" && body.profile_photo.trim()
          ? body.profile_photo.trim()
          : null,
      social_links: social,
    })
    .eq("id", profile.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
