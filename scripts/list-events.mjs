// List recent events (dev tool).  node scripts/list-events.mjs
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

const { data, error } = await s
  .from("events")
  .select("slug, title, status, is_featured, cover_media, created_at")
  .order("created_at", { ascending: false })
  .limit(15);
if (error) {
  console.log("ERROR:", error.message);
  process.exit(1);
}
for (const e of data ?? []) {
  console.log(
    `${e.status.padEnd(9)} ${e.is_featured ? "★" : " "} ${e.cover_media ? "📷" : "  "} ${e.slug}  —  ${e.title}`,
  );
}
