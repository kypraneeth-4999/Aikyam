-- Aikyam — Slice 0 initial schema
-- Spec: docs/JAD.md §6.2 (data model) + §6.5 (security).
--
-- Conventions:
--   * All ids are uuid (gen_random_uuid()).
--   * Money is stored as INTEGER PAISE (₹1 = 100). This matches Razorpay's
--     minor-unit amounts and avoids floating-point drift. Never store rupees as float.
--   * public.users mirrors auth.users (Supabase Auth owns phone-OTP + Google).
--   * Event<->Organizer is many-to-many from day one (co-host UI is Phase 2).
--   * RLS is ON for every table. Privileged / money-moving writes go through
--     server routes using the service-role key (which bypasses RLS). The policies
--     here cover public reads and owner self-service; refine per slice.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";      -- gen_random_uuid()
create extension if not exists "citext";        -- case-insensitive handles/emails

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type user_role              as enum ('attendee', 'organizer');
create type verification_status    as enum ('unverified', 'verified');
create type event_status           as enum ('draft', 'published', 'cancelled', 'completed');
create type event_organizer_role   as enum ('primary', 'cohost');
create type materials_type         as enum ('included', 'byo');
create type payment_status         as enum ('pending', 'paid', 'failed', 'refunded', 'cancelled');
create type ticket_status          as enum ('valid', 'checked_in', 'cancelled');
create type reserved_handle_reason as enum ('system', 'offensive', 'premium', 'redirect_grace');
create type report_reason          as enum ('spam', 'inappropriate', 'scam', 'safety', 'other');

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- User  (profile mirror of auth.users)
-- ---------------------------------------------------------------------------
create table public.users (
  id           uuid primary key references auth.users(id) on delete cascade,
  phone        text,
  email        citext,
  name         text,
  city         text,
  google_id    text,
  default_role user_role not null default 'attendee',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger users_set_updated_at before update on public.users
  for each row execute function set_updated_at();

-- Auto-create a public.users row when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, phone, email, name)
  values (
    new.id,
    new.phone,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- OrganizerProfile
-- ---------------------------------------------------------------------------
create table public.organizer_profiles (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.users(id) on delete cascade,
  handle              text not null,                       -- display form (as chosen)
  handle_normalised   citext not null unique,              -- case-insensitive uniqueness
  handle_history      jsonb not null default '[]'::jsonb,  -- [{old_handle, released_at}]
  bio                 text,
  city                text,
  profile_photo       text,
  intro_video_url     text,
  social_links        jsonb not null default '{}'::jsonb,  -- {instagram, youtube, website}
  verification_status verification_status not null default 'unverified',
  metrics_cache       jsonb not null default '{}'::jsonb,  -- computed from on-platform bookings only
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint organizer_profiles_user_unique unique (user_id),
  constraint handle_format check (handle_normalised ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint handle_length check (char_length(handle_normalised) between 3 and 30)
);
create trigger organizer_profiles_set_updated_at before update on public.organizer_profiles
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- ReservedHandle  (blocklist + post-change grace hold — JAD P2)
-- ---------------------------------------------------------------------------
create table public.reserved_handles (
  handle        citext primary key,
  reason        reserved_handle_reason not null,
  reserved_until timestamptz,                              -- null = permanent (system/offensive/premium)
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Event
-- ---------------------------------------------------------------------------
create table public.events (
  id                   uuid primary key default gen_random_uuid(),
  slug                 text unique,                        -- assigned at publish
  title                text not null,
  category             text not null,
  description          text,
  starts_at            timestamptz,
  ends_at              timestamptz,
  venue_name           text,
  maps_url             text,
  landmark             text,
  capacity             integer,
  price                bigint not null default 0,          -- paise
  is_free              boolean not null default true,
  currency             text not null default 'INR',
  cover_media          text,
  photos               text[] not null default '{}',
  what_to_bring        text,
  materials            materials_type not null default 'included',
  materials_addon_price bigint,                            -- paise, nullable
  cancellation_policy  text,
  languages            text[] not null default '{}',
  age_suitability      text,
  tags                 text[] not null default '{}',
  status               event_status not null default 'draft',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint capacity_positive check (capacity is null or capacity > 0),
  constraint price_non_negative check (price >= 0),
  constraint addon_non_negative check (materials_addon_price is null or materials_addon_price >= 0),
  constraint ends_after_starts check (ends_at is null or starts_at is null or ends_at >= starts_at)
);
create trigger events_set_updated_at before update on public.events
  for each row execute function set_updated_at();

create index events_status_starts_at_idx on public.events (status, starts_at);
create index events_category_idx on public.events (category);

-- ---------------------------------------------------------------------------
-- EventOrganizer  (join, m2m) — co-host unused in v1 UI
-- ---------------------------------------------------------------------------
create table public.event_organizers (
  event_id     uuid not null references public.events(id) on delete cascade,
  organizer_id uuid not null references public.organizer_profiles(id) on delete cascade,
  role         event_organizer_role not null default 'primary',
  created_at   timestamptz not null default now(),
  primary key (event_id, organizer_id)
);
create index event_organizers_organizer_idx on public.event_organizers (organizer_id);
-- Exactly one primary organizer per event.
create unique index event_organizers_one_primary
  on public.event_organizers (event_id) where (role = 'primary');

-- ---------------------------------------------------------------------------
-- Booking
-- ---------------------------------------------------------------------------
create table public.bookings (
  id                  uuid primary key default gen_random_uuid(),
  event_id            uuid not null references public.events(id) on delete restrict,
  attendee_user_id    uuid not null references public.users(id) on delete restrict,
  seats               integer not null,
  guest_names         jsonb not null default '[]'::jsonb,
  amount              bigint not null default 0,           -- paise, order total
  platform_fee_amount bigint not null default 0,           -- paise, 5% organizer-absorbed
  payment_status      payment_status not null default 'pending',
  razorpay_order_id   text,
  razorpay_payment_id text,
  idempotency_key     text not null unique,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint seats_positive check (seats > 0),
  constraint amount_non_negative check (amount >= 0),
  constraint fee_non_negative check (platform_fee_amount >= 0)
);
create trigger bookings_set_updated_at before update on public.bookings
  for each row execute function set_updated_at();

create index bookings_event_idx on public.bookings (event_id);
create index bookings_attendee_idx on public.bookings (attendee_user_id);
create index bookings_razorpay_order_idx on public.bookings (razorpay_order_id);

-- ---------------------------------------------------------------------------
-- Ticket
-- ---------------------------------------------------------------------------
create table public.tickets (
  id           uuid primary key default gen_random_uuid(),
  booking_id   uuid not null references public.bookings(id) on delete cascade,
  qr_token     text not null unique,                       -- signed JWT, verified server-side
  status       ticket_status not null default 'valid',
  checked_in_at timestamptz,
  created_at   timestamptz not null default now()
);
create index tickets_booking_idx on public.tickets (booking_id);

-- ---------------------------------------------------------------------------
-- Review  (insert gated on checked-in — enforced in server route)
-- ---------------------------------------------------------------------------
create table public.reviews (
  id                 uuid primary key default gen_random_uuid(),
  event_id           uuid not null references public.events(id) on delete cascade,
  booking_id         uuid not null references public.bookings(id) on delete cascade,
  attendee_user_id   uuid not null references public.users(id) on delete cascade,
  rating             smallint not null,
  comment            text,
  organizer_response text,
  created_at         timestamptz not null default now(),
  constraint rating_range check (rating between 1 and 5),
  constraint reviews_one_per_booking unique (booking_id)
);
create index reviews_event_idx on public.reviews (event_id);

-- ---------------------------------------------------------------------------
-- AuditLog  (append-only: refunds, payouts, cancellations, deletions)
-- ---------------------------------------------------------------------------
create table public.audit_logs (
  id            uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.users(id) on delete set null,
  action        text not null,
  entity_type   text not null,
  entity_id     uuid,
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- Report
-- ---------------------------------------------------------------------------
create table public.reports (
  id                uuid primary key default gen_random_uuid(),
  event_id          uuid not null references public.events(id) on delete cascade,
  reporter_user_id  uuid references public.users(id) on delete set null,
  reason            report_reason not null,
  note              text,
  created_at        timestamptz not null default now()
);
create index reports_event_idx on public.reports (event_id);

-- ===========================================================================
-- Row-Level Security
-- ===========================================================================
alter table public.users              enable row level security;
alter table public.organizer_profiles enable row level security;
alter table public.reserved_handles   enable row level security;
alter table public.events             enable row level security;
alter table public.event_organizers   enable row level security;
alter table public.bookings           enable row level security;
alter table public.tickets            enable row level security;
alter table public.reviews            enable row level security;
alter table public.audit_logs         enable row level security;
alter table public.reports            enable row level security;

-- users: a person can see and edit only their own row.
create policy users_select_self on public.users
  for select using (auth.uid() = id);
create policy users_update_self on public.users
  for update using (auth.uid() = id);

-- organizer_profiles: public storefront (readable by anyone); owner can write.
create policy organizer_profiles_public_read on public.organizer_profiles
  for select using (true);
create policy organizer_profiles_owner_insert on public.organizer_profiles
  for insert with check (auth.uid() = user_id);
create policy organizer_profiles_owner_update on public.organizer_profiles
  for update using (auth.uid() = user_id);

-- events: published/cancelled/completed are public; drafts + all writes are owner-only.
create policy events_public_read on public.events
  for select using (
    status in ('published', 'cancelled', 'completed')
    or exists (
      select 1 from public.event_organizers eo
      join public.organizer_profiles op on op.id = eo.organizer_id
      where eo.event_id = events.id and op.user_id = auth.uid()
    )
  );
create policy events_owner_write on public.events
  for all using (
    exists (
      select 1 from public.event_organizers eo
      join public.organizer_profiles op on op.id = eo.organizer_id
      where eo.event_id = events.id and op.user_id = auth.uid()
    )
  );

-- event_organizers: readable by anyone (public host cards); writes via server.
create policy event_organizers_public_read on public.event_organizers
  for select using (true);

-- bookings: an attendee sees their own; organizer sees bookings for their events.
-- Inserts/updates (payment truth) happen server-side with the service role.
create policy bookings_attendee_read on public.bookings
  for select using (
    auth.uid() = attendee_user_id
    or exists (
      select 1 from public.event_organizers eo
      join public.organizer_profiles op on op.id = eo.organizer_id
      where eo.event_id = bookings.event_id and op.user_id = auth.uid()
    )
  );

-- tickets: visible to the booking's attendee or the event's organizer.
create policy tickets_read on public.tickets
  for select using (
    exists (
      select 1 from public.bookings b
      where b.id = tickets.booking_id
        and (
          b.attendee_user_id = auth.uid()
          or exists (
            select 1 from public.event_organizers eo
            join public.organizer_profiles op on op.id = eo.organizer_id
            where eo.event_id = b.event_id and op.user_id = auth.uid()
          )
        )
    )
  );

-- reviews: public read; write gated server-side on verified check-in.
create policy reviews_public_read on public.reviews
  for select using (true);

-- reserved_handles / audit_logs / reports: no client access (server-only via service role).
-- (RLS enabled with no permissive policy => denied for anon/authenticated.)

-- ===========================================================================
-- Seed: system reserved handles (config-driven blocklist grows without deploy)
-- ===========================================================================
insert into public.reserved_handles (handle, reason) values
  ('admin','system'), ('api','system'), ('aikyam','system'), ('support','system'),
  ('help','system'), ('about','system'), ('login','system'), ('signup','system'),
  ('settings','system'), ('terms','system'), ('privacy','system'), ('www','system'),
  ('e','system'), ('o','system'), ('me','system'), ('app','system'),
  ('dashboard','system'), ('events','system'), ('event','system'), ('organizer','system'),
  ('auth','system'), ('checkout','system'), ('tickets','system'), ('billing','system')
on conflict (handle) do nothing;
