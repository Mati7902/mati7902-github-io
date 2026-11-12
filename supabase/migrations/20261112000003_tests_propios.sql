-- ============================================================================
-- Tests propios del profesional (verdadero/falso o escala)
-- ----------------------------------------------------------------------------
-- El profesional arma sus cuestionarios: consigna, ítems, tipo de respuesta y
-- (opcional) rangos de interpretación. Se asignan como cualquier test; el
-- puntaje lo calcula el servidor. `code` es el identificador que usan
-- test_assignments y test_responses (ej. "p3f9a1c2d4e").
-- El paciente solo puede leer un test propio que tenga asignado.
-- ============================================================================
create table if not exists public.custom_tests (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique check (code ~ '^p[a-z0-9]{6,19}$'),
  name         text not null check (char_length(name) between 2 and 40),
  full_name    text not null check (char_length(full_name) between 2 and 160),
  instructions text not null check (char_length(instructions) between 2 and 600),
  kind         text not null check (kind in ('vf', 'scale')),
  scale_min    smallint check (scale_min between 0 and 1),
  scale_max    smallint check (scale_max between 2 and 10),
  min_label    text check (min_label is null or char_length(min_label) <= 40),
  max_label    text check (max_label is null or char_length(max_label) <= 40),
  items        jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) between 1 and 60),
  bands        jsonb not null default '[]'::jsonb check (jsonb_typeof(bands) = 'array'),
  note         text check (note is null or char_length(note) <= 600),
  is_active    boolean not null default true,
  created_by   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (kind = 'vf' or (scale_min is not null and scale_max is not null))
);

drop trigger if exists custom_tests_set_updated_at on public.custom_tests;
create trigger custom_tests_set_updated_at before update on public.custom_tests
  for each row execute function public.set_updated_at();

alter table public.custom_tests enable row level security;
drop policy if exists "custom_tests: profesional gestiona" on public.custom_tests;
create policy "custom_tests: profesional gestiona" on public.custom_tests for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "custom_tests: paciente lee los asignados" on public.custom_tests;
create policy "custom_tests: paciente lee los asignados" on public.custom_tests for select to authenticated
  using (exists (select 1 from public.test_assignments a where a.test_id = custom_tests.code and a.patient_id = public.current_patient_id()));

comment on table public.custom_tests is 'Cuestionarios propios del profesional (verdadero/falso o escala).';
