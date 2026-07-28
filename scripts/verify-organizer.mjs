// Admin tool: grant or revoke an organiser's verified badge.
//   node scripts/verify-organizer.mjs <handle>          -> verify
//   node scripts/verify-organizer.mjs <handle> false    -> un-verify
//   node scripts/verify-organizer.mjs --list            -> list verified
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
  const { data } = await s
    .from("organizer_profiles")
    .select("handle, verification_status")
    .eq("verification_status", "verified");
  console.log(`Verified organisers (${(data ?? []).length}):`);
  for (const o of data ?? []) console.log(`  · @${o.handle}`);
  process.exit(0);
}

const handle = arg.toLowerCase().replace(/^@/, "");
const verified = process.argv[3] !== "false";

const { data, error } = await s
  .from("organizer_profiles")
  .update({ verification_status: verified ? "verified" : "unverified" })
  .eq("handle_normalised", handle)
  .select("handle")
  .maybeSingle();

if (error) {
  console.log("ERROR:", error.message);
  process.exit(1);
}
if (!data) {
  console.log(`No organiser @${handle}.`);
  process.exit(1);
}

await s.from("audit_logs").insert({
  action: verified ? "organizer.verified" : "organizer.unverified",
  entity_type: "organizer_profile",
  entity_id: null,
  metadata: { handle },
});

console.log(`@${data.handle} is now ${verified ? "VERIFIED ✓" : "unverified"}.`);
