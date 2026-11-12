-- ============================================================================
-- Teléfono de reserva de turnos de cada sede (se muestra en «Dónde atiendo»).
-- ============================================================================
alter table public.practice_locations
  add column if not exists booking_phone text check (booking_phone is null or booking_phone ~ '^[0-9 +()-]{6,25}$');

update public.practice_locations set booking_phone = '0981 064 927'
where id = '5ede0001-0000-4000-8000-000000000001' and booking_phone is null;
update public.practice_locations set booking_phone = '0986 232 235'
where id = '5ede0001-0000-4000-8000-000000000002' and booking_phone is null;
