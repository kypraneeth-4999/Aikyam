import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import { userOrganizesEvent } from "@/lib/authz";

/** One-time organiser response to a review (P11). */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}) as Record<string, unknown>);
  const response =
    typeof body.response === "string" ? body.response.trim().slice(0, 1000) : "";
  if (!response) {
    return NextResponse.json({ error: "Response can't be empty." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: review } = await admin
    .from("reviews")
    .select("id, event_id, organizer_response")
    .eq("id", id)
    .maybeSingle();
  if (!review) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!(await userOrganizesEvent(admin, user.id, review.event_id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (review.organizer_response) {
    return NextResponse.json({ error: "Already responded." }, { status: 409 });
  }

  await admin.from("reviews").update({ organizer_response: response }).eq("id", id);
  return NextResponse.json({ ok: true });
}
