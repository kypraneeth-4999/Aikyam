import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import { isCategory } from "@/config/categories";
import { slugifyTitle } from "@/lib/slug";
import { rupeesToPaise } from "@/lib/money";
import { moderateText } from "@/lib/moderation";
import {
  LIMITS,
  httpUrl,
  parseISTLocal,
  str,
  tagList,
  validateEvent,
} from "@/lib/validation";

type AdminClient = ReturnType<typeof createAdminClient>;

async function uniqueSlug(admin: AdminClient, title: string): Promise<string> {
  const base = slugifyTitle(title) || "event";
  for (let i = 0; i < 5; i++) {
    const slug = `${base}-${Math.random().toString(36).slice(2, 8)}`;
    const { data } = await admin
      .from("events")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!data) return slug;
  }
  return `${base}-${Date.now().toString(36)}`;
}

/** Create an event as draft or published (P3). Organizer-only. */
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
    return NextResponse.json(
      { error: "Create your organizer page first." },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => ({}) as Record<string, unknown>);
  const publish = Boolean(body.publish);

  const errors = validateEvent(body, publish, isCategory);
  if (publish) {
    const mod = moderateText(
      `${String(body.title ?? "")} ${typeof body.description === "string" ? body.description : ""}`,
    );
    if (!mod.ok && mod.reason) errors.push(mod.reason);
  }
  if (errors.length) return NextResponse.json({ errors }, { status: 400 });

  const title = String(body.title).trim().slice(0, LIMITS.eventTitle.max);
  const isFree = Boolean(body.is_free);
  const price = isFree ? 0 : rupeesToPaise(Number(body.price ?? 0));
  const materials = body.materials === "byo" ? "byo" : "included";
  const addonRupees = Number(body.materials_addon_price ?? 0);
  const materialsAddon =
    materials === "byo" && Number.isFinite(addonRupees) && addonRupees > 0
      ? rupeesToPaise(addonRupees)
      : null;
  const endsAt = parseISTLocal(body.ends_at);

  const row: Record<string, unknown> = {
    title,
    category: String(body.category),
    description: str(body.description, LIMITS.eventDescription.max),
    cover_media: httpUrl(body.cover_media),
    photos: (Array.isArray(body.photos) ? body.photos : [])
      .map((p: unknown) => httpUrl(p))
      .filter((p: string | null): p is string => !!p)
      .slice(0, 7),
    starts_at: parseISTLocal(body.starts_at)!.toISOString(),
    ends_at: endsAt ? endsAt.toISOString() : null,
    venue_name: str(body.venue_name, LIMITS.venueName.max),
    address: str(body.address, 300),
    city: str(body.city, LIMITS.city.max),
    venue_type: body.venue_type === "private" ? "private" : "public",
    maps_url: httpUrl(body.maps_url),
    landmark: str(body.landmark, LIMITS.landmark.max),
    capacity: Number(body.capacity),
    price,
    is_free: isFree,
    currency: "INR",
    materials,
    materials_addon_price: materialsAddon,
    what_to_bring: str(body.what_to_bring, LIMITS.whatToBring.max),
    cancellation_policy: str(body.cancellation_policy, LIMITS.cancellationPolicy.max),
    languages: tagList(body.languages, LIMITS.languages),
    age_suitability: str(body.age_suitability, LIMITS.ageSuitability.max),
    tags: tagList(body.tags, LIMITS.tags),
    circle_id:
      typeof body.circle_id === "string" && body.circle_id ? body.circle_id : null,
    status: publish ? "published" : "draft",
    slug: publish ? await uniqueSlug(admin, title) : null,
  };

  const { data: ev, error } = await admin
    .from("events")
    .insert(row)
    .select("id, slug, status")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { error: linkErr } = await admin.from("event_organizers").insert({
    event_id: ev.id,
    organizer_id: org.id,
    role: "primary",
    status: "accepted",
  });
  if (linkErr) {
    await admin.from("events").delete().eq("id", ev.id); // avoid orphan
    return NextResponse.json({ error: linkErr.message }, { status: 500 });
  }

  return NextResponse.json({ id: ev.id, slug: ev.slug, status: ev.status });
}
