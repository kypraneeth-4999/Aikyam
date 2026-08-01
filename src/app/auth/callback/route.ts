import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Only same-site paths, so `?next=` can't be turned into an open redirect. */
function safeNext(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//")
    ? next
    : "/onboarding";
}

function fail(origin: string, reason: string) {
  // Surfaced on /login — a silent bounce back to the form is undebuggable.
  console.error("[auth/callback]", reason);
  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent(reason)}`,
  );
}

/** OAuth (Google) redirect target — exchanges the code for a session cookie. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  // Supabase/Google bounce back with these when the provider itself refuses.
  const providerError =
    searchParams.get("error_description") ?? searchParams.get("error");
  if (providerError) return fail(origin, providerError);

  if (!code) return fail(origin, "No authorisation code was returned.");

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return fail(origin, error.message);

  return NextResponse.redirect(`${origin}${next}`);
}
