import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, supabaseConfigured } from "@/lib/auth";
import { INTERESTS, PRIVACY_LABELS, type Circle } from "@/lib/circles";

export const metadata = {
  title: "Circles",
  description:
    "Small, vetted communities that meet in person — join by invitation and build standing by showing up.",
};

type CircleCard = Circle & { memberCount: number };

async function fetchCircles(interest?: string): Promise<CircleCard[]> {
  if (!supabaseConfigured()) return [];
  const admin = createAdminClient();
  let q = admin.from("circles").select("*").order("created_at", { ascending: false });
  if (interest) q = q.eq("interest", interest);
  const { data } = await q;
  const circles = (data ?? []) as Circle[];
  if (!circles.length) return [];

  const { data: members } = await admin
    .from("circle_members")
    .select("circle_id")
    .eq("status", "active")
    .in(
      "circle_id",
      circles.map((c) => c.id),
    );
  const counts = new Map<string, number>();
  for (const m of members ?? []) {
    counts.set(m.circle_id as string, (counts.get(m.circle_id as string) ?? 0) + 1);
  }
  return circles.map((c) => ({ ...c, memberCount: counts.get(c.id) ?? 0 }));
}

export default async function CirclesPage({
  searchParams,
}: {
  searchParams: Promise<{ interest?: string }>;
}) {
  const { interest } = await searchParams;
  const active =
    typeof interest === "string" && (INTERESTS as readonly string[]).includes(interest)
      ? interest
      : undefined;

  const [user, circles] = await Promise.all([getCurrentUser(), fetchCircles(active)]);

  const chip =
    "whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all";
  const chipOn = "bg-gold text-onaccent";
  const chipOff =
    "border border-border bg-surface text-muted hover:border-gold/30 hover:text-cream";

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-cream sm:text-4xl">Circles</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
            Small groups that meet in person, again and again. Most are joined by
            invitation or approval — and standing is earned by turning up, not by
            posting.
          </p>
        </div>
        <Link
          href={user ? "/circles/new" : "/login"}
          className="rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-onaccent transition-colors hover:bg-saffron"
        >
          Start a circle
        </Link>
      </div>

      <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
        <Link href="/circles" className={`${chip} ${!active ? chipOn : chipOff}`}>
          All
        </Link>
        {INTERESTS.map((i) => (
          <Link
            key={i}
            href={`/circles?interest=${encodeURIComponent(i)}`}
            className={`${chip} ${active === i ? chipOn : chipOff}`}
          >
            {i}
          </Link>
        ))}
      </div>

      {circles.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="font-display text-2xl text-cream">No circles yet</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
            Circles work best when someone with a room full of people starts one.
            That could be you.
          </p>
          <Link
            href={user ? "/circles/new" : "/login"}
            className="mt-6 inline-block rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-onaccent"
          >
            Start the first circle
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {circles.map((c) => (
            <Link
              key={c.id}
              href={`/circles/${c.slug}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface transition-all hover:-translate-y-0.5 hover:border-gold/30"
            >
              <div className="flex h-28 items-center justify-center bg-surface2">
                {c.cover_media ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.cover_media} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="font-display text-2xl text-muted/40">
                    {c.interest ?? "Circle"}
                  </span>
                )}
              </div>
              <div className="flex flex-1 flex-col p-4">
                <h2 className="font-semibold text-cream transition-colors group-hover:text-gold">
                  {c.name}
                </h2>
                {c.tagline && (
                  <p className="mt-1 line-clamp-2 text-xs text-muted">{c.tagline}</p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full border border-border px-2 py-0.5 text-muted">
                    {PRIVACY_LABELS[c.privacy].label}
                  </span>
                  {c.city && <span className="text-muted">◎ {c.city}</span>}
                </div>
                <p className="mt-auto pt-3 text-xs text-muted">
                  {c.memberCount} member{c.memberCount === 1 ? "" : "s"}
                  {c.max_members ? ` · ${c.max_members} max` : ""}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
