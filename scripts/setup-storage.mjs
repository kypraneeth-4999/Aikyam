// Create the public event-media storage bucket (idempotent). Run once.
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

const BUCKET = "event-media";
const { data: buckets, error: listErr } = await s.storage.listBuckets();
if (listErr) {
  console.log("List error:", listErr.message);
  process.exit(1);
}
if (buckets?.some((b) => b.name === BUCKET)) {
  console.log(`Bucket '${BUCKET}' already exists.`);
} else {
  const { error } = await s.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: "5MB",
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  });
  console.log(error ? `ERROR: ${error.message}` : `Created public bucket '${BUCKET}'.`);
}
