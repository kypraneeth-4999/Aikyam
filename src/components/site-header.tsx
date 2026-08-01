import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { HeaderNav, type NavLink } from "@/components/header-nav";

const CATEGORIES: NavLink[] = [
  { href: "/?category=Music", label: "Music" },
  { href: "/?category=Dance", label: "Dance" },
  { href: "/?category=Theatre", label: "Theatre" },
  { href: "/?category=Folk%20art", label: "Folk" },
  { href: "/?category=Film%20%26%20discussion", label: "Film" },
  { href: "/circles", label: "Circles" },
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

  const links: NavLink[] = [];
  if (user) {
    links.push({ href: "/tickets", label: "My tickets" });
    if (handle) {
      links.push({ href: "/dashboard", label: "Dashboard" });
      links.push({ href: `/@${handle}`, label: "My page" });
    }
    links.push({ href: "/settings", label: "Settings" });
  }

  const cta: NavLink = !user
    ? { href: "/login", label: "Sign in" }
    : handle
      ? { href: "/organizer/events/new", label: "List event" }
      : { href: "/organizer/new", label: "Become organiser" };

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-ink/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <HeaderNav
          categories={CATEGORIES}
          links={links}
          cta={cta}
          signedIn={!!user}
        />
      </div>
    </nav>
  );
}
