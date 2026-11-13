-- ============================================================================
-- Mejoras de experiencia del paciente
-- ----------------------------------------------------------------------------
--  · Notificaciones al celular (Web Push): suscripciones por dispositivo y
--    recordatorios suaves que el paciente elige (ánimo, hábitos, cuadernillo).
--  · «¿Te sirvió?» al terminar un ejercicio.
-- ============================================================================

-- Claves VAPID del servidor: se generan solas la primera vez. Solo el servidor (service_role).
create table if not exists public.push_config (
  id          boolean primary key default true check (id),
  public_key  text not null,
  private_key text not null,
  created_at  timestamptz not null default now()
);
alter table public.push_config enable row level security;
-- Sin políticas: ningún usuario la lee; solo el servidor con service_role.

-- Un registro por dispositivo (navegador o app instalada).
create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  endpoint   text not null unique check (endpoint ~ '^https://'),
  p256dh     text not null,
  auth       text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_ok_at timestamptz
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;
drop policy if exists "push_subscriptions: propias" on public.push_subscriptions;
create policy "push_subscriptions: propias" on public.push_subscriptions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Recordatorios que elige el paciente. Nada se envía si no lo activa.
create table if not exists public.reminder_prefs (
  user_id      uuid primary key references public.profiles (id) on delete cascade,
  mood         boolean not null default false,
  habits       boolean not null default false,
  workbook     boolean not null default false,
  hour         smallint not null default 20 check (hour between 7 and 22),
  -- Días de la semana (1 = lunes … 7 = domingo).
  days         smallint[] not null default '{1,2,3,4,5,6,7}' check (days <@ '{1,2,3,4,5,6,7}'::smallint[] and cardinality(days) between 1 and 7),
  last_sent_on date,
  updated_at   timestamptz not null default now()
);
alter table public.reminder_prefs enable row level security;
drop policy if exists "reminder_prefs: propias" on public.reminder_prefs;
create policy "reminder_prefs: propias" on public.reminder_prefs for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- «¿Te sirvió?» (si / algo / no) al terminar un ejercicio.
alter table public.exercise_responses add column if not exists helpful text;
alter table public.exercise_responses drop constraint if exists exercise_responses_helpful_check;
alter table public.exercise_responses add constraint exercise_responses_helpful_check check (helpful is null or helpful in ('si', 'algo', 'no'));
