import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fetchDiscoverEvents, type DiscoverEvent } from "@/lib/discovery";
import { CATEGORIES } from "@/config/categories";
import { formatEventShort } from "@/lib/datetime";
import { formatINR } from "@/lib/money";

function EventCard({ ev, featured = false }: { ev: DiscoverEvent; featured?: boolean }) {
  const img = ev.cover_media ?? ev.photos?.[0] ?? null;
  return (
    <Link
      href={`/e/${ev.slug}`}
      className="group block overflow-hidden rounded-xl border border-black/10 transition-colors hover:bg-black/[.02] dark:border-white/15 dark:hover:bg-white/[.03]"
    >
      <div
        className={`relative flex ${featured ? "aspect-[16/7]" : "aspect-[16/9]"} items-center justify-center bg-zinc-100 text-sm text-zinc-400 dark:bg-zinc-900`}
      >
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt={ev.title} className="h-full w-full object-cover" />
        ) : (
          ev.category
        )}
        <span className="absolute left-3 top-3 rounded-full bg-black/70 px-2 py-1 text-xs font-medium text-white">
          {ev.category}
        </span>
        {ev.is_free && (
          <span className="absolute right-3 top-3 rounded-full bg-green-600 px-2 py-1 text-xs font-medium text-white">
            Free
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className={`font-semibold ${featured ? "text-xl" : "text-base"}`}>{ev.title}</h3>
        <p className="mt-1 text-xs text-zinc-500">
          {formatEventShort(ev.starts_at)}
          {ev.host ? ` · ${ev.host.name}` : ""}
        </p>
        <p className="mt-2 text-sm font-medium">
          {ev.is_free ? "Free" : formatINR(ev.price)}
        </p>
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
    typeof category === "string" && (CATEGORIES as readonly string[]).includes(category)
      ? category
      : undefined;

  const [user, events] = await Promise.all([
    getCurrentUser(),
    fetchDiscoverEvents(activeCategory),
  ]);

  let handle: string | null = null;
  if (user) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("organizer_profiles")
      .select("handle")
      .eq("user_id", user.id)
      .maybeSingle();
    handle = data?.handle ?? null;
  }

  const [featured, ...rest] = events;
  const chip =
    "rounded-full border px-3 py-1 text-sm transition-colors border-black/10 hover:bg-black/[.04] dark:border-white/15 dark:hover:bg-white/[.06]";
  const chipActive = "rounded-full bg-foreground px-3 py-1 text-sm font-medium text-background";

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-black/10 px-6 py-4 dark:border-white/10">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Aikyam
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {user && handle && (
            <Link href="/organizer/events/new" className="font-medium">
              List event
            </Link>
          )}
          {user && !handle && (
            <Link href="/organizer/new" className="font-medium">
              Become an organizer
            </Link>
          )}
          {user && handle && (
            <Link href={`/@${handle}`} className="text-zinc-500">
              My page
            </Link>
          )}
          {!user && (
            <Link href="/login" className="font-medium">
              Sign in
            </Link>
          )}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        <div className="flex items-baseline justify-between">
          <h1 className="text-3xl font-semibold tracking-tight">Upcoming events</h1>
          <span className="text-sm text-zinc-500">
            {events.length} event{events.length === 1 ? "" : "s"} found
          </span>
        </div>

        {/* Category filter */}
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/" className={activeCategory ? chip : chipActive}>
            All
          </Link>
          {CATEGORIES.map((c) => (
            <Link
              key={c}
              href={`/?category=${encodeURIComponent(c)}`}
              className={activeCategory === c ? chipActive : chip}
            >
              {c}
            </Link>
          ))}
        </div>

        {events.length === 0 ? (
          <p className="mt-10 text-sm text-zinc-500">
            No upcoming events yet{activeCategory ? ` in ${activeCategory}` : ""}. Check back soon.
          </p>
        ) : (
          <>
            {featured && (
              <div className="mt-8">
                <EventCard ev={featured} featured />
              </div>
            )}
            {rest.length > 0 && (
              <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((ev) => (
                  <EventCard key={ev.id} ev={ev} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
