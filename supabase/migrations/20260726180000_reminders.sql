-- Reminder / notification send log (JAD F3: 24h + 3h reminders).
-- The unique (booking_id, kind) constraint makes sending idempotent: the cron
-- can run as often as it likes and an attendee is never messaged twice.

create table if not exists public.notification_log (
  id         uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  kind       text not null,          -- 'reminder_24h' | 'reminder_3h'
  channel    text not null default 'email',
  sent_at    timestamptz not null default now(),
  constraint notification_log_unique unique (booking_id, kind, channel)
);

create index if not exists notification_log_booking_idx
  on public.notification_log (booking_id);

-- Server-only (service role bypasses RLS; no policies = denied to clients).
alter table public.notification_log enable row level security;
