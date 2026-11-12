-- ============================================================================
-- Cuadernillos personalizados
-- ----------------------------------------------------------------------------
-- Al enviar la ficha de ingreso, el servidor arma un BORRADOR con reglas fijas
-- (src/lib/workbook/rules.ts): qué ejercicios de la biblioteca sugerir y por qué.
-- El profesional lo revisa, lo edita y lo aprueba. El paciente ve solo la versión
-- publicada; nunca los borradores, ni el motivo de cada sugerencia, ni las alertas.
--
-- workbooks          → un cuadernillo por proceso (estado, versión publicada).
-- workbook_versions  → cada guardado es una versión nueva (historial completo).
-- ============================================================================
create table if not exists public.workbooks (
  id                uuid primary key default gen_random_uuid(),
  patient_id        uuid not null references public.patients (id) on delete cascade,
  title             text not null default 'Mi cuadernillo' check (char_length(title) between 2 and 120),
  status            text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  published_version int,
  published_at      timestamptz,
  created_by        uuid references public.profiles (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists workbooks_patient_idx on public.workbooks (patient_id, created_at desc);
-- Un solo cuadernillo en curso (borrador o publicado) por paciente.
create unique index if not exists workbooks_one_open_idx on public.workbooks (patient_id) where status in ('draft', 'published');

drop trigger if exists workbooks_set_updated_at on public.workbooks;
create trigger workbooks_set_updated_at before update on public.workbooks
  for each row execute function public.set_updated_at();

create table if not exists public.workbook_versions (
  id           uuid primary key default gen_random_uuid(),
  workbook_id  uuid not null references public.workbooks (id) on delete cascade,
  version      int not null check (version >= 1),
  -- Contenido para el paciente: bienvenida, objetivos en sus palabras, actividades, cierre.
  content      jsonb not null,
  -- Solo para el profesional: de qué respuesta salió cada sugerencia y qué revisar en sesión.
  sources      jsonb not null default '{}'::jsonb,
  rules_version text,
  origin       text not null default 'edit' check (origin in ('rules', 'edit')),
  created_by   uuid references public.profiles (id) on delete set null,
  approved_at  timestamptz,
  approved_by  uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  unique (workbook_id, version)
);

alter table public.workbooks enable row level security;
alter table public.workbook_versions enable row level security;

drop policy if exists "workbooks: profesional gestiona" on public.workbooks;
create policy "workbooks: profesional gestiona" on public.workbooks for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "workbooks: paciente ve el publicado" on public.workbooks;
create policy "workbooks: paciente ve el publicado" on public.workbooks for select to authenticated
  using (patient_id = public.current_patient_id() and status = 'published');

drop policy if exists "workbook_versions: profesional gestiona" on public.workbook_versions;
create policy "workbook_versions: profesional gestiona" on public.workbook_versions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- El paciente lee SOLO el contenido de la versión publicada, sin las fuentes ni las alertas:
-- por eso no tiene política sobre workbook_versions y lee por esta función.
create or replace function public.my_published_workbook()
returns table (workbook_id uuid, title text, version int, content jsonb, published_at timestamptz)
language sql stable security definer set search_path = public as $$
  select w.id, w.title, v.version, v.content, w.published_at
  from public.workbooks w
  join public.workbook_versions v on v.workbook_id = w.id and v.version = w.published_version
  where w.patient_id = public.current_patient_id() and w.status = 'published'
  limit 1;
$$;
revoke all on function public.my_published_workbook() from public;
grant execute on function public.my_published_workbook() to authenticated;

comment on table public.workbooks is 'Cuadernillo personalizado. El paciente ve solo la versión publicada (my_published_workbook).';
comment on table public.workbook_versions is 'Historial de versiones del cuadernillo. sources es solo para el profesional.';
