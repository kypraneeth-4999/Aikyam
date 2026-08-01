import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import { fetchCircleBySlug, membershipFor } from "@/lib/circles";
import { moderateText } from "@/lib/moderation";
import { str } from "@/lib/validation";

/**
 * Apply to (or instantly join) a circle.
 *
 * Open circles admit immediately. Approval and invite-only circles create a
 * pending application for the host to decide on — invite-only additionally
 * requires that an existing member sponsored them, which is what makes
 * membership invitation-led rather than open-door.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const circle = await fetchCircleBySlug(admin, slug);
  if (!circle) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const existing = await membershipFor(admin, circle.id, user.id);
  if (existing && existing.status === "active") {
    return NextResponse.json({ error: "You're already a member." }, { status: 409 });
  }
  if (existing && existing.status === "applied") {
    return NextResponse.json({ error: "Your application is pending." }, { status: 409 });
  }

  const body = await request.json().catch(() => ({}) as Record<string, unknown>);
  const intro = str(body.intro, 1000);
  if (intro) {
    const mod = moderateText(intro);
    if (!mod.ok) return NextResponse.json({ error: mod.reason }, { status: 400 });
  }

  // Capacity check counts active members only.
  if (circle.max_members) {
    const { count } = await admin
      .from("circle_members")
      .select("id", { count: "exact", head: true })
      .eq("circle_id", circle.id)
      .eq("status", "active");
    if ((count ?? 0) >= circle.max_members) {
      return NextResponse.json({ error: "This circle is full." }, { status: 409 });
    }
  }

  // Invite-only: an existing active member must have sponsored them.
  let sponsoredBy: string | null = null;
  if (circle.privacy === "invite_only") {
    const wasInvited = existing?.status === "invited";
    const { data: endorsement } = await admin
      .from("circle_endorsements")
      .select("endorser_id")
      .eq("circle_id", circle.id)
      .eq("applicant_id", user.id)
      .limit(1)
      .maybeSingle();
    if (!wasInvited && !endorsement) {
      return NextResponse.json(
        { error: "This circle is invite only — you need a member to sponsor you." },
        { status: 403 },
      );
    }
    sponsoredBy = (endorsement?.endorser_id as string) ?? null;
  }

  const instant = circle.privacy === "open" || existing?.status === "invited";
  const row = {
    circle_id: circle.id,
    user_id: user.id,
    role: "member" as const,
    status: instant ? ("active" as const) : ("applied" as const),
    intro,
    sponsored_by: sponsoredBy,
    joined_at: instant ? new Date().toISOString() : null,
  };

  const { error } = existing
    ? await admin
        .from("circle_members")
        .update(row)
        .eq("circle_id", circle.id)
        .eq("user_id", user.id)
    : await admin.from("circle_members").insert(row);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, status: row.status });
}
