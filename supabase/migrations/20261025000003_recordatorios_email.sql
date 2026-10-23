-- ============================================================================
-- Recordatorios de sesión también por email
-- ----------------------------------------------------------------------------
-- Suma el canal "email" a la configuración de recordatorios guardada. El envío
-- usa la API de Resend (RESEND_API_KEY en Vercel); sin esa clave el canal se
-- ignora y siguen WhatsApp y la notificación en la app.
-- ============================================================================
update public.settings
set value = jsonb_set(value, '{channels}', (value -> 'channels') || '["email"]'::jsonb),
    updated_at = now()
where key = 'reminders'
  and jsonb_typeof(value -> 'channels') = 'array'
  and not (value -> 'channels') ? 'email';
-- Sin "channels" guardado se usan los valores por defecto, que ya incluyen email.
