// Fully remove events by slug, including their bookings + tickets (bookings are
// ON DELETE RESTRICT, so they must go first). Dev cleanup only.
//   node scripts/purge-event.mjs <slug> [<slug> ...]
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

const slugs = process.argv.slice(2);
if (!slugs.length) {
  console.log("Usage: node scripts/purge-event.mjs <slug> [<slug> ...]");
  process.exit(1);
}

for (const slug of slugs) {
  const { data: ev } = await s.from("events").select("id").eq("slug", slug).maybeSingle();
  if (!ev) {
    console.log(`- ${slug}: not found`);
    continue;
  }
  // Delete bookings first (tickets/reviews cascade off bookings).
  await s.from("bookings").delete().eq("event_id", ev.id);
  const { error } = await s.from("events").delete().eq("id", ev.id); // event_organizers cascade
  console.log(error ? `- ${slug}: ERROR ${error.message}` : `- ${slug}: purged`);
}
