// Dev utility: print an organizer profile + its owner for verification.
//   node scripts/show-profile.mjs <handle>
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

const handle = (process.argv[2] || "").toLowerCase().replace(/^@/, "");
const { data: prof, error } = await s
  .from("organizer_profiles")
  .select("*")
  .eq("handle_normalised", handle)
  .maybeSingle();

if (error) {
  console.log("ERROR:", error.message);
  process.exit(1);
}
if (!prof) {
  console.log(`No profile found for @${handle}`);
  process.exit(0);
}

const { data: u } = await s
  .from("users")
  .select("name, email, city, default_role")
  .eq("id", prof.user_id)
  .maybeSingle();

console.log("Profile:");
console.log("  handle:        ", prof.handle, "(normalised:", prof.handle_normalised + ")");
console.log("  bio:           ", prof.bio);
console.log("  city:          ", prof.city);
console.log("  verification:  ", prof.verification_status);
console.log("  created_at:    ", prof.created_at);
console.log("Owner (users):");
console.log("  name:          ", u?.name);
console.log("  default_role:  ", u?.default_role);
console.log("  email present: ", Boolean(u?.email));
