"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CirclePrivacy, MemberStatus } from "@/lib/circles";

/** Apply / join, with an intro note for circles that vet applicants. */
export function JoinPanel({
  slug,
  privacy,
  status,
  full,
}: {
  slug: string;
  privacy: CirclePrivacy;
  status: MemberStatus | null;
  full: boolean;
}) {
  const router = useRouter();
  const [intro, setIntro] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (status === "active") return null;

  if (status === "applied") {
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
        <p className="font-medium text-amber-300">Application pending</p>
        <p className="mt-1 text-muted">
          The host is reviewing it. You&apos;ll hear back before the next gathering.
        </p>
      </div>
    );
  }

  if (status === "declined") {
    return (
      <div className="rounded-2xl border border-border bg-surface p-4 text-sm text-muted">
        This application wasn&apos;t accepted. Circles are small by design — it&apos;s
        rarely personal.
      </div>
    );
  }

  if (full) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-4 text-sm text-muted">
        This circle is at capacity right now.
      </div>
    );
  }

  const instant = privacy === "open" || status === "invited";

  async function submit() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/circles/${slug}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intro }),
      });
      const d = await res.json();
      if (!res.ok) {
        setErr(d.error ?? "Couldn't complete that.");
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
    <div className="rounded-2xl border border-border bg-surface p-4">
      {status === "invited" && (
        <p className="mb-3 text-sm text-gold">You&apos;ve been invited to this circle.</p>
      )}
      {!instant && (
        <>
          <label className="block text-sm font-medium text-cream">
            Why do you want to join?
          </label>
          <p className="mt-0.5 text-xs text-muted">
            A sentence or two. Hosts read these.
          </p>
          <textarea
            value={intro}
            onChange={(e) => setIntro(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="What you're working on, and what you'd bring to the table."
            className="mt-2 w-full rounded-xl border border-border bg-surface2 px-3 py-2.5 text-cream placeholder:text-muted outline-none focus:border-gold/40"
          />
        </>
      )}
      {err && <p className="mt-2 text-sm text-crimson">{err}</p>}
      <button
        onClick={submit}
        disabled={busy}
        className="mt-3 w-full rounded-xl bg-gold px-5 py-3 text-sm font-semibold text-onaccent transition-colors hover:bg-saffron disabled:opacity-50"
      >
        {busy ? "Sending…" : instant ? "Join circle" : "Apply to join"}
      </button>
    </div>
  );
}

/** Host controls on an application or member row. */
export function MemberActions({
  slug,
  userId,
  status,
}: {
  slug: string;
  userId: string;
  status: MemberStatus;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function act(action: "approve" | "decline" | "remove") {
    if (action === "remove" && !confirm("Remove this member from the circle?")) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/circles/${slug}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action }),
      });
      const d = await res.json();
      if (!res.ok) {
        setErr(d.error ?? "Failed.");
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
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        {status === "applied" ? (
          <>
            <button
              onClick={() => act("approve")}
              disabled={busy}
              className="rounded-full bg-gold px-3 py-1 text-xs font-semibold text-onaccent disabled:opacity-50"
            >
              Approve
            </button>
            <button
              onClick={() => act("decline")}
              disabled={busy}
              className="rounded-full border border-border px-3 py-1 text-xs text-muted disabled:opacity-50"
            >
              Decline
            </button>
          </>
        ) : (
          <button
            onClick={() => act("remove")}
            disabled={busy}
            className="text-xs text-crimson hover:underline disabled:opacity-50"
          >
            Remove
          </button>
        )}
      </div>
      {err && <p className="text-xs text-crimson">{err}</p>}
    </div>
  );
}

/** Vouch for a pending applicant — members only. */
export function EndorseButton({
  slug,
  applicantId,
}: {
  slug: string;
  applicantId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function endorse() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/circles/${slug}/endorse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicantId }),
      });
      const d = await res.json();
      if (!res.ok) {
        setErr(d.error ?? "Failed.");
        setBusy(false);
        return;
      }
      setDone(true);
      router.refresh();
    } catch {
      setErr("Network error.");
      setBusy(false);
    }
  }

  if (done) return <span className="text-xs text-emerald-400">Endorsed ✓</span>;

  return (
    <div className="text-right">
      <button
        onClick={endorse}
        disabled={busy}
        className="text-xs font-medium text-gold hover:text-saffron disabled:opacity-50"
      >
        {busy ? "…" : "Endorse"}
      </button>
      {err && <p className="text-xs text-crimson">{err}</p>}
    </div>
  );
}
