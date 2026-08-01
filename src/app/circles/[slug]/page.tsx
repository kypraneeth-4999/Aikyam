import type { Metadata } from "next";
import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, supabaseConfigured } from "@/lib/auth";
import {
  PRIVACY_LABELS,
  fetchCircleBySlug,
  fetchMembers,
  fetchReputation,
  membershipFor,
  standingLabel,
  type Circle,
  type CircleMember,
} from "@/lib/circles";
import { formatEventShort } from "@/lib/datetime";
import { JoinPanel, MemberActions, EndorseButton } from "./circle-actions";

const load = cache(async (slug: string) => {
  if (!supabaseConfigured()) return null;
  const admin = createAdminClient();
  const circle = await fetchCircleBySlug(admin, slug);
  if (!circle) return null;

  const [members, applicants] = await Promise.all([
    fetchMembers(admin, circle.id, ["active"]),
    fetchMembers(admin, circle.id, ["applied"]),
  ]);

  // Upcoming gatherings are ordinary events tagged to this circle.
  const { data: gatherings } = await admin
    .from("events")
    .select("slug, title, starts_at, venue_name, city, status")
    .eq("circle_id", circle.id)
    .eq("status", "published")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true });

  // Endorsement tallies for the pending queue.
  const { data: endorsements } = await admin
    .from("circle_endorsements")
    .select("applicant_id")
    .eq("circle_id", circle.id);
  const endorsementCount = new Map<string, number>();
  for (const e of endorsements ?? []) {
    const k = e.applicant_id as string;
    endorsementCount.set(k, (endorsementCount.get(k) ?? 0) + 1);
  }

  return { circle, members, applicants, gatherings: gatherings ?? [], endorsementCount };
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await load(slug);
  if (!data) return { title: "Circle not found" };
  const { circle } = data;
  const description =
    circle.tagline ??
    circle.description ??
    `A small ${circle.interest ?? "community"} circle${circle.city ? ` in ${circle.city}` : ""}.`;
  return {
    title: circle.name,
    description,
    openGraph: {
      title: `${circle.name} · Aikyam Circles`,
      description,
      url: `/circles/${circle.slug}`,
      images: circle.cover_media ? [circle.cover_media] : undefined,
    },
  };
}

function MemberRow({
  m,
  slug,
  canManage,
  canEndorse,
  endorsements,
  required,
}: {
  m: CircleMember;
  slug: string;
  canManage: boolean;
  canEndorse: boolean;
  endorsements?: number;
  required?: number;
}) {
  return (
    <li className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-surface p-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-cream">
          {m.name}
          {m.role !== "member" && (
            <span className="ml-2 text-xs text-gold">{m.role}</span>
          )}
        </p>
        {m.intro && <p className="mt-1 text-xs text-muted">{m.intro}</p>}
        {typeof endorsements === "number" && (
          <p className="mt-1 text-xs text-muted">
            {endorsements} endorsement{endorsements === 1 ? "" : "s"}
            {required ? ` of ${required} needed` : ""}
          </p>
        )}
      </div>
      <div className="shrink-0">
        {canManage && (
          <MemberActions slug={slug} userId={m.user_id} status={m.status} />
        )}
        {!canManage && canEndorse && m.status === "applied" && (
          <EndorseButton slug={slug} applicantId={m.user_id} />
        )}
      </div>
    </li>
  );
}

