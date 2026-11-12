-- ============================================================================
-- Bandeja «Para revisar» del profesional
-- ----------------------------------------------------------------------------
-- Marca qué ítems ya revisó el profesional (ficha de ingreso enviada, test
-- respondido) para que la bandeja muestre solo lo pendiente. No guarda contenido
-- clínico: solo el tipo, el id y cuándo se revisó. Solo el profesional.
-- ============================================================================
create table if not exists public.clinical_reviews (
  item_type   text not null check (item_type in ('intake', 'test_response')),
  item_id     uuid not null,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz not null default now(),
  primary key (item_type, item_id)
);

alter table public.clinical_reviews enable row level security;
drop policy if exists "clinical_reviews: solo profesional" on public.clinical_reviews;
create policy "clinical_reviews: solo profesional" on public.clinical_reviews for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

comment on table public.clinical_reviews is 'Ítems de la bandeja «Para revisar» que el profesional ya revisó.';
