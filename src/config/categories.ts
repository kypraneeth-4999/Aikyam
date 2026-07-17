// Pune cultural categories (JAD Appendix B #3: all categories at launch).
export const CATEGORIES = [
  "Pottery",
  "Poetry",
  "Heritage walk",
  "Folk art",
  "Music",
  "Dance",
  "Theatre",
  "Painting & crafts",
  "Photography",
  "Food & cooking",
  "Wellness & yoga",
  "Storytelling",
  "Film & discussion",
  "Language & culture",
] as const;

export type Category = (typeof CATEGORIES)[number];

export function isCategory(v: string): v is Category {
  return (CATEGORIES as readonly string[]).includes(v);
}
