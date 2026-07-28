/**
 * Shared field limits and validators.
 *
 * Both the forms and the API import these, so the client hint and the server
 * rule can never drift apart. The server is always the authority — client-side
 * limits are a convenience, never a guarantee.
 */

export const LIMITS = {
  name: { min: 2, max: 100 },
  city: { max: 100 },
  bio: { max: 500 },
  eventTitle: { min: 3, max: 120 },
  eventDescription: { max: 5000 },
  venueName: { max: 150 },
  landmark: { max: 150 },
  whatToBring: { max: 300 },
  cancellationPolicy: { max: 300 },
  ageSuitability: { max: 40 },
  guestName: { max: 100 },
  reviewComment: { max: 1000 },
  organizerResponse: { max: 1000 },
  collaboratorName: { max: 100 },
  url: { max: 500 },
  capacity: { min: 1, max: 10000 },
  /** Rupees. 0 = free; upper bound is a sanity guard, not a business rule. */
  price: { min: 0, max: 1000000 },
  seats: { min: 1, max: 20 },
  tags: { maxCount: 10, maxLen: 30 },
  languages: { maxCount: 10, maxLen: 30 },
} as const;

/** Trim and cap a string; returns null when empty. */
export function str(v: unknown, max: number): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s.slice(0, max) : null;
}

/** Normalise a user-typed URL to a valid http(s) URL, or null. */
export function httpUrl(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s || s.length > LIMITS.url.max) return null;
  const withProto = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  try {
    const u = new URL(withProto);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (!u.hostname.includes(".")) return null;
    return u.toString();
  } catch {
    return null;
  }
}

/** Parse a comma-separated or array input into a bounded list of short tags. */
export function tagList(
  v: unknown,
  opts: { maxCount: number; maxLen: number },
): string[] {
  const raw = Array.isArray(v)
    ? v.map((x) => String(x))
    : typeof v === "string"
      ? v.split(",")
      : [];
  return raw
    .map((x) => x.trim().slice(0, opts.maxLen))
    .filter(Boolean)
    .slice(0, opts.maxCount);
}

/** Interpret a datetime-local value ("YYYY-MM-DDTHH:MM") as IST (Pune). */
export function parseISTLocal(s: unknown): Date | null {
  if (typeof s !== "string" || !s) return null;
  const withSecs = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s) ? `${s}:00` : s;
  const d = new Date(`${withSecs}+05:30`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export type EventInput = Record<string, unknown>;

/**
 * Validate an event payload. Returns human-readable errors; empty means valid.
 * `publish` applies the stricter rules that only matter for a live listing.
 */
export function validateEvent(
  body: EventInput,
  publish: boolean,
  isCategory: (v: string) => boolean,
): string[] {
  const errors: string[] = [];

  const title = String(body.title ?? "").trim();
  if (title.length < LIMITS.eventTitle.min) {
    errors.push(`Title must be at least ${LIMITS.eventTitle.min} characters.`);
  } else if (title.length > LIMITS.eventTitle.max) {
    errors.push(`Title must be under ${LIMITS.eventTitle.max} characters.`);
  }

  if (!isCategory(String(body.category ?? ""))) errors.push("Pick a category.");

  const description = typeof body.description === "string" ? body.description : "";
  if (description.length > LIMITS.eventDescription.max) {
    errors.push(
      `Description must be under ${LIMITS.eventDescription.max} characters.`,
    );
  }

  const isFree = Boolean(body.is_free);
  const price = Number(body.price ?? 0);
  if (!isFree) {
    if (!Number.isFinite(price) || price < LIMITS.price.min) {
      errors.push("Enter a valid ticket price.");
    } else if (price > LIMITS.price.max) {
      errors.push("That ticket price looks too high — please check it.");
    }
  }

  const capacity = Number(body.capacity ?? 0);
  if (!Number.isInteger(capacity) || capacity < LIMITS.capacity.min) {
    errors.push("Capacity must be a whole number of at least 1.");
  } else if (capacity > LIMITS.capacity.max) {
    errors.push(`Capacity must be ${LIMITS.capacity.max} or fewer.`);
  }

  const startsAt = parseISTLocal(body.starts_at);
  const endsAt = parseISTLocal(body.ends_at);
  if (!startsAt) {
    errors.push("Start date & time is required.");
  } else if (publish && startsAt.getTime() < Date.now()) {
    errors.push("Start time must be in the future.");
  }
  if (endsAt && startsAt && endsAt <= startsAt) {
    errors.push("End time must be after the start time.");
  }

  if (publish && !String(body.venue_name ?? "").trim()) {
    errors.push("Venue name is required to publish.");
  }

  if (body.maps_url && !httpUrl(body.maps_url)) {
    errors.push("The Google Maps link doesn't look like a valid URL.");
  }

  const addon = Number(body.materials_addon_price ?? 0);
  if (body.materials === "byo" && addon && (!Number.isFinite(addon) || addon < 0)) {
    errors.push("Enter a valid materials add-on price.");
  }

  return errors;
}
