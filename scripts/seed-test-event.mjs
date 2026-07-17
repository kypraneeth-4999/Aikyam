// Dev utility: seed (or remove) a published event under an existing organizer,
// to verify the public /e/:slug page. NOT for production data.
//   node scripts/seed-test-event.mjs create [handle]
//   node scripts/seed-test-event.mjs cleanup
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv(path) {
  const o = {};
  for (const l of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) o[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return o;
}

const env = loadEnv(".env.local");
const s = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const SLUG = "seed-pottery-demo";
const cmd = process.argv[2] ?? "create";
const handle = (process.argv[3] ?? "ykpraneeth").toLowerCase().replace(/^@/, "");

async function cleanup() {
  const { data } = await s.from("events").select("id").eq("slug", SLUG).maybeSingle();
  if (data) {
    await s.from("events").delete().eq("id", data.id); // cascades to event_organizers
    console.log("Removed seeded event.");
  } else {
    console.log("Nothing to clean up.");
  }
}

async function create() {
  await cleanup();
  const { data: org, error: oErr } = await s
    .from("organizer_profiles")
    .select("id")
    .eq("handle_normalised", handle)
    .maybeSingle();
  if (oErr || !org) {
    console.log(`No organizer @${handle} found.`);
    process.exit(1);
  }

  const start = new Date(Date.now() + 7 * 864e5);
  start.setHours(18, 0, 0, 0);
  const end = new Date(start.getTime() + 2 * 36e5);

  const { data: ev, error } = await s
    .from("events")
    .insert({
      slug: SLUG,
      title: "Weekend Wheel-Throwing Pottery",
      category: "Pottery",
      description:
        "A hands-on intro to the potter's wheel. Leave with two pieces you made yourself.",
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
      venue_name: "The Clay Studio, Kothrud",
      landmark: "Near Mhatre bridge",
      capacity: 15,
      price: 80000,
      is_free: false,
      currency: "INR",
      materials: "included",
      languages: ["English", "Marathi"],
      age_suitability: "16+",
      tags: ["beginner", "hands-on"],
      status: "published",
    })
    .select("id")
    .single();
  if (error) {
    console.log("Insert error:", error.message);
    process.exit(1);
  }

  const { error: linkErr } = await s
    .from("event_organizers")
    .insert({ event_id: ev.id, organizer_id: org.id, role: "primary" });
  if (linkErr) {
    console.log("Link error:", linkErr.message);
    process.exit(1);
  }
  console.log(`Seeded event /e/${SLUG} under @${handle}.`);
}

if (cmd === "cleanup") await cleanup();
else await create();
