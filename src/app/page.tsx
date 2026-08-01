import Link from "next/link";
import { fetchDiscoverEvents, type DiscoverEvent } from "@/lib/discovery";
import { CATEGORIES } from "@/config/categories";
import { formatEventShort, formatEventWhen } from "@/lib/datetime";
import { formatINR } from "@/lib/money";

function EventCard({ ev }: { ev: DiscoverEvent }) {
  const img = ev.cover_media ?? ev.photos?.[0] ?? null;
  return (
    <Link
      href={`/e/${ev.slug}`}
      className="group block overflow-hidden rounded-2xl border border-border bg-surface transition-all duration-300 hover:-translate-y-1 hover:border-gold/30 hover:shadow-[0_8px_32px_rgba(244,160,28,0.1)]"
    >
      <div className="relative h-48 overflow-hidden bg-surface2">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt={ev.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-display text-3xl text-muted/40">
            {ev.category}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink/60 to-transparent" />
        {ev.is_featured ? (
          <span className="absolute left-3 top-3 rounded-full bg-gold/90 px-2.5 py-1 text-xs font-semibold text-onaccent">
            ✦ Featured
          </span>
        ) : ev.is_free ? (
          <span className="absolute left-3 top-3 rounded-full bg-emerald-600/75 px-2.5 py-1 text-xs font-semibold text-white">
            Free
          </span>
        ) : null}
        <span className="absolute right-3 top-3 rounded-full border border-border bg-ink/60 px-2.5 py-1 text-xs text-cream/80 backdrop-blur-sm">
          {ev.category}
        </span>
      </div>
      <div className="p-5">
        <h3 className="mb-1 line-clamp-2 text-sm font-semibold leading-snug text-cream transition-colors group-hover:text-gold">
          {ev.title}
        </h3>
        {(ev.venue_name || ev.city) && (
          <p className="mb-1 flex items-center gap-1 truncate text-xs text-muted">
            <span className="shrink-0">◎</span>
            <span className="truncate">
              {ev.venue_type === "private"
                ? (ev.city ?? "Private venue")
                : [ev.venue_name, ev.city].filter(Boolean).join(", ")}
            </span>
          </p>
        )}
        {ev.host && (
          <p className="mb-4 truncate text-xs text-muted">by {ev.host.name}</p>
        )}
        <div className="flex items-center justify-between gap-2">
          <span className="truncate rounded-full bg-gold/10 px-2.5 py-1 text-xs font-medium text-gold">
            {formatEventShort(ev.starts_at)}
          </span>
          <span className="shrink-0 text-sm font-semibold text-cream">
            {ev.is_free ? "Free" : formatINR(ev.price)}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const activeCategory =
    typeof category === "string" &&
    (CATEGORIES as readonly string[]).includes(category)
      ? category
      : undefined;

  const events = await fetchDiscoverEvents(activeCategory);
  // Admin-curated featured event drives the hero; fall back to the soonest.
  const featured = events.find((e) => e.is_featured) ?? events[0];
  const heroImg = featured?.cover_media ?? featured?.photos?.[0] ?? null;

  const pillBase =
    "flex items-center gap-1.5 whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-medium transition-all";
  const pillActive = "bg-gold text-onaccent shadow-[0_0_20px_rgba(244,160,28,0.35)]";
  const pillIdle =
    "border border-border bg-surface text-muted hover:border-gold/30 hover:text-cream";

  return (
    <>
      {/* HERO */}
      {featured ? (
        <section className="relative h-[60vh] min-h-[420px] overflow-hidden sm:h-[70vh]">
          <div className="absolute inset-0 bg-surface2">
            {heroImg && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={heroImg}
                alt={featured.title}
                className="h-full w-full object-cover opacity-55"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/65 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-transparent" />
          </div>
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(to right, #F4A01C 1px, transparent 1px), linear-gradient(to bottom, #F4A01C 1px, transparent 1px)",
              backgroundSize: "80px 80px",
            }}
          />
          <div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col justify-end px-4 pb-16 sm:px-6">
            <div className="max-w-2xl">
              <span className="mb-5 inline-block rounded-full border border-gold/25 bg-gold/15 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-gold">
                ✦ Featured
              </span>
              <h1 className="mb-4 font-display text-3xl leading-tight text-cream sm:text-5xl sm:leading-none md:text-7xl">
                {featured.title}
              </h1>
              <p className="mb-8 text-sm text-muted">
                {formatEventWhen(featured.starts_at, null)}
                {featured.city ? `  ·  ${featured.city}` : ""}
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <Link
                  href={`/e/${featured.slug}`}
                  className="rounded-full bg-gold px-7 py-3 font-semibold text-onaccent transition-all hover:scale-105 hover:bg-saffron active:scale-95"
                >
                  {featured.is_free
                    ? "Get free pass"
                    : `Get tickets — ${formatINR(featured.price)}`}
                </Link>
                <a
                  href="#events"
                  className="rounded-full border border-cream/20 px-7 py-3 text-cream transition-all hover:bg-cream/10"
                >
                  Explore all events
                </a>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="mx-auto w-full max-w-7xl px-4 py-20 text-center sm:px-6">
          <h1 className="font-display text-4xl text-cream sm:text-6xl">
            India&apos;s cultural events
          </h1>
          <p className="mt-4 text-muted">
            Discover and book authentic local experiences. Be the first to list one.
          </p>
        </section>
      )}

      <main className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6">
        {/* CATEGORY PILLS */}
        <div id="events" className="mb-10 flex gap-2 overflow-x-auto pb-2">
          <Link href="/" className={`${pillBase} ${!activeCategory ? pillActive : pillIdle}`}>
            All
          </Link>
          {CATEGORIES.map((c) => (
            <Link
              key={c}
              href={`/?category=${encodeURIComponent(c)}`}
              className={`${pillBase} ${activeCategory === c ? pillActive : pillIdle}`}
            >
              {c}
            </Link>
          ))}
        </div>

        {/* GRID HEADER */}
        <div className="mb-7 flex items-baseline justify-between">
          <h2 className="font-display text-3xl text-cream">
            {activeCategory ?? "Upcoming events"}
          </h2>
          <span className="text-sm text-muted">
            {events.length} event{events.length === 1 ? "" : "s"} found
          </span>
        </div>

        {events.length === 0 ? (
          <div className="py-24 text-center text-muted">
            <p className="mb-5 text-5xl opacity-40">◎</p>
            <p>
              No events yet{activeCategory ? ` in ${activeCategory}` : ""}. Check
              back soon.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((ev) => (
              <EventCard key={ev.id} ev={ev} />
            ))}
          </div>
        )}

        {/* ORGANISER CTA */}
        <section className="mt-16 overflow-hidden rounded-2xl">
          {/* The gradient is fixed dark in both themes, so the panel opts into
              the dark palette — otherwise light mode paints near-black text on
              it. See the [data-theme="dark"] block in globals.css. */}
          <div
            data-theme="dark"
            className="relative p-10 md:p-14"
            style={{
              background:
                "linear-gradient(135deg, #1E0A00 0%, #2A0E1A 50%, #0E0A20 100%)",
            }}
          >
            <div className="relative max-w-xl">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gold">
                For organisers
              </p>
              <h3 className="mb-4 font-display text-4xl leading-tight text-cream">
                Host your event on Aikyam
              </h3>
              <p className="mb-7 text-sm leading-relaxed text-cream/60">
                A beautiful event page, payments, and QR check-in — free to start.
                Put your link in your Instagram bio and start selling.
              </p>
              <Link
                href="/organizer/new"
                className="rounded-full bg-gold px-6 py-3 text-sm font-semibold text-onaccent transition-all hover:scale-105 hover:bg-saffron active:scale-95"
              >
                Become an organiser
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
