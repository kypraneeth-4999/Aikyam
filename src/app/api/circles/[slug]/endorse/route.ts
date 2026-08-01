import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import { fetchCircleBySlug, membershipFor } from "@/lib/circles";
import { str } from "@/lib/validation";

/**
 * Vouch for an applicant. Only active members may endorse — this edge is the
 * trust graph, so it has to come from someone already inside the circle.
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

  const mine = await membershipFor(admin, circle.id, user.id);
  if (!mine || mine.status !== "active") {
    return NextResponse.json(
      { error: "Only members of this circle can endorse someone." },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => ({}) as Record<string, unknown>);
  const applicantId = String(body.applicantId ?? "");
  if (!applicantId) {
    return NextResponse.json({ error: "Who are you endorsing?" }, { status: 400 });
  }
  if (applicantId === user.id) {
    return NextResponse.json({ error: "You can't endorse yourself." }, { status: 400 });
  }

  const { error } = await admin.from("circle_endorsements").insert({
    circle_id: circle.id,
    applicant_id: applicantId,
    endorser_id: user.id,
    note: str(body.note, 500),
  });
  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "You've already endorsed them." },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
