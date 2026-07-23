"use client";

import { useEffect, useRef, useState } from "react";
import type { Html5Qrcode } from "html5-qrcode";

type Result = {
  result: string;
  attendee?: string;
  seats?: number;
  count?: number;
};

const resultStyle: Record<string, string> = {
  success: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  duplicate: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  wrong_event: "border-crimson/40 bg-crimson/10 text-crimson",
  cancelled: "border-crimson/40 bg-crimson/10 text-crimson",
  invalid: "border-crimson/40 bg-crimson/10 text-crimson",
  error: "border-crimson/40 bg-crimson/10 text-crimson",
};
const resultMsg: Record<string, string> = {
  success: "✓ Checked in",
  duplicate: "Already checked in",
  wrong_event: "Wrong event",
  cancelled: "Ticket cancelled",
  invalid: "Invalid ticket",
  error: "Something went wrong",
};

export function CheckinScanner({
  eventId,
  initialCount,
}: {
  eventId: string;
  initialCount: number;
}) {
  const [count, setCount] = useState(initialCount);
  const [result, setResult] = useState<Result | null>(null);
  const [scanning, setScanning] = useState(false);
  const [manual, setManual] = useState("");
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastRef = useRef<string>("");
  const busyRef = useRef(false);

  async function verify(token: string) {
    if (!token || busyRef.current || token === lastRef.current) return;
    lastRef.current = token;
    busyRef.current = true;
    try {
      const res = await fetch("/api/tickets/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, eventId }),
      });
      const data = (await res.json()) as Result;
      setResult(data);
      if (typeof data.count === "number") setCount(data.count);
    } catch {
      setResult({ result: "error" });
    } finally {
      busyRef.current = false;
      setTimeout(() => {
        lastRef.current = "";
      }, 2000);
    }
  }

  async function start() {
    setError(null);
    setResult(null);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        (decoded: string) => verify(decoded),
        () => {},
      );
      setScanning(true);
    } catch {
      setError(
        "Couldn't start the camera. Allow camera access, or use manual entry below.",
      );
    }
  }

  async function stop() {
    const scanner = scannerRef.current;
    if (scanner) {
      try {
        await scanner.stop();
      } catch {
        /* already stopped */
      }
      scannerRef.current = null;
    }
    setScanning(false);
  }

  useEffect(() => {
    return () => {
      const s = scannerRef.current;
      if (s) {
        try {
          s.stop();
        } catch {
          /* ignore */
        }
      }
    };
  }, []);

  return (
    <div className="mt-6">
      <div className="mb-4 rounded-2xl border border-border bg-surface p-4 text-center">
        <p className="font-display text-3xl text-gold">{count}</p>
        <p className="text-xs text-muted">Checked in</p>
      </div>

      <div id="qr-reader" className="overflow-hidden rounded-2xl border border-border" />

      <div className="mt-3">
        {!scanning ? (
          <button
            onClick={start}
            className="w-full rounded-xl bg-gold py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-saffron"
          >
            Start camera
          </button>
        ) : (
          <button
            onClick={stop}
            className="w-full rounded-xl border border-border bg-surface py-2.5 text-sm font-medium text-cream"
          >
            Stop camera
          </button>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-crimson">{error}</p>}

      {result && (
        <div
          className={`mt-4 rounded-2xl border p-4 text-center ${resultStyle[result.result] ?? resultStyle.error}`}
        >
          <p className="text-sm font-semibold">
            {resultMsg[result.result] ?? "Result"}
          </p>
          {result.attendee && (
            <p className="mt-1 text-sm">
              {result.attendee}
              {result.seats
                ? ` · ${result.seats} seat${result.seats === 1 ? "" : "s"}`
                : ""}
            </p>
          )}
        </div>
      )}

      <details className="mt-6">
        <summary className="cursor-pointer text-sm text-muted">
          Manual entry (paste ticket code)
        </summary>
        <div className="mt-2 flex gap-2">
          <input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="Paste QR token"
            className="flex-1 rounded-xl border border-border bg-surface2 px-3 py-2 text-sm text-cream outline-none focus:border-gold/40"
          />
          <button
            onClick={() => verify(manual.trim())}
            className="rounded-xl bg-gold px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-saffron"
          >
            Verify
          </button>
        </div>
      </details>
    </div>
  );
}
