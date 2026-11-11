-- ============================================================================
-- Mi Progreso Terapéutico
-- ----------------------------------------------------------------------------
-- 1. therapy_goals: objetivos acordados en sesión. Los carga el profesional;
--    el paciente los ve.
-- 2. progress_prefs: preferencias de motivación de cada paciente (meta semanal,
--    pausa, insignias). El paciente cambia las suyas; solo el profesional puede
--    apagar o encender el sistema para ese paciente.
-- 3. progress_challenges: desafíos de 3 a 30 días que habilita el profesional.
--
-- Los puntos, las semanas cumplidas y las insignias NO se guardan: se calculan
-- a partir de los ejercicios y registros que ya existen (src/lib/progress).
-- Así no hay forma de sumar puntos sin practicar, y nada se pierde al pausar.
-- ============================================================================

-- 1. Objetivos terapéuticos ---------------------------------------------------
create table if not exists public.therapy_goals (
  id          uuid primary key default gen_random_uuid(),
  patient_id  uuid not null references public.patients (id) on delete cascade,
  title       text not null check (char_length(title) between 2 and 160),
  detail      text check (detail is null or char_length(detail) <= 500),
  status      text not null default 'active' check (status in ('active', 'achieved', 'paused')),
  sort_order  int not null default 0,
  created_by  uuid references public.profiles (id) on delete set null,
  achieved_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists therapy_goals_patient_idx on public.therapy_goals (patient_id, sort_order);

drop trigger if exists therapy_goals_set_updated_at on public.therapy_goals;
create trigger therapy_goals_set_updated_at before update on public.therapy_goals
  for each row execute function public.set_updated_at();

alter table public.therapy_goals enable row level security;
drop policy if exists "goals: paciente lee los suyos" on public.therapy_goals;
create policy "goals: paciente lee los suyos" on public.therapy_goals for select to authenticated
  using (patient_id = public.current_patient_id());
drop policy if exists "goals: profesional gestiona" on public.therapy_goals;
create policy "goals: profesional gestiona" on public.therapy_goals for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- 2. Preferencias de motivación -------------------------------------------------
create table if not exists public.progress_prefs (
  patient_id           uuid primary key references public.patients (id) on delete cascade,
  weekly_goal          smallint not null default 3 check (weekly_goal between 1 and 7),
  paused_until         date,
  badges_enabled       boolean not null default true,
  -- null = lo decide la regla por defecto (apagado si el diagnóstico es TOC o conducta alimentaria).
  professional_enabled boolean,
  updated_at           timestamptz not null default now()
);

drop trigger if exists progress_prefs_set_updated_at on public.progress_prefs;
create trigger progress_prefs_set_updated_at before update on public.progress_prefs
  for each row execute function public.set_updated_at();

-- El paciente no puede encender lo que el profesional apagó.
create or replace function public.progress_prefs_guard()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_privileged() then
    if tg_op = 'INSERT' then
      new.professional_enabled := null;
    elsif new.professional_enabled is distinct from old.professional_enabled then
      raise exception 'Solo el profesional puede cambiar esta opción' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
revoke all on function public.progress_prefs_guard() from public;

drop trigger if exists progress_prefs_guard on public.progress_prefs;
create trigger progress_prefs_guard before insert or update on public.progress_prefs
  for each row execute function public.progress_prefs_guard();

alter table public.progress_prefs enable row level security;
drop policy if exists "progress_prefs: paciente gestiona las suyas" on public.progress_prefs;
create policy "progress_prefs: paciente gestiona las suyas" on public.progress_prefs for all to authenticated
  using (patient_id = public.current_patient_id()) with check (patient_id = public.current_patient_id());
drop policy if exists "progress_prefs: profesional gestiona" on public.progress_prefs;
create policy "progress_prefs: profesional gestiona" on public.progress_prefs for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- 3. Desafíos ------------------------------------------------------------------
create table if not exists public.progress_challenges (
  id          uuid primary key default gen_random_uuid(),
  patient_id  uuid not null references public.patients (id) on delete cascade,
  challenge   text not null check (challenge ~ '^[a-z][a-z0-9-]{1,40}$'),
  days        smallint not null check (days in (3, 7, 14, 30)),
  target      smallint not null check (target between 1 and 30),
  starts_on   date not null,
  note        text check (note is null or char_length(note) <= 300),
  status      text not null default 'active' check (status in ('active', 'cancelled')),
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  check (target <= days)
);
create index if not exists progress_challenges_patient_idx on public.progress_challenges (patient_id, starts_on desc);

alter table public.progress_challenges enable row level security;
drop policy if exists "challenges: paciente lee los suyos" on public.progress_challenges;
create policy "challenges: paciente lee los suyos" on public.progress_challenges for select to authenticated
  using (patient_id = public.current_patient_id());
drop policy if exists "challenges: profesional gestiona" on public.progress_challenges;
create policy "challenges: profesional gestiona" on public.progress_challenges for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

comment on table public.therapy_goals is 'Objetivos terapéuticos acordados. El paciente los ve; los edita el profesional.';
comment on table public.progress_prefs is 'Preferencias de Mi Progreso. Puntos e insignias se calculan, no se guardan.';
comment on table public.progress_challenges is 'Desafíos de práctica habilitados por el profesional.';
