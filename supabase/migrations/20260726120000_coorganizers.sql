-- Co-organiser support. The event_organizers join (role primary|cohost) shipped
-- in Slice 0; this adds an approval status + off-app collaborator names.

create type event_organizer_status as enum ('pending', 'accepted', 'declined');

-- Existing rows (all primary creators) default to 'accepted'.
alter table public.event_organizers
  add column if not exists status event_organizer_status not null default 'accepted';

-- Off-app collaborators: array of { name }. Unverified — display-only.
alter table public.events
  add column if not exists collaborators jsonb not null default '[]'::jsonb;

-- Fast lookup of a user's pending invites.
create index if not exists event_organizers_pending_idx
  on public.event_organizers (organizer_id)
  where status = 'pending';
