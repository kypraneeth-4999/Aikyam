"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatINR } from "@/lib/money";

type Props = {
  slug: string;
  eventTitle: string;
  isFree: boolean;
  price: number;
  materials: "included" | "byo";
  addonPrice: number | null;
  maxSeats: number;
  defaultName: string;
};

type RazorpayInstance = { open: () => void };
type RazorpayCtor = new (options: Record<string, unknown>) => RazorpayInstance;

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as unknown as { Razorpay?: RazorpayCtor }).Razorpay) {
      return resolve(true);
    }
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export function BookingForm({
  slug,
  eventTitle,
  isFree,
  price,
  materials,
  addonPrice,
  maxSeats,
  defaultName,
}: Props) {
  const router = useRouter();
  const [seats, setSeats] = useState(1);
  const [names, setNames] = useState<string[]>([defaultName]);
  const [withAddon, setWithAddon] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "processing" | "cancelled" | "error" | "redirecting"
  >("idle");
  const [error, setError] = useState<string | null>(null);

  const offersAddon = materials === "byo" && !!addonPrice;
  const perSeat = price + (withAddon && addonPrice ? addonPrice : 0);
  const total = isFree ? 0 : seats * perSeat;
  const busy = status === "processing" || status === "redirecting";

  function setSeatCount(n: number) {
    const next = Math.max(1, Math.min(maxSeats, n));
    setSeats(next);
    setNames((prev) => {
      const arr = prev.slice(0, next);
      while (arr.length < next) arr.push("");
      if (!arr[0]) arr[0] = defaultName;
      return arr;
    });
  }

  async function pollUntilPaid(bookingId: string) {
    setStatus("processing");
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 1500));
      try {
        const r = await fetch(`/api/bookings/${bookingId}`);
        const d = await r.json();
        if (d.status === "paid" && d.ticketId) {
          setStatus("redirecting");
          router.push(`/tickets/${d.ticketId}`);
          return;
        }
      } catch {
        /* keep polling */
      }
    }
    setError("Payment is taking longer than expected — check My Tickets shortly.");
    setStatus("error");
  }

  async function pay() {
    setError(null);
    setStatus("processing");
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          seats,
          with_addon: withAddon,
          guest_names: names,
          idempotency_key: crypto.randomUUID(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not create the booking.");
        setStatus("error");
        return;
      }

      // Free event — ticket already issued.
      if (data.status === "paid" && data.ticketId) {
        setStatus("redirecting");
        router.push(`/tickets/${data.ticketId}`);
        return;
      }

      // Paid event — open Razorpay Checkout.
      const ok = await loadRazorpay();
      if (!ok) {
        setError("Couldn't load the payment window. Please retry.");
        setStatus("error");
        return;
      }
      const Razorpay = (window as unknown as { Razorpay: RazorpayCtor }).Razorpay;
      const rzp = new Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: "INR",
        order_id: data.razorpayOrderId,
        name: "Aikyam",
        description: eventTitle,
        prefill: { name: names[0] || defaultName },
        // The handler is NOT trusted — we confirm via the webhook by polling.
        handler: () => pollUntilPaid(data.bookingId),
        modal: { ondismiss: () => setStatus("cancelled") },
      });
      rzp.open();
    } catch {
      setError("Network error. Please try again.");
      setStatus("error");
    }
  }

  return (
    <div className="mt-6 space-y-5">
      <div>
        <label className="block text-sm font-medium">Seats</label>
        <div className="mt-1 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSeatCount(seats - 1)}
            disabled={busy || seats <= 1}
            className="h-9 w-9 rounded-lg border border-black/10 text-lg disabled:opacity-40 dark:border-white/15"
          >
            −
          </button>
          <span className="w-8 text-center text-sm font-medium">{seats}</span>
          <button
            type="button"
            onClick={() => setSeatCount(seats + 1)}
            disabled={busy || seats >= maxSeats}
            className="h-9 w-9 rounded-lg border border-black/10 text-lg disabled:opacity-40 dark:border-white/15"
          >
            +
          </button>
          <span className="text-xs text-zinc-500">{maxSeats} available</span>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium">Guest names</label>
        {names.map((n, i) => (
          <input
            key={i}
            value={n}
            onChange={(e) =>
              setNames((prev) => prev.map((v, j) => (j === i ? e.target.value : v)))
            }
            placeholder={`Guest ${i + 1}`}
            className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 dark:border-white/15"
          />
        ))}
      </div>

      {offersAddon && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={withAddon}
            onChange={(e) => setWithAddon(e.target.checked)}
          />
          Add materials ({formatINR(addonPrice!)} per seat)
        </label>
      )}

      <div className="flex items-center justify-between rounded-xl border border-black/10 p-4 dark:border-white/15">
        <span className="text-sm text-zinc-500">Total</span>
        <span className="text-lg font-semibold">
          {isFree ? "Free" : formatINR(total)}
        </span>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {status === "cancelled" && (
        <p className="text-sm text-amber-600">Payment cancelled. You can try again.</p>
      )}
      {status === "processing" && (
        <p className="text-sm text-zinc-500">Processing… please don&apos;t close this page.</p>
      )}

      <button
        type="button"
        onClick={pay}
        disabled={busy}
        className="w-full rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-background disabled:opacity-50"
      >
        {isFree
          ? busy
            ? "Reserving…"
            : "Reserve seat"
          : busy
            ? "Processing…"
            : `Pay ${formatINR(total)}`}
      </button>
      <p className="text-center text-xs text-zinc-500">
        Payment is confirmed securely on our server before your ticket is issued.
      </p>
    </div>
  );
}
