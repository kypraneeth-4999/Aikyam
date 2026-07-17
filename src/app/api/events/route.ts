import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import { isCategory } from "@/config/categories";
import { slugifyTitle } from "@/lib/slug";
import { rupeesToPaise } from "@/lib/money";

type AdminClient = ReturnType<typeof createAdminClient>;

/** Interpret a datetime-local value ("YYYY-MM-DDTHH:MM") as IST (Pune). */
function parseISTLocal(s: unknown): Date | null {
  if (typeof s !== "string" || !s) return null;
  const withSecs = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s) ? `${s}:00` : s;
  const d = new Date(`${withSecs}+05:30`);
  return Number.isNaN(d.getTime()) ? null : d;
}

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

const toArray = (v: unknown): string[] =>
  Array.isArray(v)
    ? v.map((x) => String(x).trim()).filter(Boolean)
    : typeof v === "string"
      ? v.split(",").map((x) => x.trim()).filter(Boolean)
      : [];

const str = (v: unknown): string | null => {
  const s = typeof v === "string" ? v.trim() : "";
  return s || null;
};

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
  const errors: string[] = [];

  const title = String(body.title ?? "").trim();
  if (title.length < 3) errors.push("Title must be at least 3 characters.");

  const category = String(body.category ?? "");
  if (!isCategory(category)) errors.push("Pick a category.");

  const isFree = Boolean(body.is_free);
  const priceRupees = Number(body.price ?? 0);
  if (!isFree && (!Number.isFinite(priceRupees) || priceRupees < 0)) {
    errors.push("Enter a valid ticket price.");
  }
  const price = isFree ? 0 : rupeesToPaise(priceRupees);

  const capacity = Number(body.capacity ?? 0);
  if (!Number.isInteger(capacity) || capacity < 1) {
    errors.push("Capacity must be a whole number of at least 1.");
  }

  const startsAt = parseISTLocal(body.starts_at);
  const endsAt = parseISTLocal(body.ends_at);
  if (!startsAt) errors.push("Start date & time is required.");
  if (endsAt && startsAt && endsAt < startsAt) {
    errors.push("End time must be after the start time.");
  }

  const materials = body.materials === "byo" ? "byo" : "included";
  const addonRupees = Number(body.materials_addon_price ?? 0);
  const materialsAddon =
    materials === "byo" && Number.isFinite(addonRupees) && addonRupees > 0
      ? rupeesToPaise(addonRupees)
      : null;

  const venueName = str(body.venue_name);
  if (publish && !venueName) errors.push("Venue name is required to publish.");

  if (errors.length) return NextResponse.json({ errors }, { status: 400 });

  const row: Record<string, unknown> = {
    title,
    category,
    description: str(body.description),
    starts_at: startsAt!.toISOString(),
    ends_at: endsAt ? endsAt.toISOString() : null,
    venue_name: venueName,
    maps_url: str(body.maps_url),
    landmark: str(body.landmark),
    capacity,
    price,
    is_free: isFree,
    currency: "INR",
    materials,
    materials_addon_price: materialsAddon,
    what_to_bring: str(body.what_to_bring),
    cancellation_policy: str(body.cancellation_policy),
    languages: toArray(body.languages),
    age_suitability: str(body.age_suitability),
    tags: toArray(body.tags),
    status: publish ? "published" : "draft",
    slug: publish ? await uniqueSlug(admin, title) : null,
  };

  const { data: ev, error } = await admin
    .from("events")
    .insert(row)
    .select("id, slug, status")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { error: linkErr } = await admin
    .from("event_organizers")
    .insert({ event_id: ev.id, organizer_id: org.id, role: "primary" });
  if (linkErr) {
    await admin.from("events").delete().eq("id", ev.id); // avoid orphan
    return NextResponse.json({ error: linkErr.message }, { status: 500 });
  }

  return NextResponse.json({ id: ev.id, slug: ev.slug, status: ev.status });
}
