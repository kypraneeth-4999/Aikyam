import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, supabaseConfigured } from "@/lib/auth";
import { normalizeHandleInput } from "@/lib/handles";

type ProfileRow = {
  id: string;
  user_id: string;
  handle: string;
  bio: string | null;
  city: string | null;
  profile_photo: string | null;
  intro_video_url: string | null;
  social_links: Record<string, string> | null;
  verification_status: "unverified" | "verified";
  users: { name: string | null } | null;
};

const fetchProfile = cache(
  async (handleParam: string): Promise<ProfileRow | null> => {
    if (!supabaseConfigured()) return null;
    const handle = normalizeHandleInput(decodeURIComponent(handleParam));
    if (!handle) return null;
    const supabase = await createClient();
    const { data } = await supabase
      .from("organizer_profiles")
      .select(
        "id, user_id, handle, bio, city, profile_photo, intro_video_url, social_links, verification_status, users(name)",
      )
      .eq("handle_normalised", handle)
      .maybeSingle();
    return (data as ProfileRow | null) ?? null;
  },
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const profile = await fetchProfile(handle);
  if (!profile) return { title: "Profile not found" };

  const name = profile.users?.name ?? profile.handle;
  const title = `${name} · Aikyam`;
  const description =
    profile.bio ?? `${name} hosts cultural experiences on Aikyam.`;
  const images = profile.profile_photo ? [profile.profile_photo] : undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
      url: `/@${profile.handle}`,
      images,
    },
    twitter: { card: "summary", title, description, images },
  };
}

export default async function OrganizerProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const profile = await fetchProfile(handle);
  if (!profile) notFound();

  const user = await getCurrentUser();
  const isOwner = user?.id === profile.user_id;
  const name = profile.users?.name ?? profile.handle;
  const social = profile.social_links ?? {};

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-6 py-12">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xl font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          {name.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">{name}</h1>
            {profile.verification_status === "verified" && (
              <span title="Verified" className="text-sm text-blue-600">
                ✓
              </span>
            )}
          </div>
          <p className="text-sm text-zinc-500">
            @{profile.handle}
            {profile.city ? ` · ${profile.city}` : ""}
          </p>
        </div>
      </div>

      {profile.bio && (
        <p className="mt-5 text-sm leading-6 text-zinc-700 dark:text-zinc-300">
          {profile.bio}
        </p>
      )}

      {(social.instagram || social.youtube || social.website) && (
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          {social.instagram && (
            <a className="underline" href={social.instagram} target="_blank" rel="noopener noreferrer nofollow">
              Instagram
            </a>
          )}
          {social.youtube && (
            <a className="underline" href={social.youtube} target="_blank" rel="noopener noreferrer nofollow">
              YouTube
            </a>
          )}
          {social.website && (
            <a className="underline" href={social.website} target="_blank" rel="noopener noreferrer nofollow">
              Website
            </a>
          )}
        </div>
      )}

      {isOwner && (
        <div className="mt-6 rounded-lg border border-black/10 p-4 text-sm dark:border-white/15">
          <p className="font-medium">This is your public page.</p>
          <p className="mt-1 text-zinc-500">
            Put{" "}
            <span className="font-mono">aikyam.app/@{profile.handle}</span> in
            your Instagram bio. Event creation arrives in Slice 2.
          </p>
        </div>
      )}

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Upcoming events
        </h2>
        <p className="mt-2 text-sm text-zinc-500">No upcoming events yet.</p>
      </section>
    </main>
  );
}
