-- ============================================================================
-- Más áreas de atención en la portada
-- ----------------------------------------------------------------------------
-- Reemplaza la lista de áreas solo si todavía es la original de la plataforma
-- (las 4 iniciales sin cambios). Si el profesional ya la editó en
-- Configuración › Contenido, no se toca.
-- ============================================================================

update public.settings
set value = jsonb_set(value, '{specialties}', jsonb_build_array(
      jsonb_build_object('title', 'Ansiedad y ataques de pánico', 'text', 'Preocupación constante, crisis de pánico y síntomas físicos de la ansiedad.'),
      jsonb_build_object('title', 'Depresión y estado de ánimo', 'text', 'Tristeza persistente, desgano y pérdida de interés en lo cotidiano.'),
      jsonb_build_object('title', 'Trastorno obsesivo-compulsivo (TOC)', 'text', 'Pensamientos intrusivos y rituales que consumen tiempo y energía.'),
      jsonb_build_object('title', 'Trauma y estrés postraumático', 'text', 'Recuerdos que irrumpen, alerta constante y evitación después de experiencias difíciles.'),
      jsonb_build_object('title', 'Duelo', 'text', 'Acompañamiento ante pérdidas, separaciones y cambios vitales.'),
      jsonb_build_object('title', 'Estrés laboral y burnout', 'text', 'Agotamiento, sobrecarga y dificultad para desconectar del trabajo.'),
      jsonb_build_object('title', 'Insomnio y sueño', 'text', 'Dificultad para dormir o descansar, con técnicas basadas en evidencia.'),
      jsonb_build_object('title', 'Fobias y ansiedad social', 'text', 'Miedos intensos que limitan situaciones, lugares o vínculos.'),
      jsonb_build_object('title', 'TDAH en adultos', 'text', 'Organización, atención y manejo del tiempo en la vida adulta.'),
      jsonb_build_object('title', 'Conducta alimentaria', 'text', 'Relación con la comida, el cuerpo y la imagen personal.'),
      jsonb_build_object('title', 'Autoestima', 'text', 'Autocrítica, inseguridad y la forma en que te tratás a vos mismo.'),
      jsonb_build_object('title', 'Pareja y vínculos', 'text', 'Comunicación, conflictos y patrones que se repiten en las relaciones.'),
      jsonb_build_object('title', 'Adolescentes', 'text', 'Emociones, escuela, familia y vínculos en la adolescencia.'),
      jsonb_build_object('title', 'Regulación emocional', 'text', 'Emociones intensas, impulsividad y herramientas para manejarlas.')
    )),
    updated_at = now()
where key = 'landing'
  and value->'specialties' = jsonb_build_array(
    jsonb_build_object('title', 'Trastornos de ansiedad', 'text', 'Ansiedad generalizada, pánico, fobias y ansiedad social.'),
    jsonb_build_object('title', 'Depresión', 'text', 'Depresión mayor, distimia y episodios del estado de ánimo.'),
    jsonb_build_object('title', 'Estrés y burnout', 'text', 'Estrés crónico, agotamiento laboral e insomnio.'),
    jsonb_build_object('title', 'Trauma y duelo', 'text', 'Estrés postraumático, duelos y procesos de cambio vital.')
  );
