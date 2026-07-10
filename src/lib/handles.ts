/**
 * Handle (@username) utilities — JAD P2.
 *
 * Format rules (enforced here and mirrored by a DB CHECK constraint):
 * lowercase a-z, 0-9, single hyphens; length 3-30; no leading/trailing or
 * consecutive hyphens; unique case-insensitively.
 */

export const HANDLE_MIN = 3;
export const HANDLE_MAX = 30;
export const HANDLE_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Turn a display name into a candidate handle (e.g. "Priya Sharma" -> "priya-sharma"). */
export function slugifyHandle(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "") // strip combining marks (accents)
    .replace(/[^a-z0-9]+/g, "-") // non-alphanumeric -> hyphen
    .replace(/-+/g, "-") // collapse repeats
    .replace(/^-+|-+$/g, "") // trim hyphens
    .slice(0, HANDLE_MAX)
    .replace(/-+$/g, ""); // slice may leave a trailing hyphen
}

/** Returns null if the handle is well-formed, otherwise a human-readable reason. */
export function validateHandleFormat(handle: string): string | null {
  if (handle.length < HANDLE_MIN)
    return `Handle must be at least ${HANDLE_MIN} characters.`;
  if (handle.length > HANDLE_MAX)
    return `Handle must be at most ${HANDLE_MAX} characters.`;
  if (!HANDLE_RE.test(handle))
    return "Use lowercase letters, numbers, and single hyphens (no spaces).";
  return null;
}

/** Short/premium handles (<=4 chars) are reserved for verified organizers (P2). */
export function isPremiumHandle(handle: string): boolean {
  return handle.length <= 4;
}

/** Strip a leading "@" and lowercase - for parsing a URL segment or user input. */
export function normalizeHandleInput(raw: string): string {
  return raw.trim().replace(/^@+/, "").toLowerCase();
}
