import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { EventForm } from "./event-form";

export const metadata = { title: "Create an event" };

export default async function NewEventPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: org } = await supabase
    .from("organizer_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!org) redirect("/organizer/new");

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 sm:px-6 py-12">
      <h1 className="font-display text-3xl text-cream">Create an event</h1>
      <p className="mt-1 text-sm text-muted">
        Publish in a couple of minutes — or save a draft and finish later.
      </p>
      <EventForm />
    </main>
  );
}
