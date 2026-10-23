/** Valores por defecto de identidad. Los definitivos se leen de settings (editable desde Configuración). */
export const siteDefaults = {
  platformName: "Psicología Matías Sánchez",
  professionalName: "Lic. Matías Sánchez",
  professionalTitle: "Psicólogo",
  license: "RP 14394-LP",
  country: "Paraguay",
  tagline: "Un espacio para comprender lo que te pasa y trabajar en lo que necesitás.",
  brandSubtitle: "Psicología · Neurociencia aplicada",
  heroTitle: "Terapia desde *donde estés*, con el rigor de una consulta clínica.",
  heroSubtitle: "Acompañamiento psicológico profesional en modalidad virtual, con el mismo marco clínico, ético y basado en evidencia que en consultorio.",
  specialtiesTitle: "Terapia basada en neurociencia aplicada",
  specialties: [
    { title: "Ansiedad y ataques de pánico", text: "Preocupación constante, crisis de pánico y síntomas físicos de la ansiedad." },
    { title: "Depresión y estado de ánimo", text: "Tristeza persistente, desgano y pérdida de interés en lo cotidiano." },
    { title: "Trastorno obsesivo-compulsivo (TOC)", text: "Pensamientos intrusivos y rituales que consumen tiempo y energía." },
    { title: "Trauma y estrés postraumático", text: "Recuerdos que irrumpen, alerta constante y evitación después de experiencias difíciles." },
    { title: "Duelo", text: "Acompañamiento ante pérdidas, separaciones y cambios vitales." },
    { title: "Estrés laboral y burnout", text: "Agotamiento, sobrecarga y dificultad para desconectar del trabajo." },
    { title: "Insomnio y sueño", text: "Dificultad para dormir o descansar, con técnicas basadas en evidencia." },
    { title: "Fobias y ansiedad social", text: "Miedos intensos que limitan situaciones, lugares o vínculos." },
    { title: "TDAH en adultos", text: "Organización, atención y manejo del tiempo en la vida adulta." },
    { title: "Conducta alimentaria", text: "Relación con la comida, el cuerpo y la imagen personal." },
    { title: "Autoestima", text: "Autocrítica, inseguridad y la forma en que te tratás a vos mismo." },
    { title: "Pareja y vínculos", text: "Comunicación, conflictos y patrones que se repiten en las relaciones." },
    { title: "Adolescentes", text: "Emociones, escuela, familia y vínculos en la adolescencia." },
    { title: "Regulación emocional", text: "Emociones intensas, impulsividad y herramientas para manejarlas." },
  ],
  approachText: "Integración de psicoterapia clínica y neurociencia aplicada, con intervenciones respaldadas por evidencia actualizada.",
  locale: "es-PY",
} as const;

/** Contacto público del consultorio. La fuente editable es Configuración › Identidad; esto es el valor de respaldo. */
export const practiceContact = {
  whatsapp: "+595985569077",
  whatsappMessage: "Hola Lic. Matías, quisiera consultar por una sesión de psicología.",
} as const;

/** Datos de posicionamiento (SEO local y GEO). */
export const seoDefaults = {
  city: "Encarnación",
  region: "Itapúa",
  /** Fecha de última revisión del contenido público (se muestra en las páginas y en llms.txt). */
  contentUpdated: "2026-10-23",
  contentUpdatedLabel: "octubre de 2026",
} as const;

export const patientNav = [
  { href: "/app", label: "Inicio", icon: "home" },
  { href: "/app/ejercicios", label: "Ejercicios", icon: "sparkles" },
  { href: "/app/agenda", label: "Agenda", icon: "calendar" },
  { href: "/app/materiales", label: "Materiales", icon: "library" },
  { href: "/app/perfil", label: "Perfil", icon: "user" },
] as const;

export const adminNav = [
  { href: "/admin", label: "Hoy", icon: "layout-dashboard" },
  { href: "/admin/agenda", label: "Agenda", icon: "calendar" },
  { href: "/admin/pacientes", label: "Pacientes", icon: "users" },
  { href: "/admin/materiales", label: "Materiales", icon: "library" },
  { href: "/admin/ejercicios", label: "Ejercicios", icon: "sparkles" },
  { href: "/admin/guia", label: "Guía clínica", icon: "book-open" },
  { href: "/admin/planes", label: "Planes", icon: "badge-dollar-sign" },
  { href: "/admin/whatsapp", label: "WhatsApp", icon: "message-circle" },
  { href: "/admin/actividad", label: "Actividad", icon: "activity" },
  { href: "/admin/configuracion", label: "Configuración", icon: "settings" },
] as const;

export const EMOTIONS = [
  { key: "tranquilo", label: "Tranquilo/a", tone: "calm" },
  { key: "ansioso", label: "Ansioso/a", tone: "alert" },
  { key: "triste", label: "Triste", tone: "low" },
  { key: "enojado", label: "Enojado/a", tone: "hot" },
  { key: "frustrado", label: "Frustrado/a", tone: "hot" },
  { key: "confundido", label: "Confundido/a", tone: "alert" },
  { key: "cansado", label: "Cansado/a", tone: "low" },
  { key: "esperanzado", label: "Esperanzado/a", tone: "calm" },
  { key: "motivado", label: "Motivado/a", tone: "calm" },
] as const;

export type EmotionKey = (typeof EMOTIONS)[number]["key"];

export const emotionLabel = (key: string) => EMOTIONS.find((e) => e.key === key)?.label ?? key;
