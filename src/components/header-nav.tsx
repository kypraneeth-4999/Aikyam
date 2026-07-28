"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavLink = { href: string; label: string };

/**
 * Mobile-first header navigation. On phones everything collapses into a
 * slide-down sheet behind a menu button — previously these links were simply
 * `hidden` on small screens, so signed-in users had no way to reach their
 * tickets or settings at all.
 */
export function HeaderNav({
  categories,
  links,
  cta,
  signedIn,
}: {
  categories: NavLink[];
  links: NavLink[];
  cta: NavLink;
  signedIn: boolean;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the sheet on navigation.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Don't let the page scroll behind an open sheet.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const quiet = "text-sm text-muted transition-colors hover:text-cream";

  return (
    <>
      <div className="flex min-w-0 items-center gap-10">
        <Link
          href="/"
          className="font-display text-2xl tracking-wide text-gold transition-colors hover:text-saffron"
        >
          Aikyam
        </Link>
        {/* Desktop category links */}
        <div className="hidden items-center gap-7 md:flex">
          {categories.map((c) => (
            <Link key={c.href} href={c.href} className={quiet}>
              {c.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-4 sm:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={quiet}>
              {l.label}
            </Link>
          ))}
        </div>

        <Link
          href={cta.href}
          className="rounded-full bg-gold px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-saffron"
        >
          {cta.label}
        </Link>

        {/* Menu button — phones only */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className="-mr-2 flex h-11 w-11 items-center justify-center rounded-lg text-cream sm:hidden"
        >
          <span className="relative block h-4 w-5">
            <span
              className={`absolute left-0 block h-0.5 w-5 bg-current transition-all ${open ? "top-1.5 rotate-45" : "top-0"}`}
            />
            <span
              className={`absolute left-0 top-1.5 block h-0.5 w-5 bg-current transition-all ${open ? "opacity-0" : "opacity-100"}`}
            />
            <span
              className={`absolute left-0 block h-0.5 w-5 bg-current transition-all ${open ? "top-1.5 -rotate-45" : "top-3"}`}
            />
          </span>
        </button>
      </div>

      {/* Mobile sheet */}
      {open && (
        <div className="fixed inset-x-0 top-16 z-40 max-h-[calc(100dvh-4rem)] overflow-y-auto border-b border-border bg-ink/98 backdrop-blur-md sm:hidden">
          <nav className="px-6 py-4">
            {links.length > 0 && (
              <ul className="space-y-1 border-b border-border pb-4">
                {links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="block rounded-lg px-2 py-3 text-base text-cream hover:bg-surface"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            <p className="px-2 pb-2 pt-4 text-xs uppercase tracking-widest text-muted">
              Browse
            </p>
            <ul className="space-y-1">
              {categories.map((c) => (
                <li key={c.href}>
                  <Link
                    href={c.href}
                    className="block rounded-lg px-2 py-3 text-base text-muted hover:bg-surface hover:text-cream"
                  >
                    {c.label}
                  </Link>
                </li>
              ))}
            </ul>

            {!signedIn && (
              <Link
                href="/login"
                className="mt-4 block rounded-xl border border-border px-2 py-3 text-center text-base text-cream"
              >
                Sign in
              </Link>
            )}
          </nav>
        </div>
      )}
    </>
  );
}
