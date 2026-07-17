/** Slugify an event title (lowercase, hyphenated, <=60 chars). A random suffix
 *  is appended by the server to guarantee uniqueness. */
export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "") // strip accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}
