import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { slugifyHandle } from "@/lib/handles";
import { ClaimForm } from "./claim-form";

export const metadata = { title: "Become an organiser" };

export default async function NewOrganizerPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("users")
    .select("name, city")
    .eq("id", user.id)
    .single();

  if (!profile?.name) redirect("/onboarding");

  const { data: existing } = await supabase
    .from("organizer_profiles")
    .select("handle")
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing) redirect(`/@${existing.handle}`);

  const suggested = slugifyHandle(profile.name) || "organizer";

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16">
      <h1 className="font-display text-3xl text-cream">
        Create your organiser page
      </h1>
      <p className="mt-1 text-sm text-muted">
        Your public storefront — the link you put in your Instagram bio.
      </p>
      <ClaimForm suggested={suggested} defaultCity={profile.city ?? ""} />
    </main>
  );
}
