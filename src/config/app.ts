/**
 * Central app configuration.
 *
 * Anything that must be tunable without a code change reads from the
 * environment. The platform fee in particular is a business dial (JAD §1.5) —
 * never hard-code the percentage in payment logic; call platformFeePaise().
 */

/** Platform fee in basis points. 500 = 5.00%. */
export const PLATFORM_FEE_BPS = Number(process.env.PLATFORM_FEE_BPS ?? 500);

/**
 * Who absorbs the platform fee.
 * 'organizer' (locked default, JAD §1.5): order total = ticket price; the fee is
 * split out of the organizer's payout at settlement via Razorpay Route.
 * 'attendee': order total = ticket price + fee.
 */
export const FEE_BEARER: "organizer" | "attendee" = "organizer";

export const CURRENCY = "INR";

/** Normalise a site URL — tolerate a missing protocol (e.g. an env var set to
 *  "aikyam.vercel.app" instead of "https://aikyam.vercel.app"). */
function normalizeUrl(u: string): string {
  const t = u.trim();
  if (!t) return "http://localhost:3000";
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}

export const SITE_URL = normalizeUrl(
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
);

/**
 * Platform fee (in paise) for an order of `amountPaise` paise.
 * All money is handled in integer paise to match Razorpay and avoid float drift.
 */
export function platformFeePaise(amountPaise: number): number {
  return Math.round((amountPaise * PLATFORM_FEE_BPS) / 10000);
}
