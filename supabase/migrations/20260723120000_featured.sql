-- Admin-only "featured" flag for events.
-- Drives the homepage hero + a card badge. NOT exposed in the organiser create
-- form or API — set only via internal tooling (scripts/set-featured.mjs) with
-- the service-role key, so organisers can't feature themselves.
alter table public.events
  add column if not exists is_featured boolean not null default false;

create index if not exists events_featured_idx
  on public.events (is_featured)
  where is_featured;
