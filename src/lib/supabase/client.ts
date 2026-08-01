import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for use in Client Components (browser).
 * Uses the public anon key — all access is governed by Row-Level Security.
 *
 * `NEXT_PUBLIC_*` values are inlined into the browser bundle at **build** time,
 * so a host that has them set at runtime but not during the build ships a
 * bundle without them. Naming the missing variable turns that into a readable
 * message instead of a dead button.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const missing = [
    !url && "NEXT_PUBLIC_SUPABASE_URL",
    !anonKey && "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  ].filter(Boolean);

  if (missing.length) {
    throw new Error(
      `Sign-in is unavailable: ${missing.join(" and ")} ${
        missing.length > 1 ? "were" : "was"
      } missing when this build was made. Set them in the host's environment and redeploy without the build cache.`,
    );
  }

  return createBrowserClient(url!, anonKey!);
}
