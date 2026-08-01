import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import { fetchCircleBySlug, membershipFor, userLeadsCircle } from "@/lib/circles";

/**
 * Host decisions on a membership: approve, decline, remove, or promote.
 * Only hosts/cohosts may call this; the host role itself can't be removed.
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

  if (!(await userLeadsCircle(admin, circle.id, user.id))) {
    return NextResponse.json(
      { error: "Only the circle's host can do this." },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => ({}) as Record<string, unknown>);
  const memberUserId = String(body.userId ?? "");
  const action = String(body.action ?? "");
  if (!memberUserId || !["approve", "decline", "remove", "promote"].includes(action)) {
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }

  const target = await membershipFor(admin, circle.id, memberUserId);
  if (!target) return NextResponse.json({ error: "Not a member." }, { status: 404 });
  if (target.role === "host") {
    return NextResponse.json(
      { error: "The host's own membership can't be changed." },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { decided_by: user.id, decided_at: now };

  if (action === "approve") {
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
    // Respect the circle's endorsement bar before admitting anyone.
    if (circle.sponsors_required > 0) {
      const { count } = await admin
        .from("circle_endorsements")
        .select("id", { count: "exact", head: true })
        .eq("circle_id", circle.id)
        .eq("applicant_id", memberUserId);
      if ((count ?? 0) < circle.sponsors_required) {
        return NextResponse.json(
          {
            error: `This circle requires ${circle.sponsors_required} endorsement(s); this applicant has ${count ?? 0}.`,
          },
          { status: 409 },
        );
      }
    }
    patch.status = "active";
    patch.joined_at = now;
  } else if (action === "decline") {
    patch.status = "declined";
  } else if (action === "remove") {
    patch.status = "left";
  } else if (action === "promote") {
    patch.role = "cohost";
  }

  const { error } = await admin
    .from("circle_members")
    .update(patch)
    .eq("circle_id", circle.id)
    .eq("user_id", memberUserId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("audit_logs").insert({
    actor_user_id: user.id,
    action: `circle.member_${action}`,
    entity_type: "circle",
    entity_id: circle.id,
    metadata: { member: memberUserId },
  });

  return NextResponse.json({ ok: true });
}
