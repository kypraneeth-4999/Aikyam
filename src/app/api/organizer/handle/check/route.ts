import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { normalizeHandleInput } from "@/lib/handles";
import { checkHandleAvailability } from "@/lib/supabase/handle-service";

/** Live handle-availability check for the claim form. Auth required. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const handle = normalizeHandleInput(String(body?.handle ?? ""));
  const result = await checkHandleAvailability(handle);
  return NextResponse.json(result);
}
