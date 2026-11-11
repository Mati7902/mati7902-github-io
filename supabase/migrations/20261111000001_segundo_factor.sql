-- ============================================================================
-- Verificación en dos pasos para cuentas profesionales
-- ----------------------------------------------------------------------------
-- Si la cuenta tiene un segundo factor verificado (app de códigos), los permisos
-- de administrador solo valen para sesiones que ya pasaron ese segundo paso
-- (aal2). Así una contraseña robada no alcanza para leer datos de pacientes,
-- ni desde la aplicación ni llamando a la API directamente.
-- Las cuentas sin segundo factor siguen funcionando como hasta ahora.
-- ============================================================================
create or replace function public.second_factor_ok()
returns boolean
language plpgsql stable security definer set search_path = public as $$
begin
  return not exists (select 1 from auth.mfa_factors f where f.user_id = auth.uid() and f.status::text = 'verified')
      or coalesce(auth.jwt() ->> 'aal', '') = 'aal2';
exception
  -- Sin acceso a la tabla de factores no se puede exigir el segundo paso: no se bloquea al profesional.
  when undefined_table or insufficient_privilege then
    return true;
end $$;

revoke all on function public.second_factor_ok() from public;
grant execute on function public.second_factor_ok() to authenticated, service_role;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select role in ('admin', 'professional') from public.profiles where id = auth.uid() and is_active),
    false
  ) and public.second_factor_ok();
$$;

create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select role in ('admin', 'professional', 'receptionist') from public.profiles where id = auth.uid() and is_active),
    false
  ) and public.second_factor_ok();
$$;
