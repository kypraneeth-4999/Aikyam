import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { normalizeHandleInput } from "@/lib/handles";
import { checkHandleAvailability } from "@/lib/supabase/handle-service";
import { rateLimit, clientIp } from "@/lib/rate-limit";

/** Live handle-availability check for the claim form. Auth required. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!rateLimit(`handle-check:${user.id}:${clientIp(request)}`, 30, 60_000)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const handle = normalizeHandleInput(String(body?.handle ?? ""));
  const result = await checkHandleAvailability(handle);
  return NextResponse.json(result);
}
