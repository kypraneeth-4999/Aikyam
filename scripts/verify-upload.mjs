// Verify the storage plumbing: create a signed upload URL (service role),
// upload a 1x1 PNG via the anon client (as the browser would), then confirm the
// public URL serves it. Cleans up after.
import { readFileSync } from "node:fs";
import crypto from "node:crypto";
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
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

const BUCKET = "event-media";
const path = `test/${crypto.randomUUID()}.png`;
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

const { data: signed, error: sErr } = await admin.storage
  .from(BUCKET)
  .createSignedUploadUrl(path);
console.log("signed url created:", !sErr, sErr?.message ?? "");

const { error: uErr } = await anon.storage
  .from(BUCKET)
  .uploadToSignedUrl(signed.path, signed.token, png, { contentType: "image/png" });
console.log("uploaded via anon signed url:", !uErr, uErr?.message ?? "");

const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
const r = await fetch(pub.publicUrl);
console.log(
  "public URL serves:",
  r.status === 200,
  `(status ${r.status}, type ${r.headers.get("content-type")})`,
);

await admin.storage.from(BUCKET).remove([path]);
console.log("cleaned up test file.");
