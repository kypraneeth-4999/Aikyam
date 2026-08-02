-- ===========================================================================
-- Suppliers — a trade directory for organisers (2 Aug 2026)
--
-- Suppliers list the things an organiser needs to put on an event: venues,
-- cafés, costumes for theatre, props, equipment, catering.
--
-- THE DEFINING RULE: supplier data is *not* public. Attendees must never see
-- it — not the listings, not the trade pricing, not the contact details. Only
-- an organiser (someone with an organizer_profile) or the supplier who owns
-- the row may read it.
--
-- That rule lives HERE, in RLS, not in the UI. Every other table in this app
-- is `for select using (true)`; these three are the first that are not, so the
-- policies below are the actual security boundary. Hiding a nav link is not
-- authorisation (CLAUDE.md).
--
-- v1 is a directory, not a marketplace: no payments, no payouts, no
-- commission. An organiser browses, shortlists onto an event, and contacts the
-- supplier directly. Taking money for supplier bookings would need Razorpay
-- Route (not yet set up) and is a later slice.
-- ===========================================================================

-- A user may be an organiser and a supplier at once, so supplier-ness is
-- decided by owning a supplier_profiles row — exactly how organiser-ness is
-- decided by organizer_profiles. The user_role enum is deliberately left
-- alone: adding a value to an enum has its own transaction restrictions, and
-- nothing here needs it.

create type supplier_category as enum (
  'venue',        -- halls, studios, terraces, amphitheatres
  'cafe',         -- cafés and restaurants that host
  'costume',      -- dresses / costumes on rent, incl. theatre
  'prop',         -- set pieces, furniture, décor
  'equipment',    -- sound, lighting, projection, seating
  'catering',
  'other'
);

create type supplier_status as enum ('pending', 'approved', 'suspended');

create type supplier_price_unit as enum ('per_hour', 'per_day', 'per_event');

-- ---------------------------------------------------------------------------
-- SupplierProfile — the business behind the listings
-- ---------------------------------------------------------------------------
create table public.supplier_profiles (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users(id) on delete cascade,
  business_name text not null,
  contact_name  text,
  phone         text,
  email         citext,
  city          text not null,
  about         text,
  logo          text,
  -- New suppliers are 'pending'. Only 'approved' ones surface to organisers,
  -- so an open signup can't put unvetted businesses in front of them.
  status        supplier_status not null default 'pending',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint supplier_profiles_user_unique unique (user_id),
  constraint supplier_business_name_length check (char_length(business_name) between 2 and 120)
);
create trigger supplier_profiles_set_updated_at before update on public.supplier_profiles
  for each row execute function set_updated_at();
create index supplier_profiles_city_idx on public.supplier_profiles (city);
create index supplier_profiles_status_idx on public.supplier_profiles (status);

-- ---------------------------------------------------------------------------
-- SupplierListing — one thing on offer
-- ---------------------------------------------------------------------------
create table public.supplier_listings (
  id            uuid primary key default gen_random_uuid(),
  supplier_id   uuid not null references public.supplier_profiles(id) on delete cascade,
  -- Denormalised owner. RLS on this table must not sub-query
  -- supplier_profiles, which is itself RLS-protected; carrying the owner here
  -- keeps the read policy a single non-recursive comparison.
  owner_id      uuid not null references public.users(id) on delete cascade,
  title         text not null,
  category      supplier_category not null,
  description   text,
  city          text not null,
  area          text,
  -- Integer paise, like every other money column in this app. Never floats.
  -- NULL means "price on request" rather than free — free is 0.
  price_paise   bigint,
  price_unit    supplier_price_unit,
  capacity      integer,                              -- venues/cafés
  photos        text[] not null default '{}',
  contact_phone text,
  contact_email citext,
  maps_url      text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint supplier_listing_title_length check (char_length(title) between 3 and 140),
  constraint supplier_listing_price_non_negative check (price_paise is null or price_paise >= 0),
  constraint supplier_listing_capacity_positive check (capacity is null or capacity > 0),
  -- A price without a unit is meaningless to an organiser comparing options.
  constraint supplier_listing_price_needs_unit check (price_paise is null or price_unit is not null)
);
create trigger supplier_listings_set_updated_at before update on public.supplier_listings
  for each row execute function set_updated_at();
