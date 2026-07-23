// Admin tool: feature / unfeature an event (drives the homepage hero + badge).
//   node scripts/set-featured.mjs <slug>            -> feature it
//   node scripts/set-featured.mjs <slug> false      -> unfeature it
//   node scripts/set-featured.mjs --list            -> list featured events
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
const s = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const arg = process.argv[2];

if (!arg || arg === "--list") {
  const { data, error } = await s
    .from("events")
    .select("slug, title, status")
    .eq("is_featured", true)
    .order("starts_at", { ascending: true });
  if (error) {
    console.log("ERROR:", error.message);
    process.exit(1);
  }
  console.log(`Featured events (${(data ?? []).length}):`);
  for (const e of data ?? []) console.log(`  · ${e.slug} — ${e.title} [${e.status}]`);
  process.exit(0);
}

const slug = arg.replace(/^\/?e\//, "");
const value = process.argv[3] !== "false";
const { data, error } = await s
  .from("events")
  .update({ is_featured: value })
  .eq("slug", slug)
  .select("slug, title")
  .maybeSingle();
if (error) {
  console.log("ERROR:", error.message);
  process.exit(1);
}
if (!data) {
  console.log(`No event with slug '${slug}'.`);
  process.exit(1);
}
console.log(`${value ? "Featured" : "Unfeatured"}: ${data.title} (/e/${data.slug})`);
