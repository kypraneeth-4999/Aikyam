"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES } from "@/config/categories";
import { createClient } from "@/lib/supabase/client";
import { LIMITS, httpUrl } from "@/lib/validation";
import { formatINR } from "@/lib/money";
import {
  DURATIONS,
  dateShortcuts,
  describeWhen,
  endFromDuration,
  isPastStart,
  timeOptions,
  todayISO,
  toLocalDateTime,
} from "@/lib/event-datetime";

const MAX_PHOTOS = 7;

const STEPS = [
  { key: "basics", label: "Basics" },
  { key: "when", label: "When" },
  { key: "where", label: "Where" },
  { key: "tickets", label: "Tickets" },
  { key: "details", label: "Details" },
  { key: "media", label: "Media" },
  { key: "preview", label: "Preview" },
] as const;

type FieldKey =
  | "title"
  | "category"
  | "description"
  | "date"
  | "startTime"
  | "venueName"
  | "city"
  | "mapsUrl"
  | "capacity"
  | "price";

/** Which fields each step is responsible for — drives "can I continue?". */
const STEP_FIELDS: Record<number, FieldKey[]> = {
  0: ["title", "category", "description"],
  1: ["date", "startTime"],
  2: ["venueName", "city", "mapsUrl"],
  3: ["capacity", "price"],
  4: [],
  5: [],
  6: [],
};

const inputCls =
  "mt-1 w-full rounded-xl border border-border bg-surface2 px-3 py-2.5 text-cream placeholder:text-muted outline-none focus:border-gold/40 transition-colors";
