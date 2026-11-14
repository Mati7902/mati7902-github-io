-- ============================================================================
-- Tests propios de opción múltiple
-- ----------------------------------------------------------------------------
-- Además de verdadero/falso y escala, cada pregunta puede tener sus propias
-- opciones, cada una con su texto y su puntaje (como los inventarios de 21
-- grupos de afirmaciones). Una pregunta puede marcar alerta urgente desde un
-- puntaje (ej.: ideación suicida). Consignas de hasta 1200 caracteres.
-- ============================================================================
alter table public.custom_tests drop constraint if exists custom_tests_kind_check;
alter table public.custom_tests add constraint custom_tests_kind_check check (kind in ('vf', 'scale', 'choice'));
alter table public.custom_tests drop constraint if exists custom_tests_check;
alter table public.custom_tests add constraint custom_tests_check check (kind <> 'scale' or (scale_min is not null and scale_max is not null));
alter table public.custom_tests drop constraint if exists custom_tests_instructions_check;
alter table public.custom_tests add constraint custom_tests_instructions_check check (char_length(instructions) between 2 and 1200);

comment on table public.custom_tests is 'Cuestionarios propios del profesional (verdadero/falso, escala u opción múltiple).';
