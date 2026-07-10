import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
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

  const cta = "rounded-full bg-foreground px-6 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90";

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <span className="mb-5 inline-flex items-center rounded-full border border-black/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-zinc-500 dark:border-white/15 dark:text-zinc-400">
        Pre-launch · Pune
      </span>
      <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl">Aikyam</h1>
      <p className="mt-4 max-w-xl text-lg leading-8 text-zinc-600 dark:text-zinc-400">
        The organizer&apos;s platform for small, hyperlocal cultural experiences —
        pottery classes, poetry evenings, heritage walks, folk-art workshops.
      </p>

      <div className="mt-10 flex flex-col items-center gap-3">
        {!user && (
          <Link href="/login" className={cta}>
            Sign in
          </Link>
        )}
        {user && !handle && (
          <Link href="/organizer/new" className={cta}>
            Create your organizer page
          </Link>
        )}
        {user && handle && (
          <Link href={`/@${handle}`} className={cta}>
            View your organizer page
          </Link>
        )}
        {user && (
          <form action="/auth/signout" method="post">
            <button type="submit" className="text-xs text-zinc-500 underline">
              Sign out
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
