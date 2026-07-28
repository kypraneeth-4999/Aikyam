import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { AccountSettings } from "./account-settings";
import { OrganizerSettings } from "./organizer-settings";
import { DangerZone } from "./danger-zone";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const [{ data: profile }, { data: org }] = await Promise.all([
    admin
      .from("users")
      .select("name, city, email, phone, notification_prefs")
      .eq("id", user.id)
      .maybeSingle(),
    admin
      .from("organizer_profiles")
      .select("handle, bio, city, profile_photo, social_links")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const prefs = (profile?.notification_prefs ?? {}) as {
    email?: boolean;
    whatsapp?: boolean;
  };

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 sm:px-6 py-12">
      <h1 className="font-display text-3xl text-cream">Settings</h1>

      <AccountSettings
        defaultName={profile?.name ?? ""}
        defaultCity={profile?.city ?? ""}
        email={profile?.email ?? null}
        phone={profile?.phone ?? null}
        emailPref={prefs.email !== false}
        whatsappPref={prefs.whatsapp !== false}
      />

      {org ? (
        <OrganizerSettings
          handle={org.handle}
          defaultBio={org.bio ?? ""}
          defaultCity={org.city ?? ""}
          defaultPhoto={org.profile_photo ?? null}
          defaultSocials={
            (org.social_links ?? {}) as Record<string, string>
          }
        />
      ) : (
        <section className="mt-10 rounded-2xl border border-border bg-surface p-4 text-sm">
          <p className="text-cream">Want to host events?</p>
          <Link
            href="/organizer/new"
            className="mt-3 inline-block rounded-full bg-gold px-4 py-2 text-xs font-semibold text-ink transition-colors hover:bg-saffron"
          >
            Become an organiser
          </Link>
        </section>
      )}

      <section className="mt-10">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          About
        </h2>
        <div className="flex flex-wrap gap-4 text-sm">
          <Link href="/terms" className="text-muted hover:text-cream">
            Terms
          </Link>
          <Link href="/privacy" className="text-muted hover:text-cream">
            Privacy
          </Link>
          <a href="mailto:support@aikyam.app" className="text-muted hover:text-cream">
            Help
          </a>
        </div>
      </section>

      <DangerZone />
    </main>
  );
}
