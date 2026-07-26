// Verify co-organiser data model + invite→accept flow + external collaborators.
// Creates a throwaway cohost organiser and cleans it up.
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

let pass = 0,
  fail = 0;
const check = (n, ok, extra = "") => {
  console.log(`  ${ok ? "✓" : "✗"} ${n}${extra ? ` — ${extra}` : ""}`);
  ok ? pass++ : fail++;
};

console.log("Migration + data model:");
const c1 = await s.from("event_organizers").select("status").limit(1);
check("event_organizers.status column exists", !c1.error, c1.error?.message);
const c2 = await s.from("events").select("collaborators").limit(1);
check("events.collaborators column exists", !c2.error, c2.error?.message);
const { data: allEo } = await s.from("event_organizers").select("status");
const nonAccepted = (allEo ?? []).filter((e) => e.status !== "accepted").length;
check("existing organiser rows are 'accepted'", nonAccepted === 0, `${nonAccepted} not accepted`);

// Find a primary event owned by @ykpraneeth.
const { data: org } = await s.from("organizer_profiles").select("id").eq("handle_normalised", "ykpraneeth").maybeSingle();
const { data: primaryLink } = org
  ? await s.from("event_organizers").select("event_id").eq("organizer_id", org.id).eq("role", "primary").limit(1).maybeSingle()
  : { data: null };
const eventId = primaryLink?.event_id;
if (!eventId) {
  console.log("No primary event for @ykpraneeth — create one first.");
  process.exit(1);
}

console.log("\nInvite → accept flow:");
// Clean any prior throwaway.
const { data: prior } = await s.from("organizer_profiles").select("user_id").eq("handle_normalised", "seed-cohost").maybeSingle();
if (prior) await s.auth.admin.deleteUser(prior.user_id);

const { data: created } = await s.auth.admin.createUser({
  email: "seed-cohost@example.com",
  email_confirm: true,
  user_metadata: { name: "Seed Cohost" },
});
const uid = created.user.id;
const { data: cohost, error: cpErr } = await s
  .from("organizer_profiles")
  .insert({ user_id: uid, handle: "seed-cohost", handle_normalised: "seed-cohost" })
  .select("id")
  .single();
check("throwaway cohost organiser created", !cpErr && !!cohost, cpErr?.message);
const cohostId = cohost.id;

const { error: invErr } = await s
  .from("event_organizers")
  .insert({ event_id: eventId, organizer_id: cohostId, role: "cohost", status: "pending" });
check("invite inserts as pending", !invErr, invErr?.message);

const { data: pend } = await s.from("event_organizers").select("event_id").eq("organizer_id", cohostId).eq("status", "pending");
check("shows as a pending invite for the cohost", (pend ?? []).length === 1);

const { data: accBefore } = await s.from("event_organizers").select("event_id").eq("event_id", eventId).eq("organizer_id", cohostId).eq("status", "accepted");
check("pending cohost has NO access yet (accepted-only gate)", (accBefore ?? []).length === 0);

await s.from("event_organizers").update({ status: "accepted" }).eq("event_id", eventId).eq("organizer_id", cohostId);
const { data: accAfter } = await s.from("event_organizers").select("event_id").eq("event_id", eventId).eq("organizer_id", cohostId).eq("status", "accepted");
check("after accept, cohost gains access", (accAfter ?? []).length === 1);

const { data: coOnEvent } = await s.from("event_organizers").select("organizer_id").eq("event_id", eventId).eq("role", "cohost").eq("status", "accepted");
check("accepted cohost appears on the event", (coOnEvent ?? []).some((c) => c.organizer_id === cohostId));

console.log("\nExternal collaborators:");
await s.from("events").update({ collaborators: [{ name: "Test External" }] }).eq("id", eventId);
const { data: evc } = await s.from("events").select("collaborators").eq("id", eventId).maybeSingle();
check("external collaborator stored on event", Array.isArray(evc?.collaborators) && evc.collaborators.some((c) => c.name === "Test External"));
await s.from("events").update({ collaborators: [] }).eq("id", eventId);

// Cleanup throwaway (cascades to organizer_profiles + event_organizers).
await s.auth.admin.deleteUser(uid);
console.log("\nCleaned up throwaway cohost.");
console.log(`RESULT: ${pass} passed, ${fail} failed.`);
process.exit(fail ? 1 : 0);
