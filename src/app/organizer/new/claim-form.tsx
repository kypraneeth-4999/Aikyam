"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { normalizeHandleInput, validateHandleFormat } from "@/lib/handles";

type Status = { checking: boolean; available: boolean | null; reason?: string };

export function ClaimForm({
  suggested,
  defaultCity,
}: {
  suggested: string;
  defaultCity: string;
}) {
  const router = useRouter();
  const [handle, setHandle] = useState(suggested);
  const [bio, setBio] = useState("");
  const [city, setCity] = useState(defaultCity);
  const [status, setStatus] = useState<Status>({ checking: false, available: null });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const h = normalizeHandleInput(handle);
    const fmt = validateHandleFormat(h);
    if (fmt) {
      setStatus({ checking: false, available: false, reason: fmt });
      return;
    }
    setStatus({ checking: true, available: null });
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/organizer/handle/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ handle: h }),
        });
        const data = await res.json();
        setStatus({
          checking: false,
          available: Boolean(data.available),
          reason: data.reason,
        });
      } catch {
        setStatus({
          checking: false,
          available: null,
          reason: "Could not check availability.",
        });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [handle]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/organizer/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: normalizeHandleInput(handle), bio, city }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        setSubmitting(false);
        return;
      }
      router.push(`/@${data.handle}`);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  const canSubmit = status.available === true && !submitting;

  return (
    <form onSubmit={submit} className="mt-8 space-y-4">
      <div>
        <label className="block text-sm font-medium">Your handle</label>
        <div className="mt-1 flex items-center rounded-lg border border-black/10 px-3 focus-within:border-black/30 dark:border-white/15">
          <span className="text-sm text-zinc-400">aikyam.app/@</span>
          <input
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="flex-1 bg-transparent px-1 py-2 text-sm outline-none"
          />
        </div>
        <p className="mt-1 h-4 text-xs">
          {status.checking && <span className="text-zinc-400">Checking…</span>}
          {!status.checking && status.available === true && (
            <span className="text-green-600">Available</span>
          )}
          {!status.checking && status.available === false && (
            <span className="text-red-600">{status.reason}</span>
          )}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium">Bio (optional)</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="What kind of experiences do you host?"
          className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 dark:border-white/15"
        />
      </div>

      <div>
        <label className="block text-sm font-medium">City (optional)</label>
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Pune"
          className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 dark:border-white/15"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full rounded-lg bg-foreground px-3 py-2 text-sm font-medium text-background disabled:opacity-50"
      >
        {submitting ? "Creating…" : "Create my page"}
      </button>
    </form>
  );
}
