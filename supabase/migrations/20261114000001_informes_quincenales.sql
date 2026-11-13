-- ============================================================================
-- Informe quincenal del profesional
-- ----------------------------------------------------------------------------
-- El 1 y el 16 de cada mes el servidor arma un informe de la quincena anterior
-- (1–15 o 16–fin de mes) con todos los pacientes activos: sesiones, ánimo,
-- práctica, hábitos, tests, cuadernillo y alertas. Solo lo ve el profesional.
-- Los registros personales (ánimo, ejercicios, hábitos) entran solo si el
-- paciente comparte sus registros con el profesional.
-- ============================================================================
create table if not exists public.clinical_reports (
  id           uuid primary key default gen_random_uuid(),
  period_start date not null,
  period_end   date not null,
  content      jsonb not null,
  generated_at timestamptz not null default now(),
  read_at      timestamptz,
  unique (period_start, period_end),
  check (period_end >= period_start)
);

alter table public.clinical_reports enable row level security;
drop policy if exists "clinical_reports: solo profesional" on public.clinical_reports;
create policy "clinical_reports: solo profesional" on public.clinical_reports for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

comment on table public.clinical_reports is 'Informes quincenales de todos los pacientes. Solo el profesional.';
