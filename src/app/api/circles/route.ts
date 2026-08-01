import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import { slugifyTitle } from "@/lib/slug";
import { moderateText } from "@/lib/moderation";
import { httpUrl, str } from "@/lib/validation";

type Admin = ReturnType<typeof createAdminClient>;

async function uniqueSlug(admin: Admin, name: string): Promise<string> {
  const base = slugifyTitle(name) || "circle";
  for (let i = 0; i < 5; i++) {
    const slug = i === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 6)}`;
    const { data } = await admin
      .from("circles")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!data) return slug;
  }
  return `${base}-${Date.now().toString(36)}`;
}

/** Create a circle. The creator becomes its first member, as host. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}) as Record<string, unknown>);
  const name = String(body.name ?? "").trim();
  const errors: string[] = [];

  if (name.length < 3) errors.push("Give your circle a name (3+ characters).");
  if (name.length > 80) errors.push("Name must be under 80 characters.");

  const privacy = ["open", "approval", "invite_only"].includes(String(body.privacy))
    ? String(body.privacy)
    : "approval";

  const sponsorsRequired = Number(body.sponsors_required ?? 0);
  if (!Number.isInteger(sponsorsRequired) || sponsorsRequired < 0 || sponsorsRequired > 5) {
    errors.push("Endorsements required must be between 0 and 5.");
  }

  const maxMembers = body.max_members ? Number(body.max_members) : null;
  if (maxMembers !== null && (!Number.isInteger(maxMembers) || maxMembers < 2)) {
    errors.push("Member limit must be at least 2.");
  }

  const blob = `${name} ${String(body.description ?? "")} ${String(body.tagline ?? "")}`;
  const mod = moderateText(blob);
  if (!mod.ok && mod.reason) errors.push(mod.reason);

  if (errors.length) return NextResponse.json({ errors }, { status: 400 });

  const admin = createAdminClient();
  const slug = await uniqueSlug(admin, name);

  const { data: circle, error } = await admin
    .from("circles")
    .insert({
      slug,
      name,
      tagline: str(body.tagline, 140),
      description: str(body.description, 2000),
      interest: str(body.interest, 60),
      city: str(body.city, 100),
      cover_media: httpUrl(body.cover_media),
      privacy,
      sponsors_required: sponsorsRequired,
      max_members: maxMembers,
      guidelines: str(body.guidelines, 2000),
      created_by: user.id,
    })
    .select("id, slug")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { error: memberErr } = await admin.from("circle_members").insert({
    circle_id: circle.id,
    user_id: user.id,
    role: "host",
    status: "active",
    joined_at: new Date().toISOString(),
  });
  if (memberErr) {
    await admin.from("circles").delete().eq("id", circle.id); // avoid an orphan circle
    return NextResponse.json({ error: memberErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, slug: circle.slug });
}
