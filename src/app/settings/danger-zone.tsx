"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function DangerZone() {
  const [deleting, setDeleting] = useState(false);

  async function deleteAccount() {
    if (
      !confirm(
        "Delete your account?\n\nYour personal details are removed and you're signed out permanently. This can't be undone.",
      )
    )
      return;
    setDeleting(true);
    try {
      const res = await fetch("/api/me/delete", { method: "POST" });
      if (res.ok) {
        try {
          await createClient().auth.signOut();
        } catch {
          /* ignore */
        }
        window.location.href = "/";
        return;
      }
      setDeleting(false);
    } catch {
      setDeleting(false);
    }
  }

  return (
    <>
      <form action="/auth/signout" method="post" className="mt-10">
        <button
          type="submit"
          className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm font-medium text-cream transition-colors hover:border-gold/30"
        >
          Sign out
        </button>
      </form>

      <section className="mt-10 border-t border-border pt-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-crimson">
          Danger zone
        </h2>
        <p className="mb-3 text-xs text-muted">
          Deleting your account removes your personal details. Past bookings stay
          on record (anonymised) so organisers&apos; event history remains accurate.
        </p>
        <button
          onClick={deleteAccount}
          disabled={deleting}
          className="rounded-xl border border-crimson/40 bg-crimson/10 px-4 py-2 text-sm font-medium text-crimson transition-colors hover:bg-crimson/20 disabled:opacity-50"
        >
          {deleting ? "Deleting…" : "Delete account"}
        </button>
      </section>
    </>
  );
}
