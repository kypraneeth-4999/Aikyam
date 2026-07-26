import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import { organizerProfileId } from "@/lib/authz";

/** The invited organiser accepts or declines a co-host invite. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const orgId = await organizerProfileId(admin, user.id);
  if (!orgId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => ({}) as Record<string, unknown>);
  const accept = Boolean(body.accept);

  const { data: invite } = await admin
    .from("event_organizers")
    .select("status, role")
    .eq("event_id", id)
    .eq("organizer_id", orgId)
    .maybeSingle();
  if (!invite || invite.status !== "pending" || invite.role !== "cohost") {
    return NextResponse.json({ error: "No pending invite." }, { status: 404 });
  }

  await admin
    .from("event_organizers")
    .update({ status: accept ? "accepted" : "declined" })
    .eq("event_id", id)
    .eq("organizer_id", orgId);

  return NextResponse.json({ ok: true });
}
