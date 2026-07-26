import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "./settings-form";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("users")
    .select("name, city")
    .eq("id", user.id)
    .single();

  return (
    <main className="mx-auto w-full max-w-sm flex-1 px-6 py-12">
      <h1 className="font-display text-3xl text-cream">Settings</h1>
      <SettingsForm
        defaultName={profile?.name ?? ""}
        defaultCity={profile?.city ?? ""}
      />
    </main>
  );
}
