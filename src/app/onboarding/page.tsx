import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { OnboardingForm } from "./onboarding-form";

export const metadata = { title: "Welcome" };

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("users")
    .select("name, city")
    .eq("id", user.id)
    .single();

  // Already onboarded — skip straight in (JAD P1: returning user isn't asked again).
  if (profile?.name) redirect("/");

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Welcome to Aikyam</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Just your name to finish setting up.
      </p>
      <OnboardingForm defaultCity={profile?.city ?? ""} />
    </main>
  );
}
