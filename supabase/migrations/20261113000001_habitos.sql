-- ============================================================================
-- Hábitos que cuidan la salud mental (movimiento, descanso, alimentación)
-- ----------------------------------------------------------------------------
-- El paciente marca qué hábitos de su rutina hizo cada día. Un registro por
-- hábito y día. Suman en Mi Progreso (puntos, semanas e insignias). El
-- profesional los ve si el paciente comparte sus registros.
-- ============================================================================
create table if not exists public.habit_logs (
  patient_id uuid not null references public.patients (id) on delete cascade,
  habit_id   text not null check (habit_id ~ '^[a-z]{3}-[a-z0-9-]{2,30}$'),
  logged_on  date not null,
  created_at timestamptz not null default now(),
  primary key (patient_id, habit_id, logged_on),
  -- Se puede marcar hoy y hasta 3 días atrás; nunca a futuro.
  check (logged_on <= (now() at time zone 'America/Asuncion')::date + 1)
);
create index if not exists habit_logs_patient_idx on public.habit_logs (patient_id, logged_on desc);

alter table public.habit_logs enable row level security;
drop policy if exists "habit_logs: paciente gestiona los suyos" on public.habit_logs;
create policy "habit_logs: paciente gestiona los suyos" on public.habit_logs for all to authenticated
  using (patient_id = public.current_patient_id())
  with check (patient_id = public.current_patient_id() and logged_on >= (now() at time zone 'America/Asuncion')::date - 3);
drop policy if exists "habit_logs: profesional lee si el paciente comparte" on public.habit_logs;
create policy "habit_logs: profesional lee si el paciente comparte" on public.habit_logs for select to authenticated
  using (public.is_admin() and exists (select 1 from public.patients p where p.id = habit_logs.patient_id and p.share_records_with_professional));

comment on table public.habit_logs is 'Hábitos de movimiento, descanso y alimentación que el paciente marcó como hechos.';
