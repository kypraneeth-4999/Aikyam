"use client";

import { useState } from "react";

/** "What to expect" album — big image plus thumbnails. */
export function EventGallery({ photos, title }: { photos: string[]; title: string }) {
  const [active, setActive] = useState(0);
  if (photos.length === 0) return null;

  return (
    <section>
      <h2 className="mb-4 font-display text-2xl text-cream">What to expect</h2>
      <div className="overflow-hidden rounded-2xl border border-border bg-surface2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photos[active]}
          alt={`${title} — photo ${active + 1} of ${photos.length}`}
          className="aspect-video w-full object-cover"
        />
      </div>
      {photos.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {photos.map((src, i) => (
            <button
              key={src}
              onClick={() => setActive(i)}
              aria-label={`View photo ${i + 1}`}
              aria-current={i === active}
              className={`h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                i === active
                  ? "border-gold"
                  : "border-transparent opacity-50 hover:opacity-90"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
