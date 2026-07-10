import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. **Bypasses Row-Level Security.**
 *
 * Use ONLY inside trusted server code that owns the truth — Razorpay webhooks,
 * booking/payment confirmation, ticket verification, refunds, audit logging.
 * NEVER import this from a Client Component or expose the service-role key.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
