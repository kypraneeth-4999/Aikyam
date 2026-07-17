-- Slice 3: atomic booking creation + one-ticket-per-booking guard.

-- One ticket per booking (also stops duplicate tickets from concurrent webhooks).
create unique index if not exists tickets_booking_unique on public.tickets (booking_id);

-- Atomically create a pending booking without overbooking.
-- Locks the event row so concurrent bookings serialize on capacity. Counts paid
-- plus still-held pending seats. Idempotent on p_idempotency_key.
create or replace function public.create_booking(
  p_event_id uuid,
  p_user_id uuid,
  p_seats integer,
  p_guest_names jsonb,
  p_amount bigint,
  p_platform_fee bigint,
  p_idempotency_key text,
  p_hold_minutes integer default 15
) returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event   public.events;
  v_taken   integer;
  v_booking public.bookings;
begin
  -- Idempotency: return the existing booking if this key was already used.
  select * into v_booking from public.bookings where idempotency_key = p_idempotency_key;
  if found then
    return v_booking;
  end if;

  if p_seats < 1 then
    raise exception 'invalid_seats';
  end if;

  -- Serialize concurrent bookings for this event on the event row.
  select * into v_event from public.events where id = p_event_id for update;
  if not found then
    raise exception 'event_not_found';
  end if;
  if v_event.status <> 'published' then
    raise exception 'event_not_bookable';
  end if;

  select coalesce(sum(seats), 0) into v_taken
  from public.bookings
  where event_id = p_event_id
    and (
      payment_status = 'paid'
      or (payment_status = 'pending'
          and created_at > now() - make_interval(mins => p_hold_minutes))
    );

  if v_event.capacity is not null and v_taken + p_seats > v_event.capacity then
    raise exception 'sold_out';
  end if;

  insert into public.bookings (
    event_id, attendee_user_id, seats, guest_names,
    amount, platform_fee_amount, payment_status, idempotency_key
  ) values (
    p_event_id, p_user_id, p_seats, coalesce(p_guest_names, '[]'::jsonb),
    p_amount, p_platform_fee, 'pending', p_idempotency_key
  ) returning * into v_booking;

  return v_booking;
end;
$$;
