-- ============================================================================
-- Consola DIVA-5 en la ficha del paciente
-- ----------------------------------------------------------------------------
-- · instrument_content: contenido de instrumentos con derechos de autor que el
--   profesional usa con permiso. Vive solo en la base (no en el código público)
--   y solo lo lee el profesional. Se carga con un SQL aparte.
-- · instrument_results.report: el texto completo para el HIS o el informe.
-- ============================================================================
create table if not exists public.instrument_content (
  key        text primary key check (key ~ '^[a-z0-9-]{2,40}$'),
  content    jsonb not null check (jsonb_typeof(content) = 'object'),
  updated_at timestamptz not null default now()
);
alter table public.instrument_content enable row level security;
drop policy if exists "instrument_content: solo profesional" on public.instrument_content;
create policy "instrument_content: solo profesional" on public.instrument_content for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

alter table public.instrument_results add column if not exists report text;
alter table public.instrument_results drop constraint if exists instrument_results_report_check;
alter table public.instrument_results add constraint instrument_results_report_check check (report is null or char_length(report) <= 12000);

comment on table public.instrument_content is 'Contenido de instrumentos con licencia (ej. DIVA-5). Solo el profesional.';
