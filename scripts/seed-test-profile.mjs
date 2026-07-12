// Dev utility: create (or clean up) a throwaway organizer profile to verify the
// public /@handle page renders against the real DB. NOT for production data.
//   node scripts/seed-test-profile.mjs create
//   node scripts/seed-test-profile.mjs cleanup
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv(path) {
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

const env = loadEnv(".env.local");
const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const EMAIL = "seed-test-organizer@example.com";
const HANDLE = "test-studio";

async function findUserId() {
  const { data } = await supabase
    .from("organizer_profiles")
    .select("user_id")
    .eq("handle_normalised", HANDLE)
    .maybeSingle();
  return data?.user_id ?? null;
}

async function cleanup() {
  const uid = await findUserId();
  if (uid) {
    await supabase.auth.admin.deleteUser(uid); // cascades to users -> organizer_profiles
    console.log("Deleted test user + profile.");
  } else {
    console.log("Nothing to clean up.");
  }
}

async function create() {
  await cleanup(); // idempotent
  const { data: created, error: cErr } = await supabase.auth.admin.createUser({
    email: EMAIL,
    email_confirm: true,
    user_metadata: { name: "Test Studio" },
  });
  if (cErr) throw cErr;
  const uid = created.user.id;

  // Trigger populates public.users; ensure name/city set.
  await supabase.from("users").update({ name: "Test Studio", city: "Pune" }).eq("id", uid);

  const { data: prof, error: pErr } = await supabase
    .from("organizer_profiles")
    .insert({
      user_id: uid,
      handle: HANDLE,
      handle_normalised: HANDLE,
      bio: "We run weekend pottery and folk-art workshops across Pune.",
      city: "Pune",
    })
    .select("handle")
    .single();
  if (pErr) throw pErr;
  console.log(`Created profile @${prof.handle} (user ${uid}).`);
}

const cmd = process.argv[2];
if (cmd === "cleanup") await cleanup();
else await create();
