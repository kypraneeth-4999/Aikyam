"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LIMITS } from "@/lib/validation";

export function ReviewForm({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    if (rating < 1) {
      setErr("Pick a rating.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, rating, comment }),
      });
      const d = await res.json();
      if (!res.ok) {
        setErr(d.error ?? "Failed to submit.");
        setBusy(false);
        return;
      }
      router.refresh();
    } catch {
      setErr("Network error.");
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs font-medium text-gold transition-colors hover:text-saffron"
      >
        Leave a review
      </button>
    );
  }

  return (
    <div className="mt-2 rounded-xl border border-border bg-surface2 p-3">
      <div className="flex gap-1 text-lg">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            className={n <= rating ? "text-gold" : "text-muted"}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
        maxLength={LIMITS.reviewComment.max}
        placeholder="How was it? (optional)"
        className="mt-2 w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-cream outline-none focus:border-gold/40"
      />
      {err && <p className="mt-1 text-xs text-crimson">{err}</p>}
      <button
        onClick={submit}
        disabled={busy}
        className="mt-2 rounded-full bg-gold px-3 py-1 text-xs font-semibold text-ink transition-colors hover:bg-saffron disabled:opacity-50"
      >
        {busy ? "…" : "Submit review"}
      </button>
    </div>
  );
}
