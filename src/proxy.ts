import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// Next.js 16 "proxy" convention (formerly middleware).
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // CSRF defence: mutating API requests must originate from our own site.
  // Exempt: webhooks (no Origin; verified by signature) and cron jobs
  // (no Origin; verified by CRON_SECRET).
  if (
    !SAFE_METHODS.has(request.method) &&
    pathname.startsWith("/api/") &&
    !pathname.startsWith("/api/webhooks/") &&
    !pathname.startsWith("/api/cron/")
  ) {
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");
    let ok = false;
    try {
      ok = !!origin && !!host && new URL(origin).host === host;
    } catch {
      ok = false;
    }
    if (!ok) {
      return NextResponse.json({ error: "Bad origin." }, { status: 403 });
    }
  }

  // Refresh the Supabase auth session.
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets and image files.
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
