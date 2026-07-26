"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function InviteActions({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function respond(accept: boolean) {
    setBusy(true);
    try {
      const res = await fetch(`/api/events/${eventId}/organizers/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accept }),
      });
      if (res.ok) router.refresh();
      else setBusy(false);
    } catch {
      setBusy(false);
    }
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => respond(true)}
        disabled={busy}
        className="rounded-full bg-gold px-3 py-1 text-xs font-semibold text-ink transition-colors hover:bg-saffron disabled:opacity-50"
      >
        Accept
      </button>
      <button
        onClick={() => respond(false)}
        disabled={busy}
        className="rounded-full border border-border px-3 py-1 text-xs text-muted disabled:opacity-50"
      >
        Decline
      </button>
    </div>
  );
}