create index supplier_listings_supplier_idx on public.supplier_listings (supplier_id);
create index supplier_listings_owner_idx on public.supplier_listings (owner_id);
create index supplier_listings_browse_idx
  on public.supplier_listings (city, category) where (is_active);

-- ---------------------------------------------------------------------------
-- EventSupplier — an organiser's shortlist for one event
-- ---------------------------------------------------------------------------
create table public.event_suppliers (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events(id) on delete cascade,
  listing_id uuid not null references public.supplier_listings(id) on delete cascade,
  note       text,
  created_at timestamptz not null default now(),
  constraint event_suppliers_unique unique (event_id, listing_id)
);
create index event_suppliers_event_idx on public.event_suppliers (event_id);
create index event_suppliers_listing_idx on public.event_suppliers (listing_id);

-- ---------------------------------------------------------------------------
-- Helpers (security definer: they must see rows the caller cannot)
-- ---------------------------------------------------------------------------

-- True when the caller has an organiser profile. Returns false for anon,
-- because auth.uid() is null there — which is what keeps attendees out.
create or replace function public.is_organizer()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.organizer_profiles op where op.user_id = auth.uid()
  );
$$;

-- True when the caller is one of the organisers of this event.
create or replace function public.organizes_event(p_event_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.event_organizers eo
    join public.organizer_profiles op on op.id = eo.organizer_id
    where eo.event_id = p_event_id and op.user_id = auth.uid()
  );
$$;

-- The next two exist purely so the policies below never sub-query an
-- RLS-protected table from inside another table's policy. Nesting RLS that way
-- does happen to work here, but it makes each policy's result depend on the
-- other policy staying exactly as it is — a trap for whoever edits next.
create or replace function public.supplier_is_approved(p_supplier_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.supplier_profiles sp
    where sp.id = p_supplier_id and sp.status = 'approved'
  );
$$;

create or replace function public.owns_listing(p_listing_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.supplier_listings sl
    where sl.id = p_listing_id and sl.owner_id = auth.uid()
  );
$$;

-- ===========================================================================
-- Row-Level Security
--
-- Read access is deliberately NOT public here. Anonymous visitors and signed-in
-- attendees match no policy and therefore see zero rows.
-- ===========================================================================
alter table public.supplier_profiles enable row level security;
alter table public.supplier_listings enable row level security;
alter table public.event_suppliers  enable row level security;

-- Organisers see approved suppliers; a supplier always sees itself.
create policy supplier_profiles_read on public.supplier_profiles
  for select using (
    user_id = auth.uid()
    or (status = 'approved' and public.is_organizer())
  );

create policy supplier_profiles_insert on public.supplier_profiles
  for insert with check (user_id = auth.uid());

-- A supplier may edit its own row — but NOT its own `status`. Postgres has no
-- per-column RLS, so without the trigger below this policy would let any
-- supplier set status='approved' on themselves and walk straight past vetting.
create policy supplier_profiles_update on public.supplier_profiles
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Approval is an admin act. Anything other than the service role that tries to
-- change `status` has the change quietly reverted rather than rejected, so a
-- supplier editing their profile with a full-row payload still succeeds — it
-- just cannot promote itself.
create or replace function public.supplier_status_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status
     and coalesce(auth.role(), '') <> 'service_role' then
    new.status := old.status;
  end if;
  return new;
end;
$$;

create trigger supplier_profiles_guard_status
  before update on public.supplier_profiles
  for each row execute function public.supplier_status_guard();

-- Listings: organisers see active listings from approved suppliers only.
create policy supplier_listings_read on public.supplier_listings
  for select using (
    owner_id = auth.uid()
    or (
      is_active
      and public.is_organizer()
      and public.supplier_is_approved(supplier_id)
    )
  );

create policy supplier_listings_insert on public.supplier_listings
  for insert with check (owner_id = auth.uid());

create policy supplier_listings_update on public.supplier_listings
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy supplier_listings_delete on public.supplier_listings
  for delete using (owner_id = auth.uid());

-- A shortlist is private to the event's organisers, plus the supplier who was
-- shortlisted (so they can see who is interested).
create policy event_suppliers_read on public.event_suppliers
  for select using (
    public.organizes_event(event_id)
    or public.owns_listing(listing_id)
  );

create policy event_suppliers_write on public.event_suppliers
  for insert with check (public.organizes_event(event_id));

create policy event_suppliers_delete on public.event_suppliers
  for delete using (public.organizes_event(event_id));
