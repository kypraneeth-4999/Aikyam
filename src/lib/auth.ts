import { createClient } from "@/lib/supabase/server";

/** True once the Supabase env vars are present (i.e. after Slice 0 external setup). */
export function supabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/**
 * The authenticated Supabase auth user, or null.
 * Safe to call before Supabase is configured (returns null instead of throwing),
 * so the Slice 0 shell keeps rendering.
 */
export async function getCurrentUser() {
  if (!supabaseConfigured()) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
