"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Org = {
  organizerId: string;
  handle: string;
  name: string;
  role: string;
  status: string;
};
type Collab = { name: string };

export function CoOrganizers({
  eventId,
  isPrimary,
  organizers,
  collaborators,
}: {
  eventId: string;
  isPrimary: boolean;
  organizers: Org[];
  collaborators: Collab[];
}) {
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function add(body: object) {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/events/${eventId}/organizers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (!res.ok) {
        setErr(d.error ?? "Failed.");
        setBusy(false);
        return;
      }
      setHandle("");
      setName("");
      router.refresh();
    } catch {
      setErr("Network error.");
    }
    setBusy(false);
  }

  async function remove(body: object) {
    if (!confirm("Remove this co-organiser?")) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/events/${eventId}/organizers`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) router.refresh();
      else {
        const d = await res.json();
        setErr(d.error ?? "Failed.");
      }
    } catch {
      setErr("Network error.");
    }
    setBusy(false);
  }

  const statusColor = (s: string) =>
    s === "accepted"
      ? "text-emerald-400"
      : s === "pending"
        ? "text-amber-400"
        : "text-muted";

  return (
    <section className="mt-8">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
        Co-organisers
      </h2>
      <div className="space-y-2">
        {organizers.map((o) => (
          <div
            key={o.organizerId}
            className="flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3 text-sm"
          >
            <div>
              <span className="text-cream">{o.name}</span>
              <span className="ml-2 text-xs text-muted">@{o.handle}</span>
              {o.role === "primary" ? (
                <span className="ml-2 text-xs text-gold">primary</span>
              ) : (
                <span className={`ml-2 text-xs ${statusColor(o.status)}`}>{o.status}</span>
              )}
            </div>
            {isPrimary && o.role !== "primary" && (
              <button
                onClick={() => remove({ organizerId: o.organizerId })}
                disabled={busy}
                className="text-xs text-crimson hover:underline disabled:opacity-50"
              >
                Remove
              </button>
            )}
          </div>
        ))}
        {collaborators.map((c) => (
          <div
            key={c.name}
            className="flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3 text-sm"
          >
            <div>
              <span className="text-cream">{c.name}</span>
              <span className="ml-2 text-xs text-muted">external · unverified</span>
            </div>
            {isPrimary && (
              <button
                onClick={() => remove({ name: c.name })}
                disabled={busy}
                className="text-xs text-crimson hover:underline disabled:opacity-50"
              >
                Remove
              </button>
            )}
          </div>
        ))}
        {organizers.length <= 1 && collaborators.length === 0 && (
          <p className="text-sm text-muted">No co-organisers yet.</p>
        )}
      </div>

      {isPrimary && (
        <div className="mt-3 space-y-2">
          <div className="flex gap-2">
            <input
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="Invite an organiser by @handle"
              className="flex-1 rounded-xl border border-border bg-surface2 px-3 py-2 text-sm text-cream outline-none focus:border-gold/40"
            />
            <button
              onClick={() => handle && add({ handle })}
              disabled={busy || !handle}
              className="rounded-xl bg-gold px-3 py-2 text-sm font-semibold text-ink transition-colors hover:bg-saffron disabled:opacity-50"
            >
              Invite
            </button>
          </div>
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Or add an external name"
              className="flex-1 rounded-xl border border-border bg-surface2 px-3 py-2 text-sm text-cream outline-none focus:border-gold/40"
            />
            <button
              onClick={() => name && add({ name })}
              disabled={busy || !name}
              className="rounded-xl border border-border bg-surface px-3 py-2 text-sm font-medium text-cream disabled:opacity-50"
            >
              Add
            </button>
          </div>
          {err && <p className="text-xs text-crimson">{err}</p>}
        </div>
      )}
    </section>
  );
}