export default async function CirclePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await load(slug);
  if (!data) notFound();
  const { circle, members, applicants, gatherings, endorsementCount } = data;

  const admin = createAdminClient();
  const user = await getCurrentUser();
  const mine = user ? await membershipFor(admin, circle.id, user.id) : null;
  const isMember = mine?.status === "active";
  const leads =
    isMember && (mine?.role === "host" || mine?.role === "cohost");
  const rep = user && isMember ? await fetchReputation(admin, user.id) : null;
  const standing = rep ? standingLabel(rep) : null;
  const full = !!circle.max_members && members.length >= circle.max_members;

  const host = members.find((m) => m.role === "host");

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <Link href="/circles" className="text-sm text-muted hover:text-cream">
        ← All circles
      </Link>

      <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="flex h-32 items-center justify-center bg-surface2 sm:h-40">
          {circle.cover_media ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={circle.cover_media} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="font-display text-3xl text-muted/40">
              {circle.interest ?? "Circle"}
            </span>
          )}
        </div>
        <div className="p-5">
          <h1 className="font-display text-2xl text-cream sm:text-3xl">{circle.name}</h1>
          {circle.tagline && <p className="mt-1 text-sm text-muted">{circle.tagline}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full border border-border px-2.5 py-1 text-muted">
              {PRIVACY_LABELS[circle.privacy].label}
            </span>
            {circle.interest && (
              <span className="rounded-full bg-gold/10 px-2.5 py-1 text-gold">
                {circle.interest}
              </span>
            )}
            {circle.city && <span className="text-muted">◎ {circle.city}</span>}
            <span className="text-muted">
              {members.length} member{members.length === 1 ? "" : "s"}
              {circle.max_members ? ` / ${circle.max_members}` : ""}
            </span>
          </div>
          {host && (
            <p className="mt-3 text-xs text-muted">Hosted by {host.name}</p>
          )}
        </div>
      </div>

      {circle.description && (
        <section className="mt-6">
          <h2 className="mb-2 font-display text-xl text-cream">About</h2>
          <p className="whitespace-pre-line text-sm leading-6 text-muted">
            {circle.description}
          </p>
        </section>
      )}

      {circle.guidelines && (
        <section className="mt-6 rounded-2xl border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold text-cream">How this circle works</h2>
          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted">
            {circle.guidelines}
          </p>
        </section>
      )}

      {/* Join / apply */}
      {user ? (
        <div className="mt-6">
          <JoinPanel
            slug={circle.slug}
            privacy={circle.privacy}
            status={mine?.status ?? null}
            full={full}
          />
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-border bg-surface p-4 text-sm">
          <p className="text-cream">Sign in to apply to this circle.</p>
          <Link
            href="/login"
            className="mt-3 inline-block rounded-full bg-gold px-4 py-2 text-xs font-semibold text-onaccent"
          >
            Sign in
          </Link>
        </div>
      )}

      {/* Your standing — verified attendance, not self-reported */}
      {isMember && rep && standing && (
        <section className="mt-6 rounded-2xl border border-border bg-surface p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-cream">Your standing</h2>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                standing.tone === "great"
                  ? "bg-gold/15 text-gold"
                  : standing.tone === "good"
                    ? "bg-emerald-500/15 text-emerald-400"
                    : "border border-border text-muted"
              }`}
            >
              {standing.label}
            </span>
          </div>
          <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl border border-border bg-surface2 p-2">
              <dd className="font-display text-lg text-gold">
                {rep.gatheringsAttended}
              </dd>
              <dt className="text-xs text-muted">attended</dt>
            </div>
            <div className="rounded-xl border border-border bg-surface2 p-2">
              <dd className="font-display text-lg text-gold">
                {rep.attendanceRate === null
                  ? "—"
                  : `${Math.round(rep.attendanceRate * 100)}%`}
              </dd>
              <dt className="text-xs text-muted">turn-up rate</dt>
            </div>
            <div className="rounded-xl border border-border bg-surface2 p-2">
              <dd className="font-display text-lg text-gold">{rep.circlesJoined}</dd>
              <dt className="text-xs text-muted">circles</dt>
            </div>
          </dl>
          <p className="mt-2 text-xs text-muted">
            Counted from QR check-ins at gatherings — it can&apos;t be self-declared.
          </p>
        </section>
      )}

      {/* Gatherings */}
      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl text-cream">Upcoming gatherings</h2>
          {leads && (
            <Link
              href="/organizer/events/new"
              className="text-xs font-medium text-gold hover:text-saffron"
            >
              + Add gathering
            </Link>
          )}
        </div>
        {gatherings.length === 0 ? (
          <p className="text-sm text-muted">
            Nothing scheduled yet.
            {leads ? " Create one to give members a reason to meet." : ""}
          </p>
        ) : (
          <ul className="space-y-2">
            {gatherings.map((g) => (
              <li key={g.slug as string}>
                <Link
                  href={`/e/${g.slug}`}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-gold/30"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-cream">
                      {g.title as string}
                    </p>
                    <p className="text-xs text-muted">
                      {formatEventShort(g.starts_at as string)}
                      {g.venue_name ? ` · ${g.venue_name as string}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-gold">View →</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Pending applications — hosts decide, members can vouch */}
      {(leads || isMember) && applicants.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 font-display text-xl text-cream">
            Applications ({applicants.length})
          </h2>
          <ul className="space-y-2">
            {applicants.map((m) => (
              <MemberRow
                key={m.id}
                m={m}
                slug={circle.slug}
                canManage={!!leads}
                canEndorse={isMember}
                endorsements={endorsementCount.get(m.user_id) ?? 0}
                required={circle.sponsors_required}
              />
            ))}
          </ul>
        </section>
      )}

      {/* Members — visible to members; outsiders just see the count */}
      <section className="mt-8">
        <h2 className="mb-3 font-display text-xl text-cream">Members</h2>
        {isMember ? (
          <ul className="space-y-2">
            {members.map((m) => (
              <MemberRow key={m.id} m={m} slug={circle.slug} canManage={!!leads && m.role === "member"} canEndorse={false} />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">
            {members.length} member{members.length === 1 ? "" : "s"}. The list is
            visible once you join — circles keep their membership private.
          </p>
        )}
      </section>
    </main>
  );
}
