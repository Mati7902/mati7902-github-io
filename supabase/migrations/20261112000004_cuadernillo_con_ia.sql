-- ============================================================================
-- Cuadernillo redactado con IA y respuestas del paciente
-- ----------------------------------------------------------------------------
-- 1. Las versiones pueden venir de la IA (origin = 'ai'); igual requieren la
--    aprobación del profesional para publicarse.
-- 2. workbook_answers: lo que el paciente escribe en las hojas de trabajo de los
--    capítulos, en la app. Lo gestiona el paciente; el profesional lo lee si el
--    paciente comparte sus registros (igual que las respuestas de ejercicios).
-- ============================================================================
alter table public.workbook_versions drop constraint if exists workbook_versions_origin_check;
alter table public.workbook_versions add constraint workbook_versions_origin_check check (origin in ('rules', 'ai', 'edit'));

create table if not exists public.workbook_answers (
  workbook_id uuid not null references public.workbooks (id) on delete cascade,
  patient_id  uuid not null references public.patients (id) on delete cascade,
  prompt_key  text not null check (prompt_key ~ '^c[0-9]{1,2}p[0-9]{1,2}$'),
  answer      text not null check (char_length(answer) <= 5000),
  updated_at  timestamptz not null default now(),
  primary key (workbook_id, prompt_key)
);

drop trigger if exists workbook_answers_set_updated_at on public.workbook_answers;
create trigger workbook_answers_set_updated_at before update on public.workbook_answers
  for each row execute function public.set_updated_at();

alter table public.workbook_answers enable row level security;
drop policy if exists "workbook_answers: paciente gestiona las suyas" on public.workbook_answers;
create policy "workbook_answers: paciente gestiona las suyas" on public.workbook_answers for all to authenticated
  using (patient_id = public.current_patient_id())
  with check (
    patient_id = public.current_patient_id()
    and exists (select 1 from public.workbooks w where w.id = workbook_id and w.patient_id = public.current_patient_id() and w.status = 'published')
  );
drop policy if exists "workbook_answers: profesional lee si el paciente comparte" on public.workbook_answers;
create policy "workbook_answers: profesional lee si el paciente comparte" on public.workbook_answers for select to authenticated
  using (public.is_admin() and exists (select 1 from public.patients p where p.id = workbook_answers.patient_id and p.share_records_with_professional));

comment on table public.workbook_answers is 'Respuestas del paciente a las hojas de trabajo de su cuadernillo.';
