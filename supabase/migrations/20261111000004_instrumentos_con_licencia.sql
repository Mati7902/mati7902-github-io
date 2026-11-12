-- ============================================================================
-- Instrumentos psicométricos con licencia
-- ----------------------------------------------------------------------------
-- Para tests con derechos de autor (BDI-II, BAI, DIVA-5…) la plataforma NO guarda
-- ítems ni los administra: comprar el material no autoriza a reproducirlo. Se
-- registra el instrumento con los datos de su licencia y se cargan los
-- RESULTADOS (puntaje, fecha, interpretación según el manual) aplicados por el
-- canal autorizado. Todo es solo del profesional: el paciente no lo ve.
-- ============================================================================
create table if not exists public.instruments (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null check (char_length(name) between 2 and 120),
  short_name         text not null check (char_length(short_name) between 1 and 30),
  edition            text check (edition is null or char_length(edition) <= 120),
  rights_holder      text check (rights_holder is null or char_length(rights_holder) <= 160),
  language           text check (language is null or char_length(language) <= 60),
  license_scope      text check (license_scope is null or char_length(license_scope) <= 500),
  digital_permission boolean not null default false,
  remote_permission  boolean not null default false,
  license_expires_on date,
  score_min          numeric,
  score_max          numeric,
  higher_is          text check (higher_is in ('worse', 'better')),
  notes              text check (notes is null or char_length(notes) <= 1000),
  is_active          boolean not null default true,
  created_by         uuid references public.profiles (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  check (score_min is null or score_max is null or score_min < score_max)
);

drop trigger if exists instruments_set_updated_at on public.instruments;
create trigger instruments_set_updated_at before update on public.instruments
  for each row execute function public.set_updated_at();

create table if not exists public.instrument_results (
  id             uuid primary key default gen_random_uuid(),
  patient_id     uuid not null references public.patients (id) on delete cascade,
  instrument_id  uuid not null references public.instruments (id) on delete restrict,
  applied_on     date not null,
  score          numeric,
  interpretation text check (interpretation is null or char_length(interpretation) <= 200),
  notes          text check (notes is null or char_length(notes) <= 1000),
  created_by     uuid references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now()
);
create index if not exists instrument_results_patient_idx on public.instrument_results (patient_id, applied_on desc);

alter table public.instruments enable row level security;
alter table public.instrument_results enable row level security;
drop policy if exists "instruments: solo profesional" on public.instruments;
create policy "instruments: solo profesional" on public.instruments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "instrument_results: solo profesional" on public.instrument_results;
create policy "instrument_results: solo profesional" on public.instrument_results for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- El puntaje tiene que caer dentro del rango del instrumento (si está cargado).
create or replace function public.instrument_result_check()
returns trigger
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  select score_min, score_max into r from public.instruments where id = new.instrument_id;
  if new.score is not null and ((r.score_min is not null and new.score < r.score_min) or (r.score_max is not null and new.score > r.score_max)) then
    raise exception 'El puntaje está fuera del rango del instrumento' using errcode = '23514';
  end if;
  return new;
end $$;
revoke all on function public.instrument_result_check() from public;
drop trigger if exists instrument_result_check on public.instrument_results;
create trigger instrument_result_check before insert or update on public.instrument_results
  for each row execute function public.instrument_result_check();

-- Carga inicial: fichas de referencia SIN permiso digital (solo resultados). El
-- profesional completa edición, licencia y vencimiento según lo que compró.
insert into public.instruments (id, name, short_name, rights_holder, language, license_scope, score_min, score_max, higher_is, notes) values
  ('a5e00001-0000-4000-8000-000000000001', 'Inventario de Depresión de Beck, segunda edición', 'BDI-II', 'Pearson (editorial titular; verificar distribuidor local)', 'Español', 'Uso en papel con cuadernillos comprados. Sin permiso de reproducción digital salvo licencia específica.', 0, 63, 'worse', 'Interpretar según el manual de la adaptación usada.'),
  ('a5e00001-0000-4000-8000-000000000002', 'Inventario de Ansiedad de Beck', 'BAI', 'Pearson (editorial titular; verificar distribuidor local)', 'Español', 'Uso en papel con cuadernillos comprados. Sin permiso de reproducción digital salvo licencia específica.', 0, 63, 'worse', 'Interpretar según el manual de la adaptación usada.'),
  ('a5e00001-0000-4000-8000-000000000003', 'Entrevista Diagnóstica para TDAH en adultos (DIVA-5)', 'DIVA-5', 'DIVA Foundation', 'Español', 'Entrevista clínica semiestructurada; se aplica en sesión. Revisar las condiciones de uso de la fundación.', null, null, null, 'No es autoadministrable. Registrar conclusión y criterios cumplidos en las notas.')
on conflict (id) do nothing;

comment on table public.instruments is 'Instrumentos con licencia: datos de la licencia, sin ítems. Solo el profesional.';
comment on table public.instrument_results is 'Resultados de instrumentos aplicados por el canal autorizado. Solo el profesional.';
