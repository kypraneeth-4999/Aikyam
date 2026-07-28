-- Location detail + venue trust model.
--
-- venue_type drives a two-sided trust decision:
--   public  — a café, studio, hall. Full address shown to everyone.
--   private — someone's home or private studio. The exact address is withheld
--             from the public page and revealed only to confirmed attendees,
--             which protects the host; attendees in turn get the host's
--             verification status and track record before they book.

create type venue_type as enum ('public', 'private');

alter table public.events
  add column if not exists city text,
  add column if not exists address text,
  add column if not exists venue_type venue_type not null default 'public';

-- Discovery filters by city.
create index if not exists events_city_idx on public.events (city);
