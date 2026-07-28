"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { normalizeHandleInput, validateHandleFormat } from "@/lib/handles";
import { LIMITS } from "@/lib/validation";

const input =
  "mt-1 w-full rounded-xl border border-border bg-surface2 px-3 py-2.5 text-sm text-cream placeholder:text-muted outline-none focus:border-gold/40 transition-colors";

export function OrganizerSettings({
  handle,
  defaultBio,
  defaultCity,
  defaultPhoto,
  defaultSocials,
}: {
  handle: string;
  defaultBio: string;
  defaultCity: string;
  defaultPhoto: string | null;
  defaultSocials: Record<string, string>;
}) {
  const router = useRouter();
  const [bio, setBio] = useState(defaultBio);
  const [city, setCity] = useState(defaultCity);
  const [photo, setPhoto] = useState<string | null>(defaultPhoto);
  const [instagram, setInstagram] = useState(defaultSocials.instagram ?? "");
  const [youtube, setYoutube] = useState(defaultSocials.youtube ?? "");
  const [website, setWebsite] = useState(defaultSocials.website ?? "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Handle change
  const [showHandle, setShowHandle] = useState(false);
  const [newHandle, setNewHandle] = useState(handle);
  const [handleBusy, setHandleBusy] = useState(false);
  const [handleErr, setHandleErr] = useState<string | null>(null);

  async function uploadPhoto(file: File) {
    setErr(null);
    setUploading(true);
    try {
      const res = await fetch("/api/uploads/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType: file.type }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error ?? "Upload failed.");
        return;
      }
      const supabase = createClient();
      const { error } = await supabase.storage
        .from(data.bucket)
        .uploadToSignedUrl(data.path, data.token, file);
      if (error) {
        setErr(error.message);
        return;
      }
      setPhoto(data.publicUrl);
    } catch {
      setErr("Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    setSaving(true);
    setErr(null);
    setSaved(false);
    try {
      const res = await fetch("/api/organizer/profile/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bio,
          city,
          profile_photo: photo,
          social_links: { instagram, youtube, website },
        }),
      });
      const d = await res.json();
      if (!res.ok) setErr(d.error ?? "Failed to save.");
      else {
        setSaved(true);
        router.refresh();
      }
    } catch {
      setErr("Network error.");
    }
    setSaving(false);
  }

  async function changeHandle() {
    const h = normalizeHandleInput(newHandle);
    const fmt = validateHandleFormat(h);
    if (fmt) {
      setHandleErr(fmt);
      return;
    }
    if (
      !confirm(
        `Change your handle to @${h}?\n\nYour old link will keep working — it redirects to the new one for 90 days.`,
      )
    )
      return;
    setHandleBusy(true);
    setHandleErr(null);
    try {
      const res = await fetch("/api/organizer/handle", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: h }),
      });
      const d = await res.json();
      if (!res.ok) setHandleErr(d.error ?? "Failed.");
      else {
        setShowHandle(false);
        router.refresh();
      }
    } catch {
      setHandleErr("Network error.");
    }
    setHandleBusy(false);
  }

  return (
    <section className="mt-10">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
        Organiser profile
      </h2>

      {/* Handle */}
      <div className="rounded-xl border border-border bg-surface2 p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-muted">Your public link</p>
            <p className="truncate font-mono text-sm text-gold">
              aikyam.app/@{handle}
            </p>
          </div>
          <button
            onClick={() => setShowHandle((v) => !v)}
            className="shrink-0 text-xs text-muted underline hover:text-cream"
          >
            {showHandle ? "Cancel" : "Change"}
          </button>
        </div>
        {showHandle && (
          <div className="mt-3">
            <div className="flex items-center rounded-xl border border-border bg-surface px-3 focus-within:border-gold/40">
              <span className="text-sm text-muted">@</span>
              <input
                value={newHandle}
                onChange={(e) => setNewHandle(e.target.value)}
                autoCapitalize="none"
                spellCheck={false}
                className="flex-1 bg-transparent px-1 py-2 text-sm text-cream outline-none"
              />
            </div>
            {handleErr && <p className="mt-1 text-xs text-crimson">{handleErr}</p>}
            <p className="mt-1 text-xs text-muted">
              Your old link keeps working for 90 days.
            </p>
            <button
              onClick={changeHandle}
              disabled={handleBusy}
              className="mt-2 rounded-full bg-gold px-4 py-1.5 text-xs font-semibold text-ink disabled:opacity-50"
            >
              {handleBusy ? "Changing…" : "Change handle"}
            </button>
          </div>
        )}
      </div>

      {/* Photo */}
      <div className="mt-4">
        <label className="block text-sm font-medium text-cream">Profile photo</label>
        <div className="mt-2 flex items-center gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gold/20 bg-gold/10">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="font-display text-xl text-gold">
                {handle.slice(0, 1).toUpperCase()}
              </span>
            )}
          </div>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadPhoto(f);
            }}
            className="block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-surface2 file:px-3 file:py-2 file:text-sm file:text-cream hover:file:bg-surface"
          />
        </div>
        {uploading && <p className="mt-1 text-xs text-muted">Uploading…</p>}
        {photo && (
          <button
            onClick={() => setPhoto(null)}
            className="mt-1 text-xs text-muted underline hover:text-cream"
          >
            Remove photo
          </button>
        )}
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <label className="block text-sm font-medium text-cream">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            maxLength={LIMITS.bio.max}
            placeholder="What kind of experiences do you host?"
            className={input}
          />
          <p className="mt-1 text-right text-xs text-muted">
            {bio.length}/{LIMITS.bio.max}
          </p>
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
        {(
          [
            ["Instagram", instagram, setInstagram, "instagram.com/yourhandle"],
            ["YouTube", youtube, setYoutube, "youtube.com/@yourchannel"],
            ["Website", website, setWebsite, "yoursite.com"],
          ] as const
        ).map(([label, value, setter, placeholder]) => {
          const invalid = value.trim().length > 0 && !value.includes(".");
          return (
            <div key={label}>
              <label className="block text-sm font-medium text-cream">{label}</label>
              <input
                value={value}
                onChange={(e) => setter(e.target.value)}
                inputMode="url"
                maxLength={LIMITS.url.max}
                placeholder={placeholder}
                className={input}
              />
              {invalid && (
                <p className="mt-1 text-xs text-crimson">
                  That doesn&apos;t look like a valid link.
                </p>
              )}
            </div>
          );
        })}
      </div>

      {err && <p className="mt-4 text-sm text-crimson">{err}</p>}
      {saved && <p className="mt-4 text-sm text-emerald-400">Saved.</p>}
      <button
        onClick={save}
        disabled={saving || uploading}
        className="mt-4 w-full rounded-xl bg-gold px-3 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-saffron disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save organiser profile"}
      </button>
    </section>
  );
}
