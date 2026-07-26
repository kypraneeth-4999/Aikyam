"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const input =
  "mt-1 w-full rounded-xl border border-border bg-surface2 px-3 py-2.5 text-sm text-cream placeholder:text-muted outline-none focus:border-gold/40 transition-colors";

export function SettingsForm({
  defaultName,
  defaultCity,
}: {
  defaultName: string;
  defaultCity: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(defaultName);
  const [city, setCity] = useState(defaultCity);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function save() {
    setSaving(true);
    setErr(null);
    setSaved(false);
    try {
      const res = await fetch("/api/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, city }),
      });
      const d = await res.json();
      if (!res.ok) {
        setErr(d.error ?? "Failed to save.");
        setSaving(false);
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      setErr("Network error.");
    }
    setSaving(false);
  }

  async function deleteAccount() {
    if (
      !confirm(
        "Delete your account? This anonymises your data and signs you out permanently.",
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
    <div className="mt-8 space-y-6">
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-cream">Full name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={input} />
        </div>
        <div>
          <label className="block text-sm font-medium text-cream">City</label>
          <input value={city} onChange={(e) => setCity(e.target.value)} className={input} />
        </div>
        {err && <p className="text-sm text-crimson">{err}</p>}
        {saved && <p className="text-sm text-emerald-400">Saved.</p>}
        <button
          onClick={save}
          disabled={saving}
          className="w-full rounded-xl bg-gold px-3 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-saffron disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      <form action="/auth/signout" method="post">
        <button
          type="submit"
          className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm font-medium text-cream transition-colors hover:border-gold/30"
        >
          Sign out
        </button>
      </form>

      <div className="flex gap-4 text-xs text-muted">
        <span>Terms</span>
        <span>Privacy</span>
        <span>Help</span>
      </div>

      <div className="border-t border-border pt-6">
        <button
          onClick={deleteAccount}
          disabled={deleting}
          className="text-sm text-crimson transition-colors hover:underline disabled:opacity-50"
        >
          {deleting ? "Deleting…" : "Delete account"}
        </button>
      </div>
    </div>
  );
}