const labelCls = "block text-sm font-medium text-cream";
const errCls = "mt-1 text-xs text-crimson";

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
      {error ? (
        <p className={errCls}>{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function EventForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [showErrors, setShowErrors] = useState(false);
  const [busy, setBusy] = useState<null | "draft" | "publish">(null);
  const [serverErrors, setServerErrors] = useState<string[]>([]);
  const [draftMsg, setDraftMsg] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [f, setF] = useState({
    title: "",
    category: "",
    description: "",
    date: "",
    startTime: "",
    durationMins: 120 as number,
    venueType: "public" as "public" | "private",
    venueName: "",
    address: "",
    city: "",
    landmark: "",
    mapsUrl: "",
    capacity: "",
    isFree: false,
    price: "",
    materials: "included" as "included" | "byo",
    addonPrice: "",
    whatToBring: "",
    languages: "",
    ageSuitability: "",
    tags: "",
    cancellationPolicy: "",
    coverUrl: null as string | null,
    photos: [] as string[],
  });

  const set = <K extends keyof typeof f>(key: K, value: (typeof f)[K]) =>
    setF((prev) => ({ ...prev, [key]: value }));

  /** Live per-field validation — same rules the server enforces. */
  const errors = useMemo(() => {
    const e: Partial<Record<FieldKey, string>> = {};

    const title = f.title.trim();
    if (!title) e.title = "Give your event a title.";
    else if (title.length < LIMITS.eventTitle.min)
      e.title = `At least ${LIMITS.eventTitle.min} characters.`;

    if (!f.category) e.category = "Pick a category.";

    if (f.description.length > LIMITS.eventDescription.max)
      e.description = "Description is too long.";

    if (!f.date) e.date = "Pick a date.";
    if (!f.startTime) e.startTime = "Pick a start time.";
    if (f.date && f.startTime && isPastStart(f.date, f.startTime))
      e.startTime = "That start time is in the past.";

    if (!f.venueName.trim()) e.venueName = "Where is it happening?";
    if (!f.city.trim()) e.city = "Which city?";
    if (f.mapsUrl.trim() && !httpUrl(f.mapsUrl))
      e.mapsUrl = "That doesn't look like a valid link.";

    const cap = Number(f.capacity);
    if (!f.capacity) e.capacity = "How many people can attend?";
    else if (!Number.isInteger(cap) || cap < 1)
      e.capacity = "Enter a whole number of at least 1.";
    else if (cap > LIMITS.capacity.max)
      e.capacity = `Keep it under ${LIMITS.capacity.max}.`;

    if (!f.isFree) {
      const p = Number(f.price);
      if (!f.price) e.price = "Set a ticket price, or mark the event free.";
      else if (!Number.isFinite(p) || p < 0) e.price = "Enter a valid price.";
      else if (p > LIMITS.price.max) e.price = "That price looks too high.";
    }

    return e;
  }, [f]);

  const stepErrorList = (i: number) =>
    STEP_FIELDS[i].map((k) => errors[k]).filter(Boolean) as string[];
  const stepValid = (i: number) => stepErrorList(i).length === 0;
  const allValid = STEPS.every((_, i) => stepValid(i));
  const err = (k: FieldKey) => (showErrors ? (errors[k] ?? null) : null);

  function next() {
    if (!stepValid(step)) {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function back() {
    setShowErrors(false);
    setStep((s) => Math.max(s - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function uploadOne(file: File): Promise<string | null> {
    const res = await fetch("/api/uploads/sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentType: file.type }),
    });
    const data = await res.json();
    if (!res.ok) {
      setUploadError(data.error ?? "Upload failed.");
      return null;
    }
    const supabase = createClient();
    const { error } = await supabase.storage
      .from(data.bucket)
      .uploadToSignedUrl(data.path, data.token, file);
    if (error) {
      setUploadError(error.message);
      return null;
    }
    return data.publicUrl as string;
  }

  async function handleUpload(files: FileList, kind: "cover" | "gallery") {
    setUploadError(null);
    setUploading(true);
    try {
      if (kind === "cover") {
        const url = await uploadOne(files[0]);
        if (url) set("coverUrl", url);
      } else {
        const room = MAX_PHOTOS - f.photos.length;
        if (room <= 0) {
          setUploadError(`Up to ${MAX_PHOTOS} photos.`);
          return;
        }
        const urls: string[] = [];
        for (const file of Array.from(files).slice(0, room)) {
          const url = await uploadOne(file);
          if (url) urls.push(url);
        }
        if (urls.length) set("photos", [...f.photos, ...urls]);
      }
    } catch {
      setUploadError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function submit(publish: boolean) {
    if (publish && !allValid) {
      setShowErrors(true);
      const firstBad = STEPS.findIndex((_, i) => !stepValid(i));
      if (firstBad >= 0) setStep(firstBad);
      return;
    }
    setServerErrors([]);
    setDraftMsg(null);
    setBusy(publish ? "publish" : "draft");

    const body = {
      publish,
      title: f.title,
      category: f.category,
      description: f.description,
      cover_media: f.coverUrl,
      photos: f.photos,
      starts_at: toLocalDateTime(f.date, f.startTime),
      ends_at: endFromDuration(f.date, f.startTime, f.durationMins),
      venue_type: f.venueType,
      venue_name: f.venueName,
      address: f.address,
      city: f.city,
      landmark: f.landmark,
      maps_url: f.mapsUrl,
      capacity: Number(f.capacity),
      is_free: f.isFree,
      price: Number(f.price || 0),
      materials: f.materials,
      materials_addon_price: Number(f.addonPrice || 0),
      what_to_bring: f.whatToBring,
      cancellation_policy: f.cancellationPolicy,
      languages: f.languages,
      age_suitability: f.ageSuitability,
      tags: f.tags,
    };

    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setServerErrors(data.errors ?? [data.error ?? "Something went wrong."]);
        setBusy(null);
        return;
      }
      if (data.status === "published" && data.slug) {
        router.push(`/e/${data.slug}`);
        router.refresh();
      } else {
        setBusy(null);
        setDraftMsg("Draft saved. You can finish it from your dashboard later.");
      }
    } catch {
      setServerErrors(["Network error. Please try again."]);
      setBusy(null);
    }
  }

  const times = useMemo(() => timeOptions(), []);
  const shortcuts = useMemo(() => dateShortcuts(), []);
  const chip = (on: boolean) =>
    `rounded-full border px-3 py-2 text-sm transition-colors ${
      on
        ? "border-gold bg-gold/15 text-gold"
        : "border-border bg-surface2 text-muted hover:text-cream"
    }`;

  return (
    <div className="mt-6">
      {/* Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs text-muted">
          <span>
            Step {step + 1} of {STEPS.length} · {STEPS[step].label}
          </span>
          <span>{Math.round(((step + 1) / STEPS.length) * 100)}%</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface2">
          <div
            className="h-full rounded-full bg-gold transition-all duration-300"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {STEPS.map((s, i) => (
            <button
              key={s.key}
              type="button"
              onClick={() => {
                setShowErrors(false);
                setStep(i);
              }}
              className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                i === step
                  ? "bg-gold text-onaccent"
                  : stepValid(i)
                    ? "text-muted hover:text-cream"
                    : "text-crimson/70 hover:text-crimson"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* STEP 1 — Basics */}
      {step === 0 && (
        <div className="space-y-5">
          <Field label="Event title" error={err("title")}>
            <input
              value={f.title}
              onChange={(e) => set("title", e.target.value)}
              maxLength={LIMITS.eventTitle.max}
              placeholder="Beginner's wheel-throwing pottery"
              className={inputCls}
            />
          </Field>

          <div>
            <label className={labelCls}>Category</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => set("category", c)}
                  className={chip(f.category === c)}
                >
                  {c}
                </button>
              ))}
            </div>
            {err("category") && <p className={errCls}>{err("category")}</p>}
          </div>

          <Field
            label="Description"
            hint={`${f.description.length}/${LIMITS.eventDescription.max} — what will people do and take away?`}
            error={err("description")}
          >
            <textarea
              value={f.description}
              onChange={(e) => set("description", e.target.value)}
              rows={5}
              maxLength={LIMITS.eventDescription.max}
              placeholder="A hands-on introduction to the potter's wheel…"
              className={inputCls}
            />
          </Field>
        </div>
      )}

      {/* STEP 2 — When */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <label className={labelCls}>Date</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {shortcuts.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => set("date", s.value)}
                  className={chip(f.date === s.value)}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <input
              type="date"
              value={f.date}
              min={todayISO()}
              onChange={(e) => set("date", e.target.value)}
              className={inputCls}
            />
            {err("date") && <p className={errCls}>{err("date")}</p>}
          </div>

          <div>
            <label className={labelCls}>Start time</label>
            <select
              value={f.startTime}
              onChange={(e) => set("startTime", e.target.value)}
              className={inputCls}
            >
              <option value="">Choose a time…</option>
              {times.map((t) => (
                <option key={t.value} value={t.value} className="bg-surface2">
                  {t.label}
                </option>
              ))}
            </select>
            {err("startTime") && <p className={errCls}>{err("startTime")}</p>}
          </div>

          <div>
            <label className={labelCls}>How long will it run?</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {DURATIONS.map((d) => (
                <button
                  key={d.mins}
                  type="button"
                  onClick={() => set("durationMins", d.mins)}
                  className={chip(f.durationMins === d.mins)}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {f.date && f.startTime && (
            <div className="rounded-xl border border-gold/25 bg-gold/10 p-3 text-sm text-gold">
              {describeWhen(f.date, f.startTime, f.durationMins)}
              <span className="ml-2 text-xs text-muted">(IST)</span>
            </div>
          )}
        </div>
      )}

      {/* STEP 3 — Where */}
      {step === 2 && (
        <div className="space-y-5">
          <div>
            <label className={labelCls}>Venue type</label>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {(
                [
                  ["public", "Public venue", "Café, studio, hall — address shown to everyone"],
                  ["private", "Private venue", "A home or private space — address shared only after booking"],
                ] as const
              ).map(([value, label, hint]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => set("venueType", value)}
                  className={`rounded-xl border p-3 text-left transition-colors ${
                    f.venueType === value
                      ? "border-gold bg-gold/10"
                      : "border-border bg-surface2 hover:border-gold/30"
                  }`}
                >
                  <span
                    className={`block text-sm font-medium ${f.venueType === value ? "text-gold" : "text-cream"}`}
                  >
                    {label}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">{hint}</span>
                </button>
              ))}
            </div>
          </div>

          <Field label="Venue name" error={err("venueName")}>
            <input
              value={f.venueName}
              onChange={(e) => set("venueName", e.target.value)}
              maxLength={LIMITS.venueName.max}
              placeholder="The Clay Studio"
              className={inputCls}
            />
          </Field>

          <Field
            label="Full address"
            hint={
              f.venueType === "private"
                ? "Only shared with attendees once they book."
                : undefined
            }
          >
            <input
              value={f.address}
              onChange={(e) => set("address", e.target.value)}
              maxLength={300}
              placeholder="12 Mhatre Bridge Rd, Kothrud"
              className={inputCls}
            />
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="City" error={err("city")}>
              <input
                value={f.city}
                onChange={(e) => set("city", e.target.value)}
                maxLength={LIMITS.city.max}
                placeholder="Pune"
                className={inputCls}
              />
            </Field>
            <Field label="Landmark">
              <input
                value={f.landmark}
                onChange={(e) => set("landmark", e.target.value)}
                maxLength={LIMITS.landmark.max}
                placeholder="Near Mhatre bridge"
                className={inputCls}
              />
            </Field>
          </div>

          <Field
            label="Google Maps link"
            hint="Optional — we build a directions link from the address if you skip this."
            error={err("mapsUrl")}
          >
            <input
              value={f.mapsUrl}
              onChange={(e) => set("mapsUrl", e.target.value)}
              inputMode="url"
              maxLength={LIMITS.url.max}
              placeholder="https://maps.app.goo.gl/…"
              className={inputCls}
            />
          </Field>
        </div>
      )}

      {/* STEP 4 — Tickets */}
      {step === 3 && (
        <div className="space-y-5">
          <Field label="Capacity" hint="How many people can attend?" error={err("capacity")}>
            <input
              type="number"
              inputMode="numeric"
              value={f.capacity}
              onChange={(e) => set("capacity", e.target.value)}
              min={1}
              max={LIMITS.capacity.max}
              placeholder="15"
              className={inputCls}
            />
          </Field>

          <div className="flex gap-2">
            {(
              [
                [false, "Paid"],
                [true, "Free"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={label}
                type="button"
                onClick={() => set("isFree", value)}
                className={`flex-1 ${chip(f.isFree === value)}`}
              >
                {label}
              </button>
            ))}
          </div>

          {!f.isFree && (
            <Field label="Ticket price (₹)" error={err("price")}>
              <input
                type="number"
                inputMode="numeric"
                value={f.price}
                onChange={(e) => set("price", e.target.value)}
                min={0}
                max={LIMITS.price.max}
                placeholder="800"
                className={inputCls}
              />
            </Field>
          )}

          <div>
            <label className={labelCls}>Materials</label>
            <div className="mt-2 flex gap-2">
              {(
                [
                  ["included", "Included"],
                  ["byo", "Bring your own"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => set("materials", value)}
                  className={`flex-1 ${chip(f.materials === value)}`}
                >
                  {label}
                </button>
              ))}
            </div>
            {f.materials === "byo" && (
              <input
                type="number"
                inputMode="numeric"
                value={f.addonPrice}
                onChange={(e) => set("addonPrice", e.target.value)}
                min={0}
                placeholder="Optional materials add-on price (₹)"
                className={`${inputCls} mt-2`}
              />
            )}
          </div>
        </div>
      )}

      {/* STEP 5 — Details */}
      {step === 4 && (
        <div className="space-y-5">
          <Field label="What to bring" hint="Optional">
            <input
              value={f.whatToBring}
              onChange={(e) => set("whatToBring", e.target.value)}
              maxLength={LIMITS.whatToBring.max}
              placeholder="An apron and a water bottle"
              className={inputCls}
            />
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Languages">
              <input
                value={f.languages}
                onChange={(e) => set("languages", e.target.value)}
                maxLength={200}
                placeholder="English, Marathi"
                className={inputCls}
              />
            </Field>
            <Field label="Age suitability">
              <input
                value={f.ageSuitability}
                onChange={(e) => set("ageSuitability", e.target.value)}
                maxLength={LIMITS.ageSuitability.max}
                placeholder="16+"
                className={inputCls}
              />
            </Field>
          </div>
          <Field label="Tags" hint={`Comma-separated · up to ${LIMITS.tags.maxCount}`}>
            <input
              value={f.tags}
              onChange={(e) => set("tags", e.target.value)}
              maxLength={200}
              placeholder="beginner, hands-on, weekend"
              className={inputCls}
            />
          </Field>
          <Field label="Cancellation policy" hint="Optional">
            <input
              value={f.cancellationPolicy}
              onChange={(e) => set("cancellationPolicy", e.target.value)}
              maxLength={LIMITS.cancellationPolicy.max}
              placeholder="Full refund up to 24h before"
              className={inputCls}
            />
          </Field>
        </div>
      )}

      {/* STEP 6 — Media */}
      {step === 5 && (
        <div className="space-y-6">
          <div>
            <label className={labelCls}>Cover image</label>
            <p className="mt-0.5 text-xs text-muted">
              Shown on your event page and in listings.
            </p>
            {f.coverUrl && (
              <div className="mt-2 overflow-hidden rounded-xl border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.coverUrl} alt="" className="aspect-video w-full object-cover" />
              </div>
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                if (e.target.files?.length) handleUpload(e.target.files, "cover");
                e.target.value = "";
              }}
              className="mt-2 block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-surface2 file:px-3 file:py-2 file:text-sm file:text-cream hover:file:bg-surface"
            />
          </div>

          <div>
            <label className={labelCls}>Photos — what to expect</label>
            <p className="mt-0.5 text-xs text-muted">
              Up to {MAX_PHOTOS}: the space, past sessions, what people make.
            </p>
            {f.photos.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {f.photos.map((src, i) => (
                  <div key={src} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt={`Photo ${i + 1}`}
                      className="h-20 w-28 rounded-lg border border-border object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => set("photos", f.photos.filter((x) => x !== src))}
                      aria-label={`Remove photo ${i + 1}`}
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-crimson text-xs text-white"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            {f.photos.length < MAX_PHOTOS && (
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(e) => {
                  if (e.target.files?.length) handleUpload(e.target.files, "gallery");
                  e.target.value = "";
                }}
                className="mt-2 block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-surface2 file:px-3 file:py-2 file:text-sm file:text-cream hover:file:bg-surface"
              />
            )}
            <p className="mt-1 text-xs text-muted">
              {f.photos.length}/{MAX_PHOTOS} added
            </p>
          </div>

          {uploading && <p className="text-xs text-muted">Uploading…</p>}
          {uploadError && <p className={errCls}>{uploadError}</p>}
        </div>
      )}

      {/* STEP 7 — Preview */}
      {step === 6 && (
        <div className="space-y-4">
          {!allValid && (
            <div className="rounded-xl border border-crimson/30 bg-crimson/10 p-3 text-sm text-crimson">
              Some required details are missing. Fix the steps marked in red above.
            </div>
          )}

          <div className="overflow-hidden rounded-2xl border border-border bg-surface">
            {f.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={f.coverUrl} alt="" className="aspect-video w-full object-cover" />
            ) : (
              <div className="flex aspect-video w-full items-center justify-center bg-surface2 font-display text-2xl text-muted/40">
                {f.category || "No cover"}
              </div>
            )}
            <div className="p-5">
              <p className="text-xs uppercase tracking-widest text-gold">
                {f.category || "—"}
              </p>
              <h3 className="mt-1 font-display text-2xl text-cream">
                {f.title || "Untitled event"}
              </h3>
              <dl className="mt-4 space-y-2 text-sm">
                {[
                  ["When", describeWhen(f.date, f.startTime, f.durationMins)],
                  [
                    "Where",
                    [f.venueName, f.city].filter(Boolean).join(", ") || "Not set",
                  ],
                  ["Venue", f.venueType === "private" ? "Private (address after booking)" : "Public"],
                  ["Capacity", f.capacity ? `${f.capacity} people` : "Not set"],
                  [
                    "Price",
                    f.isFree ? "Free" : f.price ? formatINR(Number(f.price) * 100) : "Not set",
                  ],
                  ["Photos", `${f.photos.length} added`],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4">
                    <dt className="text-muted">{k}</dt>
                    <dd className="text-right text-cream">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          <p className="text-xs text-muted">
            Publishing makes this page public and shareable. You can save a draft
            instead and finish later.
          </p>
        </div>
      )}

      {serverErrors.length > 0 && (
        <ul className="mt-5 list-inside list-disc rounded-xl border border-crimson/30 bg-crimson/10 p-3 text-sm text-crimson">
          {serverErrors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
      {draftMsg && <p className="mt-5 text-sm text-emerald-400">{draftMsg}</p>}
      {showErrors && stepErrorList(step).length > 0 && (
        <p className="mt-4 text-sm text-crimson">
          Please fix the highlighted fields to continue.
        </p>
      )}

      {/* Navigation */}
      <div className="mt-8 flex items-center gap-3">
        {step > 0 && (
          <button
            type="button"
            onClick={back}
            className="rounded-xl border border-border bg-surface px-5 py-2.5 text-sm font-medium text-cream"
          >
            Back
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={next}
            className="flex-1 rounded-xl bg-gold px-5 py-2.5 text-sm font-semibold text-onaccent transition-colors hover:bg-saffron"
          >
            Continue
          </button>
        ) : (
          <button
            type="button"
            onClick={() => submit(true)}
            disabled={busy !== null || uploading}
            className="flex-1 rounded-xl bg-gold px-5 py-2.5 text-sm font-semibold text-onaccent transition-colors hover:bg-saffron disabled:opacity-50"
          >
            {busy === "publish" ? "Publishing…" : "Publish event"}
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => submit(false)}
        disabled={busy !== null || uploading || !f.title.trim()}
        className="mt-3 w-full text-center text-xs text-muted underline disabled:opacity-40"
      >
        {busy === "draft" ? "Saving…" : "Save as draft"}
      </button>
    </div>
  );
}
