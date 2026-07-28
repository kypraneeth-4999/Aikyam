"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LIMITS } from "@/lib/validation";

const input =
  "mt-1 w-full rounded-xl border border-border bg-surface2 px-3 py-2.5 text-sm text-cream placeholder:text-muted outline-none focus:border-gold/40 transition-colors";

function Toggle({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (v: boolean) => void;
}) {
  return (
    <label
      className={`flex items-start justify-between gap-4 rounded-xl border border-border bg-surface2 p-3 ${disabled ? "opacity-60" : "cursor-pointer"}`}
    >
      <span className="text-sm">
        <span className="block text-cream">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-muted">{hint}</span>}
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-gold"
      />
    </label>
  );
}

export function AccountSettings({
  defaultName,
  defaultCity,
  email,
  phone,
  emailPref,
  whatsappPref,
}: {
  defaultName: string;
  defaultCity: string;
  email: string | null;
  phone: string | null;
  emailPref: boolean;
  whatsappPref: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(defaultName);
  const [city, setCity] = useState(defaultCity);
  const [emailOn, setEmailOn] = useState(emailPref);
  const [waOn] = useState(whatsappPref);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setErr(null);
    setSaved(false);
    try {
      const res = await fetch("/api/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          city,
          notification_prefs: { email: emailOn, whatsapp: waOn },
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        setErr(d.error ?? "Failed to save.");
      } else {
        setSaved(true);
        router.refresh();
      }
    } catch {
      setErr("Network error.");
    }
    setSaving(false);
  }

  return (
    <>
      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          Account
        </h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-cream">Full name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              minLength={LIMITS.name.min}
              maxLength={LIMITS.name.max}
              required
              className={input}
            />
            {name.trim().length > 0 && name.trim().length < LIMITS.name.min && (
              <p className="mt-1 text-xs text-crimson">
                Name must be at least {LIMITS.name.min} characters.
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-cream">City</label>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              maxLength={LIMITS.city.max}
              className={input}
            />
          </div>
          {(email || phone) && (
            <p className="text-xs text-muted">
              Signed in as {email ?? phone}
              {email && phone ? ` · ${phone}` : ""}
            </p>
          )}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          Notifications
        </h2>
        <div className="space-y-2">
          <Toggle
            label="Event reminders by email"
            hint="24 hours and 3 hours before an event you've booked."
            checked={emailOn}
            onChange={setEmailOn}
          />
          <Toggle
            label="WhatsApp updates"
            hint="Coming soon — pending WhatsApp Business approval."
            checked={waOn}
            disabled
          />
        </div>
        <p className="mt-2 text-xs text-muted">
          Tickets and cancellation notices are always sent — they&apos;re essential
          to your booking.
        </p>
      </section>

      {err && <p className="mt-4 text-sm text-crimson">{err}</p>}
      {saved && <p className="mt-4 text-sm text-emerald-400">Saved.</p>}
      <button
        onClick={save}
        disabled={saving || name.trim().length < LIMITS.name.min}
        className="mt-4 w-full rounded-xl bg-gold px-3 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-saffron disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save account settings"}
      </button>
    </>
  );
}
