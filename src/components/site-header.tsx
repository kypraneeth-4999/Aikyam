import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const NAV: { label: string; cat: string }[] = [
  { label: "Music", cat: "Music" },
  { label: "Dance", cat: "Dance" },
  { label: "Theatre", cat: "Theatre" },
  { label: "Folk", cat: "Folk art" },
  { label: "Film", cat: "Film & discussion" },
];

export async function SiteHeader() {
  const user = await getCurrentUser();
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

  const pill =
    "rounded-full bg-gold px-4 py-1.5 text-sm font-semibold text-ink transition-colors hover:bg-saffron";
  const quiet = "text-sm text-muted transition-colors hover:text-cream";

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-ink/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <div className="flex items-center gap-10">
          <Link
            href="/"
            className="font-display text-2xl tracking-wide text-gold transition-colors hover:text-saffron"
          >
            Aikyam
          </Link>
          <div className="hidden items-center gap-7 md:flex">
            {NAV.map((n) => (
              <Link
                key={n.cat}
                href={`/?category=${encodeURIComponent(n.cat)}`}
                className={quiet}
              >
                {n.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {user && handle && (
            <Link href={`/@${handle}`} className={`hidden sm:block ${quiet}`}>
              My page
            </Link>
          )}
          {!user && (
            <Link href="/login" className={quiet}>
              Sign in
            </Link>
          )}
          {user && handle && (
            <Link href="/organizer/events/new" className={pill}>
              List event
            </Link>
          )}
          {user && !handle && (
            <Link href="/organizer/new" className={pill}>
              Become organiser
            </Link>
          )}
          {!user && (
            <Link href="/login" className={pill}>
              List event
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
