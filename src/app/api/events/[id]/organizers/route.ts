import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import { userIsPrimaryOrganizer } from "@/lib/authz";
import { normalizeHandleInput } from "@/lib/handles";
import { sendCoorganizerInvite } from "@/lib/notifications";

/** Add a co-organiser: invite an on-app organiser by handle (pending), or add
 *  an off-app collaborator by name. Primary organiser only. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  if (!(await userIsPrimaryOrganizer(admin, user.id, id))) {
    return NextResponse.json({ error: "Only the primary organiser can do this." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}) as Record<string, unknown>);
  const handle = normalizeHandleInput(String(body.handle ?? ""));
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 100) : "";

  if (handle) {
    const { data: op } = await admin
      .from("organizer_profiles")
      .select("id, user_id")
      .eq("handle_normalised", handle)
      .maybeSingle();
    if (!op) {
      return NextResponse.json(
        { notFound: true, error: "No organiser with that handle — add them as an external name." },
        { status: 404 },
      );
    }
    const { data: existing } = await admin
      .from("event_organizers")
      .select("status")
      .eq("event_id", id)
      .eq("organizer_id", op.id)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ error: "Already invited or added." }, { status: 409 });
    }
    const { error } = await admin.from("event_organizers").insert({
      event_id: id,
      organizer_id: op.id,
      role: "cohost",
      status: "pending",
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await sendCoorganizerInvite(admin, id, op.user_id);
    return NextResponse.json({ ok: true, invited: handle });
  }

  if (name) {
    const { data: ev } = await admin
      .from("events")
      .select("collaborators")
      .eq("id", id)
      .maybeSingle();
    const collaborators = Array.isArray(ev?.collaborators)
      ? (ev.collaborators as { name: string }[])
      : [];
    if (!collaborators.some((c) => c.name === name)) collaborators.push({ name });
    await admin.from("events").update({ collaborators }).eq("id", id);
    return NextResponse.json({ ok: true, added: name });
  }

  return NextResponse.json({ error: "Provide a handle or a name." }, { status: 400 });
}

/** Remove a co-organiser (by organizerId) or an external collaborator (by name). */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  if (!(await userIsPrimaryOrganizer(admin, user.id, id))) {
    return NextResponse.json({ error: "Only the primary organiser can do this." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}) as Record<string, unknown>);
  const organizerId = body.organizerId ? String(body.organizerId) : "";
  const name = typeof body.name === "string" ? body.name : "";

  if (organizerId) {
    const { data: row } = await admin
      .from("event_organizers")
      .select("role")
      .eq("event_id", id)
      .eq("organizer_id", organizerId)
      .maybeSingle();
    if (row?.role === "primary") {
      return NextResponse.json({ error: "Can't remove the primary organiser." }, { status: 400 });
    }
    await admin
      .from("event_organizers")
      .delete()
      .eq("event_id", id)
      .eq("organizer_id", organizerId);
    return NextResponse.json({ ok: true });
  }

  if (name) {
    const { data: ev } = await admin
      .from("events")
      .select("collaborators")
      .eq("id", id)
      .maybeSingle();
    const collaborators = (
      Array.isArray(ev?.collaborators) ? (ev.collaborators as { name: string }[]) : []
    ).filter((c) => c.name !== name);
    await admin.from("events").update({ collaborators }).eq("id", id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Nothing to remove." }, { status: 400 });
}
