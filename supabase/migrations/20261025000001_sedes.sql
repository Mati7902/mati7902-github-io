-- ============================================================================
-- Sedes de atención presencial y franjas cada 15 días
-- ----------------------------------------------------------------------------
-- 1. practice_locations: lugares donde se atiende en persona (nombre, dirección,
--    enlace al mapa y foto). La portada muestra las activas.
-- 2. availability_rules gana tres columnas:
--      location_id → en qué sede es la franja (el turno guarda esa dirección);
--      every_weeks → 1 = todas las semanas, 2 = cada 15 días, etc.;
--      anchor_date → una fecha en la que la franja SÍ ocurre (cuenta desde ahí).
-- 3. is_bookable_slot respeta la frecuencia (espejo de src/lib/scheduling/slots.ts).
-- 4. Carga inicial: Sanatorio La Trinidad y Sanatorio Adventista de Hohenau,
--    martes alternados. Las fechas de inicio se cambian desde Configuración.
-- ============================================================================

-- 1. Sedes --------------------------------------------------------------------
create table if not exists public.practice_locations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 2 and 120),
  address     text not null check (char_length(address) between 2 and 200),
  city        text check (city is null or char_length(city) <= 120),
  maps_url    text check (maps_url is null or (char_length(maps_url) <= 500 and maps_url ~ '^https://')),
  photo_url   text check (photo_url is null or (char_length(photo_url) <= 500 and photo_url ~ '^https://')),
  notes       text check (notes is null or char_length(notes) <= 300),
  sort_order  int not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists practice_locations_set_updated_at on public.practice_locations;
create trigger practice_locations_set_updated_at before update on public.practice_locations
  for each row execute function public.set_updated_at();

alter table public.practice_locations enable row level security;
drop policy if exists "locations: lectura pública de activas" on public.practice_locations;
create policy "locations: lectura pública de activas" on public.practice_locations for select to anon, authenticated
  using (is_active or public.is_admin());
drop policy if exists "locations: admin gestiona" on public.practice_locations;
create policy "locations: admin gestiona" on public.practice_locations for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

comment on table public.practice_locations is 'Sedes de atención presencial. Las activas se muestran en la portada.';

-- 2. Franjas por sede y cada N semanas ----------------------------------------
alter table public.availability_rules
  add column if not exists location_id uuid references public.practice_locations (id) on delete set null,
  add column if not exists every_weeks smallint not null default 1,
  add column if not exists anchor_date date;

alter table public.availability_rules drop constraint if exists availability_rules_every_weeks_check;
alter table public.availability_rules add constraint availability_rules_every_weeks_check
  check (every_weeks between 1 and 4 and (every_weeks = 1 or anchor_date is not null));

comment on column public.availability_rules.every_weeks is '1 = todas las semanas, 2 = cada 15 días (semana sí, semana no), hasta 4.';
comment on column public.availability_rules.anchor_date is 'Una fecha en la que la franja ocurre; la alternancia se cuenta desde esa semana.';

-- ¿La franja ocurre en esa fecha? (semana a semana desde anchor_date)
create or replace function public.rule_occurs_on(p_every_weeks smallint, p_anchor date, p_day date)
returns boolean
language sql immutable as $$
  select coalesce(p_every_weeks, 1) <= 1
      or p_anchor is null
      or (((floor((p_day - p_anchor) / 7.0)::int % p_every_weeks) + p_every_weeks) % p_every_weeks) = 0;
$$;

-- 3. Validación de la grilla con la frecuencia --------------------------------
create or replace function public.is_bookable_slot(
  p_start    timestamptz,
  p_end      timestamptz,
  p_modality public.appointment_modality
)
returns boolean
language sql stable security definer set search_path = public as $$
  with tz as (
    select coalesce(public.setting_value('scheduling') ->> 'timezone', 'America/Asuncion') as name
  ), l as (
    select (p_start at time zone tz.name) as ls, (p_end at time zone tz.name) as le from tz
  )
  select exists (
    select 1
    from public.availability_rules r, l
    where r.is_active
      and r.weekday = extract(dow from l.ls)::int
      and l.ls::date = l.le::date
      and (r.modality = 'mixta' or r.modality::text = p_modality::text)
      and (r.valid_from is null or l.ls::date >= r.valid_from)
      and (r.valid_until is null or l.ls::date <= r.valid_until)
      and public.rule_occurs_on(r.every_weeks, r.anchor_date, l.ls::date)
      and l.ls::time >= r.start_time
      and l.le::time <= r.end_time
      and p_end - p_start = make_interval(mins => r.slot_duration_minutes)
      and mod(
            extract(epoch from (l.ls::time - r.start_time))::bigint,
            ((r.slot_duration_minutes + r.buffer_minutes) * 60)::bigint
          ) = 0
  );
$$;

-- 4. Carga inicial -------------------------------------------------------------
insert into public.practice_locations (id, name, address, city, maps_url, sort_order) values
  ('5ede0001-0000-4000-8000-000000000001', 'Sanatorio La Trinidad',
   'Avda. Bernardino Caballero 248, entre Artigas y Juan León Mallorquín', 'Encarnación, Itapúa',
   'https://www.google.com/maps/search/?api=1&query=Sanatorio+La+Trinidad+Encarnaci%C3%B3n', 1),
  ('5ede0001-0000-4000-8000-000000000002', 'Sanatorio Adventista de Hohenau',
   'Ruta PY06, km 38,5', 'Hohenau, Itapúa',
   'https://www.google.com/maps/search/?api=1&query=Sanatorio+Adventista+de+Hohenau', 2)
on conflict (id) do nothing;

-- Martes alternados: La Trinidad 16:00–20:00 y el Adventista 12:00–17:00, cada 15 días.
-- Turnos de la duración por defecto, uno por hora. Solo si todavía no hay franjas en esas sedes.
insert into public.availability_rules (weekday, start_time, end_time, slot_duration_minutes, buffer_minutes, modality, is_active, location_id, every_weeks, anchor_date)
select 2, s.start_time, s.end_time, d.duration, greatest(0, 60 - d.duration), 'presencial', true, s.location_id, 2, s.anchor
from (values
  ('16:00'::time, '20:00'::time, '5ede0001-0000-4000-8000-000000000001'::uuid, date '2026-10-27'),
  ('12:00'::time, '17:00'::time, '5ede0001-0000-4000-8000-000000000002'::uuid, date '2026-11-03')
) as s (start_time, end_time, location_id, anchor)
cross join (
  select least(greatest(coalesce((public.setting_value('scheduling') ->> 'default_duration_minutes')::int, 50), 15), 240) as duration
) d
where exists (select 1 from public.practice_locations p where p.id = s.location_id)
  and not exists (select 1 from public.availability_rules r where r.location_id = s.location_id);

-- Los martes pasan a ser en las sedes: la franja semanal de ejemplo (martes 14–20, ambas
-- modalidades, sin sede) se desactiva solo si sigue tal cual la dejó la instalación.
-- Si la cambiaste, queda como está; revisala en Configuración › Agenda.
update public.availability_rules
set is_active = false, updated_at = now()
where weekday = 2 and is_active and location_id is null and every_weeks = 1
  and start_time = '14:00' and end_time = '20:00' and slot_duration_minutes = 60 and buffer_minutes = 0 and modality = 'mixta'
  and valid_from is null and valid_until is null
  and exists (select 1 from public.availability_rules r where r.location_id is not null and r.weekday = 2 and r.is_active);
