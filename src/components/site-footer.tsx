import Link from "next/link";

const COLUMNS: { title: string; links: [string, string][] }[] = [
  {
    title: "Discover",
    links: [
      ["Events", "/"],
      ["Become an organiser", "/organizer/new"],
    ],
  },
  {
    title: "Categories",
    links: [
      ["Music", "/?category=Music"],
      ["Dance", "/?category=Dance"],
      ["Theatre", "/?category=Theatre"],
      ["Folk art", "/?category=Folk%20art"],
    ],
  },
  {
    title: "For organisers",
    links: [
      ["List an event", "/organizer/events/new"],
      ["Your page", "/organizer/new"],
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface py-14">
      <div className="mx-auto mb-10 grid max-w-7xl grid-cols-1 gap-10 px-6 md:grid-cols-4">
        <div>
          <Link href="/" className="mb-3 block font-display text-3xl text-gold">
            Aikyam
          </Link>
          <p className="max-w-xs text-sm leading-relaxed text-muted">
            A marketplace for India&apos;s cultural events — from Carnatic ragas
            and Kathak recitals to heritage walks and craft fairs.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <p className="mb-5 text-sm font-semibold text-cream">{col.title}</p>
            <ul className="space-y-3">
              {col.links.map(([label, href]) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="text-sm text-muted transition-colors hover:text-gold"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 border-t border-border px-6 pt-6 sm:flex-row">
        <p className="text-xs text-muted">
          © {new Date().getFullYear()} Aikyam · Made in Pune 🇮🇳
        </p>
        <div className="flex gap-5 text-xs text-muted">
          <span>Privacy</span>
          <span>Terms</span>
          <span>Contact</span>
        </div>
      </div>
    </footer>
  );
}
