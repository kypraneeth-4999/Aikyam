"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CancelEventButton({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function cancel() {
    if (
      !confirm(
        "Cancel this event and refund all attendees? This can't be undone.",
      )
    )
      return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/events/${eventId}/cancel`, { method: "POST" });
      const d = await res.json();
      if (!res.ok) {
        setErr(d.error ?? "Failed to cancel.");
        setBusy(false);
        return;
      }
      router.refresh();
    } catch {
      setErr("Network error.");
      setBusy(false);
    }
  }

  return (
    <div className="text-right">
      <button
        onClick={cancel}
        disabled={busy}
        className="rounded-full border border-crimson/40 bg-crimson/10 px-4 py-2 text-sm font-medium text-crimson transition-colors hover:bg-crimson/20 disabled:opacity-50"
      >
        {busy ? "Cancelling…" : "Cancel event"}
      </button>
      {err && <p className="mt-1 text-xs text-crimson">{err}</p>}
    </div>
  );
}

export function RefundButton({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function refund() {
    if (!confirm("Refund this booking?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/refund`, {
        method: "POST",
      });
      if (res.ok) router.refresh();
      else {
        alert("Refund failed.");
        setBusy(false);
      }
    } catch {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={refund}
      disabled={busy}
      className="text-xs text-crimson transition-colors hover:underline disabled:opacity-50"
    >
      {busy ? "…" : "Refund"}
    </button>
  );
}
