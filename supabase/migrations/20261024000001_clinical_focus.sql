-- ============================================================================
-- Diagnóstico probable, biblioteca privada y tests asignados
-- ----------------------------------------------------------------------------
-- 1. La biblioteca pasa a ser privada: todos los materiales quedan "asignados"
--    y el paciente ve solo lo que el profesional le asignó.
-- 2. patient_clinical_focus: el foco clínico o diagnóstico probable de cada
--    paciente (uno o varios de los cuadros de atención). Lo ve SOLO el
--    profesional: el paciente no puede leer esta tabla.
-- 3. test_assignments / test_responses: tests de uso libre de la guía clínica
--    asignados a un paciente. El puntaje lo calcula el servidor; el paciente
--    no escribe en estas tablas directamente y ve su resultado solo si el
--    profesional lo habilitó.
-- ============================================================================

-- Categorías para los recursos nuevos ---------------------------------------
insert into public.material_categories (slug, name, sort_order) values
  ('trauma', 'Trauma', 16), ('toc', 'TOC', 17), ('alimentacion', 'Conducta alimentaria', 18)
on conflict (slug) do nothing;

-- 1. Biblioteca privada -------------------------------------------------------
update public.materials set visibility = 'assigned', updated_at = now() where visibility = 'public';
alter table public.materials alter column visibility set default 'assigned';

-- 2. Foco clínico / diagnóstico probable --------------------------------------
create table if not exists public.patient_clinical_focus (
  id          uuid primary key default gen_random_uuid(),
  patient_id  uuid not null references public.patients (id) on delete cascade,
  focus_key   text not null check (focus_key ~ '^[a-z][a-z0-9_-]{1,40}$'),
  icd10       text check (icd10 is null or char_length(icd10) <= 20),
  note        text check (note is null or char_length(note) <= 1000),
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (patient_id, focus_key)
);
create index if not exists patient_clinical_focus_patient_idx on public.patient_clinical_focus (patient_id);

alter table public.patient_clinical_focus enable row level security;
drop policy if exists "clinical_focus: solo profesional" on public.patient_clinical_focus;
create policy "clinical_focus: solo profesional" on public.patient_clinical_focus for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

comment on table public.patient_clinical_focus is 'Diagnóstico probable o foco clínico. Solo lo ve el profesional (RLS); el paciente no tiene acceso.';

-- 3. Tests asignados ----------------------------------------------------------
create table if not exists public.test_assignments (
  id           uuid primary key default gen_random_uuid(),
  patient_id   uuid not null references public.patients (id) on delete cascade,
  test_id      text not null check (test_id ~ '^[a-z0-9]{2,20}$'),
  assigned_by  uuid references public.profiles (id) on delete set null,
  focus_key    text,
  note         text check (note is null or char_length(note) <= 500),
  due_on       date,
  show_result  boolean not null default false,
  status       text not null default 'pending' check (status in ('pending', 'completed', 'cancelled')),
  assigned_at  timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists test_assignments_patient_idx on public.test_assignments (patient_id, assigned_at desc);
-- Un mismo test no puede estar pendiente dos veces para el mismo paciente.
create unique index if not exists test_assignments_one_pending on public.test_assignments (patient_id, test_id) where status = 'pending';

create table if not exists public.test_responses (
  id            uuid primary key default gen_random_uuid(),
  assignment_id uuid not null unique references public.test_assignments (id) on delete cascade,
  patient_id    uuid not null references public.patients (id) on delete cascade,
  test_id       text not null,
  answers       jsonb not null,
  score         numeric,
  max_score     numeric,
  band_label    text,
  level         text check (level is null or level in ('ok', 'neu', 'warn', 'crit')),
  flags         jsonb not null default '[]'::jsonb,
  summary       text,
  risk          boolean not null default false,
  completed_at  timestamptz not null default now()
);
create index if not exists test_responses_patient_idx on public.test_responses (patient_id, test_id, completed_at);

alter table public.test_assignments enable row level security;
alter table public.test_responses enable row level security;

drop policy if exists "test_assignments: paciente ve propios" on public.test_assignments;
create policy "test_assignments: paciente ve propios" on public.test_assignments for select to authenticated
  using (patient_id = public.current_patient_id());
drop policy if exists "test_assignments: profesional gestiona" on public.test_assignments;
create policy "test_assignments: profesional gestiona" on public.test_assignments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- El paciente ve su resultado solo si el profesional lo habilitó en la asignación.
drop policy if exists "test_responses: paciente ve si está habilitado" on public.test_responses;
create policy "test_responses: paciente ve si está habilitado" on public.test_responses for select to authenticated
  using (
    patient_id = public.current_patient_id()
    and exists (select 1 from public.test_assignments a where a.id = test_responses.assignment_id and a.show_result)
  );
drop policy if exists "test_responses: profesional lee" on public.test_responses;
create policy "test_responses: profesional lee" on public.test_responses for select to authenticated
  using (public.is_admin());
-- Sin políticas de escritura: las respuestas las guarda el servidor (service role) tras calcular el puntaje.

grant select, insert, update, delete on public.patient_clinical_focus, public.test_assignments to authenticated;
grant select on public.test_responses to authenticated;
grant all on public.patient_clinical_focus, public.test_assignments, public.test_responses to service_role;
