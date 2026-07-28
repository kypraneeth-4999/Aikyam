"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES } from "@/config/categories";
import { createClient } from "@/lib/supabase/client";
import { LIMITS } from "@/lib/validation";

/** Now, as a datetime-local string — used to block past start times. */
function nowLocal(): string {
  const d = new Date(Date.now() - new Date().getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 16);
}

const inputCls =
  "mt-1 w-full rounded-xl border border-border bg-surface2 px-3 py-2.5 text-sm text-cream placeholder:text-muted outline-none focus:border-gold/40 transition-colors";
const labelCls = "block text-sm font-medium text-cream";

export function EventForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isFree, setIsFree] = useState(false);
  const [description, setDescription] = useState("");
  const [materials, setMaterials] = useState<"included" | "byo">("included");
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | "draft" | "publish">(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [draftMsg, setDraftMsg] = useState<string | null>(null);

  async function uploadCover(file: File) {
    setUploadError(null);
    setUploading(true);
    try {
      const res = await fetch("/api/uploads/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType: file.type }),
      });
      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.error ?? "Upload failed.");
        return;
      }
      const supabase = createClient();
      const { error } = await supabase.storage
        .from(data.bucket)
        .uploadToSignedUrl(data.path, data.token, file);
      if (error) {
        setUploadError(error.message);
        return;
      }
      setCoverUrl(data.publicUrl);
    } catch {
      setUploadError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function submit(publish: boolean) {
    const form = formRef.current;
    if (!form) return;
    if (publish && !form.reportValidity()) return;

    setErrors([]);
    setDraftMsg(null);
    setBusy(publish ? "publish" : "draft");

    const fd = new FormData(form);
    const body = {
      publish,
      title: fd.get("title"),
      category: fd.get("category"),
      description: fd.get("description"),
      cover_media: coverUrl,
      starts_at: fd.get("starts_at"),
      ends_at: fd.get("ends_at"),
      venue_name: fd.get("venue_name"),
      maps_url: fd.get("maps_url"),
      landmark: fd.get("landmark"),
      capacity: Number(fd.get("capacity")),
      is_free: isFree,
      price: Number(fd.get("price") || 0),
      materials,
      materials_addon_price: Number(fd.get("materials_addon_price") || 0),
      what_to_bring: fd.get("what_to_bring"),
      cancellation_policy: fd.get("cancellation_policy"),
      languages: fd.get("languages"),
      age_suitability: fd.get("age_suitability"),
      tags: fd.get("tags"),
    };

    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors(data.errors ?? [data.error ?? "Something went wrong."]);
        setBusy(null);
        return;
      }
      if (data.status === "published" && data.slug) {
        router.push(`/e/${data.slug}`);
        router.refresh();
      } else {
        setBusy(null);
        setDraftMsg("Draft saved. Editing drafts arrives with the dashboard.");
      }
    } catch {
      setErrors(["Network error. Please try again."]);
      setBusy(null);
    }
  }

  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault();
        submit(true);
      }}
      className="mt-8 space-y-5"
    >
      <div>
        <label className={labelCls}>Title</label>
        <input
          name="title"
          required
          minLength={LIMITS.eventTitle.min}
          maxLength={LIMITS.eventTitle.max}
          placeholder="Beginner's wheel-throwing pottery"
          className={inputCls}
        />
      </div>
      <div>
        <label className={labelCls}>Category</label>
        <select name="category" required defaultValue="" className={inputCls}>
          <option value="" disabled>
            Choose a category…
          </option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c} className="bg-surface2">
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Cover image */}
      <div>
        <label className={labelCls}>Cover image (optional)</label>
        {coverUrl && (
          <div className="mt-1 overflow-hidden rounded-xl border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverUrl} alt="Cover preview" className="aspect-[16/9] w-full object-cover" />
          </div>
        )}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadCover(f);
          }}
          className="mt-2 block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-surface2 file:px-3 file:py-2 file:text-sm file:text-cream hover:file:bg-surface"
        />
        {uploading && <p className="mt-1 text-xs text-muted">Uploading…</p>}
        {uploadError && <p className="mt-1 text-xs text-crimson">{uploadError}</p>}
      </div>

      <div>
        <label className={labelCls}>Description</label>
        <textarea
          name="description"
          rows={4}
          maxLength={LIMITS.eventDescription.max}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What will attendees do and take away?"
          className={inputCls}
        />
        <p className="mt-1 text-right text-xs text-muted">
          {description.length}/{LIMITS.eventDescription.max}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Starts (IST)</label>
          <input
            type="datetime-local"
            name="starts_at"
            required
            min={nowLocal()}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Ends (optional)</label>
          <input
            type="datetime-local"
            name="ends_at"
            min={nowLocal()}
            className={inputCls}
          />
        </div>
      </div>

      <div>
        <label className={labelCls}>Venue name</label>
        <input
          name="venue_name"
          maxLength={LIMITS.venueName.max}
          placeholder="The Clay Studio, Kothrud"
          className={inputCls}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Google Maps link</label>
          <input
            name="maps_url"
            inputMode="url"
            maxLength={LIMITS.url.max}
            placeholder="https://maps.app.goo.gl/…"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Landmark</label>
          <input
            name="landmark"
            maxLength={LIMITS.landmark.max}
            placeholder="Near Mhatre bridge"
            className={inputCls}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Capacity</label>
          <input
            type="number"
            name="capacity"
            required
            min={LIMITS.capacity.min}
            max={LIMITS.capacity.max}
            step={1}
            placeholder="15"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Ticket price (₹)</label>
          <input
            type="number"
            name="price"
            required={!isFree}
            min={LIMITS.price.min}
            max={LIMITS.price.max}
            step={1}
            disabled={isFree}
            placeholder="800"
            className={`${inputCls} disabled:opacity-50`}
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-cream">
        <input type="checkbox" checked={isFree} onChange={(e) => setIsFree(e.target.checked)} className="accent-gold" />
        This is a free event
      </label>

      <div>
        <label className={labelCls}>Materials</label>
        <div className="mt-1 flex gap-4 text-sm text-cream">
          <label className="flex items-center gap-2">
            <input type="radio" name="materials-ui" checked={materials === "included"} onChange={() => setMaterials("included")} className="accent-gold" />
            Included
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="materials-ui" checked={materials === "byo"} onChange={() => setMaterials("byo")} className="accent-gold" />
            Bring your own
          </label>
        </div>
        {materials === "byo" && (
          <input
            type="number"
            name="materials_addon_price"
            min={0}
            step={1}
            placeholder="Optional materials add-on price (₹)"
            className={`${inputCls} mt-2`}
          />
        )}
      </div>

      <div>
        <label className={labelCls}>What to bring (optional)</label>
        <input
          name="what_to_bring"
          maxLength={LIMITS.whatToBring.max}
          placeholder="An apron and a water bottle"
          className={inputCls}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Languages</label>
          <input
            name="languages"
            maxLength={200}
            placeholder="English, Marathi"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Age suitability</label>
          <input
            name="age_suitability"
            maxLength={LIMITS.ageSuitability.max}
            placeholder="16+"
            className={inputCls}
          />
        </div>
      </div>
      <div>
        <label className={labelCls}>Tags (comma-separated)</label>
        <input
          name="tags"
          maxLength={200}
          placeholder="beginner, hands-on, weekend"
          className={inputCls}
        />
        <p className="mt-1 text-xs text-muted">
          Up to {LIMITS.tags.maxCount} tags.
        </p>
      </div>
      <div>
        <label className={labelCls}>Cancellation policy (optional)</label>
        <input
          name="cancellation_policy"
          maxLength={LIMITS.cancellationPolicy.max}
          placeholder="Full refund up to 24h before"
          className={inputCls}
        />
      </div>

      {errors.length > 0 && (
        <ul className="list-inside list-disc rounded-xl border border-crimson/30 bg-crimson/10 p-3 text-sm text-crimson">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
      {draftMsg && <p className="text-sm text-emerald-400">{draftMsg}</p>}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => submit(false)}
          disabled={busy !== null || uploading}
          className="flex-1 rounded-xl border border-border bg-surface px-3 py-2.5 text-sm font-medium text-cream transition-colors hover:border-gold/30 disabled:opacity-50"
        >
          {busy === "draft" ? "Saving…" : "Save draft"}
        </button>
        <button
          type="submit"
          disabled={busy !== null || uploading}
          className="flex-1 rounded-xl bg-gold px-3 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-saffron disabled:opacity-50"
        >
          {busy === "publish" ? "Publishing…" : "Publish"}
        </button>
      </div>
      <p className="text-xs text-muted">
        Instagram import arrives later. Times are in IST.
      </p>
    </form>
  );
}
