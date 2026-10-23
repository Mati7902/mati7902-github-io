-- ============================================================================
-- Ánimo diario en el registro emocional
-- ----------------------------------------------------------------------------
-- El registro guardaba emociones con una intensidad de 0 a 10, que no dice si
-- el ánimo mejora (una intensidad alta puede ser de ansiedad o de alegría).
-- Se agrega "mood": cómo está el ánimo general, de 1 (muy bajo) a 10 (muy bien).
-- Un registro puede ser solo el ánimo (registro rápido) o emociones con su
-- intensidad, o las dos cosas. Los registros anteriores no cambian.
-- ============================================================================

alter table public.emotional_logs add column if not exists mood smallint;

alter table public.emotional_logs drop constraint if exists emotional_logs_mood_check;
alter table public.emotional_logs add constraint emotional_logs_mood_check check (mood between 1 and 10);

alter table public.emotional_logs alter column intensity drop not null;

alter table public.emotional_logs drop constraint if exists emotional_logs_emotions_check;
alter table public.emotional_logs drop constraint if exists emotional_logs_content_check;
alter table public.emotional_logs add constraint emotional_logs_content_check check (
  cardinality(emotions) <= 5
  and (cardinality(emotions) = 0) = (intensity is null)
  and (cardinality(emotions) > 0 or mood is not null)
);

comment on column public.emotional_logs.mood is 'Ánimo general del momento: 1 (muy bajo) a 10 (muy bien). Opcional.';
