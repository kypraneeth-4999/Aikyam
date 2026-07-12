// Dev utility: verify the Supabase schema migration applied.
// Reads .env.local, connects with the service-role key, and checks every
// expected table exists + the reserved-handle seed loaded. Prints no secrets.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv(path) {
  const out = {};
  let txt;
  try {
    txt = readFileSync(path, "utf8");
  } catch {
    return out;
  }
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[m[1]] = v;
  }
  return out;
}

const env = loadEnv(".env.local");
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

console.log("URL present:", Boolean(url));
console.log("service_role key present:", Boolean(key));
if (!url || !key) {
  console.log(
    "RESULT: keys missing — fill NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.",
  );
  process.exit(0);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const tables = [
  "users",
  "organizer_profiles",
  "reserved_handles",
  "events",
  "event_organizers",
  "bookings",
  "tickets",
  "reviews",
  "audit_logs",
  "reports",
];

let ok = 0;
for (const t of tables) {
  const { error, count } = await supabase
    .from(t)
    .select("*", { count: "exact", head: true });
  if (error) {
    console.log(`  ✗ ${t}: ${error.code ?? ""} ${error.message}`);
  } else {
    ok++;
    console.log(`  ✓ ${t}${count != null ? ` (${count} rows)` : ""}`);
  }
}

console.log(`RESULT: ${ok}/${tables.length} tables present.`);
