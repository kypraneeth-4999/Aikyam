"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES } from "@/config/categories";

const inputCls =
  "mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 dark:border-white/15";
const labelCls = "block text-sm font-medium";

export function EventForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isFree, setIsFree] = useState(false);
  const [materials, setMaterials] = useState<"included" | "byo">("included");
  const [busy, setBusy] = useState<null | "draft" | "publish">(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [draftMsg, setDraftMsg] = useState<string | null>(null);

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
      {/* Basics */}
      <div>
        <label className={labelCls}>Title</label>
        <input name="title" required minLength={3} placeholder="Beginner's wheel-throwing pottery" className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Category</label>
        <select name="category" required defaultValue="" className={inputCls}>
          <option value="" disabled>
            Choose a category…
          </option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelCls}>Description</label>
        <textarea name="description" rows={4} placeholder="What will attendees do and take away?" className={inputCls} />
      </div>

      {/* When */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Starts (IST)</label>
          <input type="datetime-local" name="starts_at" required className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Ends (optional)</label>
          <input type="datetime-local" name="ends_at" className={inputCls} />
        </div>
      </div>

      {/* Where */}
      <div>
        <label className={labelCls}>Venue name</label>
        <input name="venue_name" placeholder="The Clay Studio, Kothrud" className={inputCls} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Google Maps link</label>
          <input name="maps_url" inputMode="url" placeholder="https://maps.app.goo.gl/…" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Landmark</label>
          <input name="landmark" placeholder="Near Mhatre bridge" className={inputCls} />
        </div>
      </div>

      {/* Capacity & price */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Capacity</label>
          <input type="number" name="capacity" required min={1} step={1} placeholder="15" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Ticket price (₹)</label>
          <input
            type="number"
            name="price"
            min={0}
            step={1}
            disabled={isFree}
            placeholder="800"
            className={`${inputCls} disabled:opacity-50`}
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={isFree} onChange={(e) => setIsFree(e.target.checked)} />
        This is a free event
      </label>

      {/* Materials */}
      <div>
        <label className={labelCls}>Materials</label>
        <div className="mt-1 flex gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="radio" name="materials-ui" checked={materials === "included"} onChange={() => setMaterials("included")} />
            Included
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="materials-ui" checked={materials === "byo"} onChange={() => setMaterials("byo")} />
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

      {/* Details */}
      <div>
        <label className={labelCls}>What to bring (optional)</label>
        <input name="what_to_bring" placeholder="An apron and a water bottle" className={inputCls} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Languages</label>
          <input name="languages" placeholder="English, Marathi" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Age suitability</label>
          <input name="age_suitability" placeholder="16+" className={inputCls} />
        </div>
      </div>
      <div>
        <label className={labelCls}>Tags (comma-separated)</label>
        <input name="tags" placeholder="beginner, hands-on, weekend" className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Cancellation policy (optional)</label>
        <input name="cancellation_policy" placeholder="Full refund up to 24h before" className={inputCls} />
      </div>

      {errors.length > 0 && (
        <ul className="list-inside list-disc rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
      {draftMsg && <p className="text-sm text-green-600">{draftMsg}</p>}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => submit(false)}
          disabled={busy !== null}
          className="flex-1 rounded-lg border border-black/10 px-3 py-2 text-sm font-medium disabled:opacity-50 dark:border-white/15"
        >
          {busy === "draft" ? "Saving…" : "Save draft"}
        </button>
        <button
          type="submit"
          disabled={busy !== null}
          className="flex-1 rounded-lg bg-foreground px-3 py-2 text-sm font-medium text-background disabled:opacity-50"
        >
          {busy === "publish" ? "Publishing…" : "Publish"}
        </button>
      </div>
      <p className="text-xs text-zinc-500">
        Note: media upload and Instagram import arrive later in this slice. Times are in IST.
      </p>
    </form>
  );
}
