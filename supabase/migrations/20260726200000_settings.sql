-- Settings: notification preferences (JAD P12).
-- Applies to NON-essential messages only (reminders, review requests).
-- Essential transactional mail — ticket confirmation, cancellation/refund —
-- is always sent regardless.

alter table public.users
  add column if not exists notification_prefs jsonb not null
    default '{"email": true, "whatsapp": true}'::jsonb;
