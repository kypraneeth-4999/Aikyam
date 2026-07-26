/**
 * Minimal content-moderation hook (JAD §6.5: "content-moderation hook (even
 * manual) on event text/images before/after publish").
 *
 * This is a deliberately small starter blocklist. It's the *hook* — the call
 * site + rejection path — that matters; the list should later move to a config
 * table (like reserved_handles) or a real moderation service, and add image
 * scanning.
 */
const BLOCKED: string[] = [
  "nigger",
  "faggot",
  "chink",
  "kike",
  "rape",
  "child porn",
];

export function moderateText(text: string): { ok: boolean; reason?: string } {
  const haystack = ` ${text.toLowerCase()} `;
  for (const term of BLOCKED) {
    if (haystack.includes(term)) {
      return {
        ok: false,
        reason:
          "This content may violate our community guidelines. Please revise it.",
      };
    }
  }
  return { ok: true };
}
