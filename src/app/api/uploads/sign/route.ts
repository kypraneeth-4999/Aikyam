import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";

const BUCKET = "event-media";
const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Issue a signed upload URL so the browser uploads directly to Storage.
 *  Organizer-only. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: org } = await admin
    .from("organizer_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!org) {
    return NextResponse.json({ error: "Organisers only." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}) as Record<string, unknown>);
  const ext = EXT[String(body.contentType ?? "")];
  if (!ext) {
    return NextResponse.json(
      { error: "Only JPEG, PNG, or WebP images are allowed." },
      { status: 400 },
    );
  }

  const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUploadUrl(path);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({
    bucket: BUCKET,
    path: data.path,
    token: data.token,
    publicUrl: pub.publicUrl,
  });
}
