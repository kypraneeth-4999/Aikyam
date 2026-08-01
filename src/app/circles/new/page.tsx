import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { CircleForm } from "./circle-form";

export const metadata = { title: "Start a circle" };

export default async function NewCirclePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl text-cream">Start a circle</h1>
      <p className="mt-2 text-sm leading-6 text-muted">
        A circle is a small group that meets in person, repeatedly. You decide who
        gets in — and members build standing by actually showing up.
      </p>
      <CircleForm />
    </main>
  );
}
