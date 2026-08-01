import { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

export type CirclePrivacy = "open" | "approval" | "invite_only";
export type MemberRole = "host" | "cohost" | "member";
export type MemberStatus =
  | "invited"
  | "applied"
  | "active"
  | "declined"
  | "left";

export type Circle = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  interest: string | null;
  city: string | null;
  cover_media: string | null;
  privacy: CirclePrivacy;
  sponsors_required: number;
  max_members: number | null;
  guidelines: string | null;
  created_by: string;
  created_at: string;
};

export type CircleMember = {
  id: string;
  user_id: string;
  role: MemberRole;
  status: MemberStatus;
  sponsored_by: string | null;
  intro: string | null;
  joined_at: string | null;
  created_at: string;
  name: string;
};

/** Interests we seed the picker with — kept short and editable. */
export const INTERESTS = [
  "Founders",
  "AI & tech",
  "Women's circle",
  "Fitness",
  "Investing",
  "Pet owners",
  "Books & writing",
  "Music",
  "Food",
  "Parenting",
  "Art & craft",
  "Wellness",
] as const;

export const PRIVACY_LABELS: Record<CirclePrivacy, { label: string; hint: string }> = {
  open: { label: "Open", hint: "Anyone can join instantly" },
  approval: { label: "Apply to join", hint: "You review each application" },
  invite_only: {
    label: "Invite only",
    hint: "Only people invited or sponsored by a member can apply",
  },
};

export async function fetchCircleBySlug(
  admin: Admin,
  slug: string,
): Promise<Circle | null> {
  const { data } = await admin
    .from("circles")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  return (data as Circle | null) ?? null;
}

/** Members of a circle, with display names resolved. */
export async function fetchMembers(
  admin: Admin,
  circleId: string,
  statuses: MemberStatus[] = ["active"],
): Promise<CircleMember[]> {
  const { data } = await admin
    .from("circle_members")
    .select("id, user_id, role, status, sponsored_by, intro, joined_at, created_at")
    .eq("circle_id", circleId)
    .in("status", statuses)
    .order("created_at", { ascending: true });
  const rows = data ?? [];
  if (!rows.length) return [];

  const ids = [...new Set(rows.map((r) => r.user_id as string))];
  const { data: users } = await admin.from("users").select("id, name").in("id", ids);
  const nameById = new Map((users ?? []).map((u) => [u.id, u.name]));

  return rows.map((r) => ({
    ...(r as Omit<CircleMember, "name">),
    name: nameById.get(r.user_id as string) ?? "Member",
  }));
}

export async function membershipFor(
  admin: Admin,
  circleId: string,
  userId: string,
): Promise<{ role: MemberRole; status: MemberStatus } | null> {
  const { data } = await admin
    .from("circle_members")
    .select("role, status")
    .eq("circle_id", circleId)
    .eq("user_id", userId)
    .maybeSingle();
  return data ? { role: data.role, status: data.status } : null;
}

/** True when the user runs the circle (host or cohost, and active). */
export async function userLeadsCircle(
  admin: Admin,
  circleId: string,
  userId: string,
): Promise<boolean> {
  const m = await membershipFor(admin, circleId, userId);
  return !!m && m.status === "active" && (m.role === "host" || m.role === "cohost");
}

export type CircleReputation = {
  /** Gatherings the member actually checked in to — verified, not self-claimed. */
  gatheringsAttended: number;
  /** Gatherings they were booked for but didn't check in to. */
  noShows: number;
  attendanceRate: number | null;
  circlesJoined: number;
  circlesHosted: number;
  endorsementsReceived: number;
  memberSince: string | null;
};

/**
 * Reputation from on-platform behaviour only.
 *
 * Attendance is drawn from QR check-ins, so it can't be inflated — this is the
 * point of building Circle on top of a ticketing product that already proves
 * someone physically turned up.
 */
export async function fetchReputation(
  admin: Admin,
  userId: string,
): Promise<CircleReputation> {
  const [{ data: memberships }, { data: endorsements }, { data: user }] =
    await Promise.all([
      admin
        .from("circle_members")
        .select("circle_id, role, status, joined_at")
        .eq("user_id", userId),
      admin
        .from("circle_endorsements")
        .select("id")
        .eq("applicant_id", userId),
      admin.from("users").select("created_at").eq("id", userId).maybeSingle(),
    ]);

  const active = (memberships ?? []).filter((m) => m.status === "active");

  // Bookings this user made on events that belong to a circle.
  const { data: bookings } = await admin
    .from("bookings")
    .select("id, event_id")
    .eq("attendee_user_id", userId)
    .eq("payment_status", "paid");

  let gatheringsAttended = 0;
  let noShows = 0;

  if (bookings?.length) {
    const eventIds = [...new Set(bookings.map((b) => b.event_id as string))];
    const { data: circleEvents } = await admin
      .from("events")
      .select("id, starts_at")
      .in("id", eventIds)
      .not("circle_id", "is", null);
    const circleEventIds = new Set((circleEvents ?? []).map((e) => e.id as string));
    const past = new Set(
      (circleEvents ?? [])
        .filter((e) => e.starts_at && new Date(e.starts_at as string) < new Date())
        .map((e) => e.id as string),
    );

    const relevant = bookings.filter((b) => circleEventIds.has(b.event_id as string));
    if (relevant.length) {
      const { data: tickets } = await admin
        .from("tickets")
        .select("booking_id, status")
        .in(
          "booking_id",
          relevant.map((b) => b.id as string),
        );
      const statusByBooking = new Map(
        (tickets ?? []).map((t) => [t.booking_id as string, t.status as string]),
      );
      for (const b of relevant) {
        const checkedIn = statusByBooking.get(b.id as string) === "checked_in";
        if (checkedIn) gatheringsAttended++;
        else if (past.has(b.event_id as string)) noShows++;
      }
    }
  }

  const total = gatheringsAttended + noShows;
  return {
    gatheringsAttended,
    noShows,
    attendanceRate: total > 0 ? gatheringsAttended / total : null,
    circlesJoined: active.filter((m) => m.role === "member").length,
    circlesHosted: active.filter((m) => m.role === "host" || m.role === "cohost")
      .length,
    endorsementsReceived: (endorsements ?? []).length,
    memberSince: (user?.created_at as string) ?? null,
  };
}

/** A coarse, honest standing label derived from verified attendance. */
export function standingLabel(rep: CircleReputation): {
  label: string;
  tone: "new" | "good" | "great";
} {
  if (rep.gatheringsAttended >= 10 && (rep.attendanceRate ?? 1) >= 0.8)
    return { label: "Trusted regular", tone: "great" };
  if (rep.gatheringsAttended >= 3) return { label: "Active member", tone: "good" };
  return { label: "New here", tone: "new" };
}
