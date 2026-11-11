-- ============================================================================
-- Telemetría técnica: rendimiento (Web Vitals) y errores de pantalla
-- ----------------------------------------------------------------------------
-- Solo datos técnicos: métrica, valor, tipo de página y tipo de dispositivo.
-- Sin usuario, sin IP y sin contenido. La ruta se guarda como plantilla
-- (los identificadores se reemplazan por ":id"). Escribe únicamente el servidor;
-- lee solo el profesional. Se purga a los 90 días (cron de mantenimiento).
-- ============================================================================
create table if not exists public.tech_events (
  id          bigint generated always as identity primary key,
  kind        text not null check (kind in ('LCP', 'INP', 'CLS', 'FCP', 'TTFB', 'error')),
  value       double precision not null check (value >= 0),
  path        text not null check (char_length(path) <= 120),
  device      text not null check (device in ('mobile', 'desktop')),
  created_at  timestamptz not null default now()
);
create index if not exists tech_events_kind_created_idx on public.tech_events (kind, created_at desc);

alter table public.tech_events enable row level security;
drop policy if exists "tech_events: lee el profesional" on public.tech_events;
create policy "tech_events: lee el profesional" on public.tech_events for select to authenticated using (public.is_admin());

comment on table public.tech_events is 'Rendimiento y errores de pantalla, sin datos personales ni clínicos. Inserta solo el servidor (service_role).';
