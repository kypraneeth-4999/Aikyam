-- Circle — trust-first, invitation-led micro-communities.
--
-- The distinction from events: an event optimises for attendance, a circle
-- optimises for belonging. Membership is vetted (sponsor endorsement + host
-- approval), recurring gatherings are ordinary events tagged to the circle, and
-- reputation accrues from *verified attendance* — we already prove that with
-- QR check-in, so reputation can't be self-declared.

create type circle_privacy as enum (
  'open',        -- anyone may join instantly
  'approval',    -- apply, host approves
  'invite_only'  -- must be invited or sponsored by a member
);

create type circle_member_role as enum ('host', 'cohost', 'member');

create type circle_member_status as enum (
  'invited',   -- host/member invited them; awaiting their acceptance
  'applied',   -- they applied; awaiting host decision
  'active',    -- full member
  'declined',
  'left'
);

create table public.circles (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  name         text not null,
  tagline      text,
  description  text,
  interest     text,                -- e.g. "Founders", "Fitness", "Investing"
  city         text,
  cover_media  text,
  privacy      circle_privacy not null default 'approval',
  /** How many endorsements an applicant needs before the host can approve. */
  sponsors_required smallint not null default 0,
  max_members  integer,
  guidelines   text,                -- the circle's norms; shown before applying
  created_by   uuid not null references public.users(id) on delete restrict,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint circles_max_members_positive
    check (max_members is null or max_members > 0),
  constraint circles_sponsors_sane
    check (sponsors_required between 0 and 5)
);

create trigger circles_set_updated_at before update on public.circles
  for each row execute function set_updated_at();

create index circles_city_idx on public.circles (city);
create index circles_interest_idx on public.circles (interest);

create table public.circle_members (
  id            uuid primary key default gen_random_uuid(),
  circle_id     uuid not null references public.circles(id) on delete cascade,
  user_id       uuid not null references public.users(id) on delete cascade,
  role          circle_member_role not null default 'member',
  status        circle_member_status not null default 'applied',
  /** Who vouched for them — the edge that makes this a trust graph. */
  sponsored_by  uuid references public.users(id) on delete set null,
  intro         text,               -- why they want to join
  decided_by    uuid references public.users(id) on delete set null,
  decided_at    timestamptz,
  joined_at     timestamptz,
  created_at    timestamptz not null default now(),
  constraint circle_members_unique unique (circle_id, user_id)
);

create index circle_members_circle_idx on public.circle_members (circle_id, status);
create index circle_members_user_idx on public.circle_members (user_id, status);

-- Endorsements from existing members, backing a specific application.
create table public.circle_endorsements (
  id          uuid primary key default gen_random_uuid(),
  circle_id   uuid not null references public.circles(id) on delete cascade,
  applicant_id uuid not null references public.users(id) on delete cascade,
  endorser_id uuid not null references public.users(id) on delete cascade,
  note        text,
  created_at  timestamptz not null default now(),
  constraint circle_endorsements_unique unique (circle_id, applicant_id, endorser_id),
  constraint circle_endorsements_not_self check (applicant_id <> endorser_id)
);

create index circle_endorsements_applicant_idx
  on public.circle_endorsements (circle_id, applicant_id);

-- A gathering is an ordinary event that belongs to a circle.
alter table public.events
  add column if not exists circle_id uuid references public.circles(id) on delete set null;

create index if not exists events_circle_idx on public.events (circle_id);

-- ===========================================================================
-- Row-Level Security — reads are public for discovery; every write goes
-- through server routes using the service role (approval logic must not be
-- client-enforceable).
-- ===========================================================================
alter table public.circles enable row level security;
alter table public.circle_members enable row level security;
alter table public.circle_endorsements enable row level security;

create policy circles_public_read on public.circles
  for select using (true);

create policy circle_members_read on public.circle_members
  for select using (true);
