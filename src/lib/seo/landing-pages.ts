import type { ModalityMode } from "@/lib/modalities";
import { modalityPhrase } from "@/lib/seo/metadata";

/**
 * Contenido de las páginas de aterrizaje de posicionamiento. Se redactó en la voz del sitio (voseo, sin promesas
 * de resultado). Los datos que dependen de Configuración se completan con marcadores {{...}}.
 *   {{nombre}} {{matricula}} {{whatsapp}} {{atencion}} (frase de modalidad) {{modalidad}} (online / presencial / presencial y online)
 */
export type LandingSection = { heading: string; paragraphs?: string[]; bullets?: string[] };
export type LandingFaq = { question: string; answer: string };
export type LandingPage = {
  slug: string;
  path: string;
  /** Nombre corto: migas de pan, enlaces internos. */
  name: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  /** Respuesta directa de 2–3 oraciones, pensada para que buscadores y asistentes de IA puedan citarla. */
  lead: string;
  sections: LandingSection[];
  faqs: LandingFaq[];
  related: string[];
};

export const landingPages: LandingPage[] = [
  {
    slug: "psicologo-encarnacion",
    path: "/psicologo-encarnacion",
    name: "Psicólogo en Encarnación",
    metaTitle: "Psicólogo en Encarnación, Paraguay | Terapia psicológica",
    metaDescription: "{{nombre}}, psicólogo en Encarnación ({{matricula}}). Terapia cognitivo-conductual y basada en evidencia, {{modalidad}}. Turnos por WhatsApp.",
    h1: "Psicólogo en Encarnación, Paraguay",
    lead: "Soy {{nombre}}, psicólogo ({{matricula}}), y acompaño procesos de terapia psicológica para adultos y adolescentes de Encarnación, Itapúa y de todo el país. {{atencion}} Trabajo con terapia cognitivo-conductual y enfoques de tercera generación, con intervenciones respaldadas por evidencia.",
    sections: [
      {
        heading: "Cuándo conviene consultar a un psicólogo",
        paragraphs: [
          "No hace falta estar en una crisis para pedir ayuda. Muchas personas consultan cuando algo que antes manejaban empieza a ocupar demasiado espacio: la preocupación que no se apaga, el ánimo que baja y no vuelve, el cansancio que el descanso no resuelve, o una pérdida que cuesta atravesar.",
          "Estos son los motivos de consulta más frecuentes en mi trabajo:",
        ],
        bullets: [
          "Ansiedad, preocupación constante, ataques de pánico, fobias y ansiedad social.",
          "Depresión, tristeza persistente y pérdida de interés o de energía.",
          "Estrés crónico, agotamiento laboral (burnout) y dificultades para dormir.",
          "Trauma, duelos y momentos de cambio vital.",
          "Dificultades emocionales y de conducta en la adolescencia.",
        ],
      },
      {
        heading: "Cómo trabajo",
        paragraphs: [
          "Empiezo por entender qué te pasa, desde cuándo, qué lo mantiene y qué ya intentaste. Con esa información armamos juntos una formulación del caso: una explicación en lenguaje claro de tu situación, que se revisa a medida que aparece información nueva.",
          "A partir de ahí definimos objetivos concretos y elegimos las herramientas con mejor respaldo para lo que consultás, principalmente terapia cognitivo-conductual, terapia de aceptación y compromiso y habilidades de terapia dialéctico-conductual. Entre sesiones hay tareas cortas y materiales para practicar lo trabajado, y a mitad del proceso revisamos juntos si estás mejorando en lo que elegiste como meta.",
          "La psicoterapia tiene un respaldo de investigación sólido para muchos cuadros, pero la respuesta varía de persona a persona. Por eso no prometo resultados: me comprometo a un método claro, a medir el avance y a decirte con franqueza cuando algo no esté funcionando.",
        ],
      },
      {
        heading: "Cómo es la primera sesión",
        paragraphs: [
          "La primera sesión sirve para conocernos y ordenar el motivo de consulta. Conversamos sobre tu historia, tu momento actual y lo que esperás de la terapia; también te explico cómo trabajo, cómo cuidamos tu confidencialidad y cuáles son sus límites, por ejemplo cuando hay un riesgo serio para vos o para otras personas.",
          "Antes de empezar firmás un consentimiento informado, y al terminar la sesión te cuento qué plan de trabajo propongo para una primera etapa.",
        ],
      },
      {
        heading: "Atención desde Encarnación",
        paragraphs: [
          "{{atencion}} Las sesiones se agendan en horarios acordados de antemano, con recordatorio previo y la posibilidad de reprogramar según las condiciones del consultorio. Podés ver la disponibilidad y los planes en la página de inicio y en Planes de atención.",
        ],
      },
      {
        heading: "Si estás en una situación de riesgo",
        paragraphs: [
          "Esta página y el WhatsApp del consultorio no son un servicio de emergencia. Si pensás en hacerte daño o hay riesgo inmediato para tu vida o la de otra persona, no esperes una respuesta por mensaje: llamá al 911 o acudí a la guardia del hospital más cercano.",
        ],
      },
    ],
    faqs: [
      {
        question: "¿Cómo pido turno con un psicólogo en Encarnación?",
        answer: "Escribime por WhatsApp al {{whatsapp}} o solicitá turno desde la página de inicio. Coordinamos una primera sesión y te confirmo día, hora y modalidad.",
      },
      {
        question: "¿Qué diferencia hay entre un psicólogo y un psiquiatra?",
        answer: "El psicólogo trabaja con psicoterapia: evalúa, explica y entrena herramientas para cambiar pensamientos, emociones y conductas. El psiquiatra es un médico especialista que puede indicar medicación. Muchas personas se benefician de la coordinación entre ambos, y cuando corresponde te oriento para una consulta psiquiátrica.",
      },
      {
        question: "¿Necesito una derivación médica para empezar?",
        answer: "No. Podés consultar directamente. Si durante la evaluación aparece algo que requiere una mirada médica, te lo explico y te ayudo a derivarte.",
      },
      {
        question: "¿Lo que cuento es confidencial?",
        answer: "Sí. La confidencialidad es parte del encuadre y se explica en la primera sesión junto con sus límites, que se aplican solo cuando existe un riesgo serio e inminente para la persona o para terceros.",
      },
      {
        question: "¿Atendés a adolescentes?",
        answer: "Sí, con la participación de una persona adulta responsable en el inicio del proceso. Podés leer cómo trabajo en la página sobre psicólogo para adolescentes en Encarnación.",
      },
    ],
    related: ["terapia-psicologica-online-paraguay", "psicologo-adolescentes-encarnacion"],
  },
  {
    slug: "terapia-psicologica-online-paraguay",
    path: "/terapia-psicologica-online-paraguay",
    name: "Terapia psicológica online en Paraguay",
    metaTitle: "Terapia psicológica online en Paraguay | Videollamada",
    metaDescription: "Terapia psicológica por videollamada en todo Paraguay con {{nombre}} ({{matricula}}). Mismo marco clínico y confidencial que en consultorio.",
    h1: "Terapia psicológica online en Paraguay",
    lead: "La terapia psicológica online es la atención con un psicólogo por videollamada, con el mismo marco clínico, ético y confidencial que una consulta en persona. Soy {{nombre}} ({{matricula}}) y atiendo por videollamada a personas de Encarnación y de cualquier punto de Paraguay.",
    sections: [
      {
        heading: "Cómo funciona una sesión por videollamada",
        paragraphs: [
          "Coordinamos el turno por WhatsApp o desde la página. Antes de cada sesión recibís el enlace de la videollamada y un recordatorio. Solo necesitás un celular, una tablet o una computadora con cámara y micrófono, conexión a internet estable y un lugar donde puedas hablar con tranquilidad.",
          "La estructura es la misma que en persona: evaluación inicial, objetivos, trabajo con herramientas concretas y revisión periódica del progreso. Entre sesiones podés usar ejercicios y materiales de apoyo desde tu espacio de paciente.",
        ],
      },
      {
        heading: "Qué dice la evidencia sobre la terapia online",
        paragraphs: [
          "La investigación sobre psicoterapia por videollamada muestra, para varios cuadros frecuentes como la ansiedad y la depresión, resultados comparables a los de la atención presencial. Eso no significa que sirva para todas las personas ni para todas las situaciones: depende del motivo de consulta, de las condiciones en las que se hace y de cómo te sentís con el formato.",
          "En la primera sesión evaluamos juntos si esta modalidad te conviene. Si en algún momento no lo fuera, te lo digo y buscamos otra alternativa.",
        ],
      },
      {
        heading: "Ventajas y límites",
        bullets: [
          "Ventaja: atención desde cualquier ciudad de Paraguay, sin traslados y con horarios más flexibles.",
          "Ventaja: continuidad del proceso si cambiás de domicilio o viajás.",
          "Límite: requiere un espacio privado y una conexión razonablemente estable.",
          "Límite: no es el formato adecuado para situaciones de riesgo inmediato, que necesitan atención presencial urgente.",
          "Límite: algunas evaluaciones o intervenciones específicas pueden requerir una sesión en persona.",
        ],
      },
      {
        heading: "Para quién es y para quién puede no ser suficiente",
        paragraphs: [
          "La terapia por videollamada suele funcionar bien para adultos y adolescentes con ansiedad, estados de ánimo bajos, estrés sostenido, duelos o dificultades de relación, sobre todo cuando vivís lejos, tenés poco tiempo para trasladarte o necesitás sostener el proceso a pesar de los cambios de rutina.",
          "En cambio, puede no ser suficiente cuando hay riesgo para tu vida, síntomas graves que requieren una evaluación médica presencial o un entorno donde no podés hablar con privacidad. En esos casos te oriento hacia la atención que corresponde, y si hace falta combinamos el trabajo online con otros apoyos.",
        ],
      },
      {
        heading: "Cómo empezar en tres pasos",
        bullets: [
          "Escribime por WhatsApp contándome brevemente qué te gustaría trabajar.",
          "Coordinamos día y hora de la primera sesión, y recibís el enlace de la videollamada.",
          "En la primera sesión ordenamos el motivo de consulta, firmás el consentimiento informado y definimos el plan de la primera etapa.",
        ],
      },
      {
        heading: "Privacidad y datos",
        paragraphs: [
          "Los datos de tu espacio de paciente están protegidos con acceso individual y cifrado, y compartís con el profesional solo los registros que decidís compartir. La confidencialidad y sus límites se explican en la primera sesión.",
        ],
      },
      {
        heading: "Si estás en una situación de riesgo",
        paragraphs: [
          "La terapia online no reemplaza un servicio de emergencia. Si pensás en hacerte daño o hay riesgo inmediato para vos o para otra persona, llamá al 911 o acudí a la guardia del hospital más cercano.",
        ],
      },
    ],
    faqs: [
      {
        question: "¿La terapia por videollamada es válida y efectiva?",
        answer: "Para muchos motivos de consulta frecuentes, como ansiedad y depresión, la investigación muestra resultados comparables a los de la terapia presencial. Aun así, no es adecuada para todas las situaciones; lo evaluamos en la primera sesión.",
      },
      {
        question: "¿Qué necesito para tener una sesión online?",
        answer: "Un dispositivo con cámara y micrófono, internet estable y un lugar privado donde puedas hablar sin interrupciones. Recibís el enlace antes de cada sesión.",
      },
      {
        question: "¿Puedo hacer terapia online si vivo fuera de Encarnación?",
        answer: "Sí. La atención por videollamada está disponible para personas de cualquier punto de Paraguay.",
      },
      {
        question: "¿Mis datos están protegidos?",
        answer: "Sí. Tu espacio de paciente tiene acceso individual y cifrado, y compartís con el profesional solo los registros que decidís compartir. La confidencialidad y sus límites se explican en la primera sesión.",
      },
      {
        question: "¿Cómo pido turno?",
        answer: "Escribime por WhatsApp al {{whatsapp}} o solicitá turno desde la página de inicio.",
      },
    ],
    related: ["psicologo-encarnacion", "psicologo-adolescentes-encarnacion"],
  },
  {
    slug: "psicologo-adolescentes-encarnacion",
    path: "/psicologo-adolescentes-encarnacion",
    name: "Psicólogo para adolescentes en Encarnación",
    metaTitle: "Psicólogo para adolescentes en Encarnación | Terapia",
    metaDescription: "Terapia psicológica para adolescentes y acompañamiento a familias en Encarnación, {{modalidad}}. {{nombre}} ({{matricula}}). Turnos por WhatsApp.",
    h1: "Psicólogo para adolescentes en Encarnación",
    lead: "Atiendo adolescentes con un espacio propio para ellos y un trabajo cercano con la familia. Soy {{nombre}} ({{matricula}}), psicólogo con experiencia en salud mental adolescente, y combino terapia cognitivo-conductual y habilidades de regulación emocional adaptadas a la edad.",
    sections: [
      {
        heading: "Señales que justifican una consulta",
        paragraphs: [
          "La adolescencia trae cambios y altibajos esperables. Conviene consultar cuando algo se sostiene en el tiempo o empieza a afectar la vida cotidiana:",
        ],
        bullets: [
          "Tristeza, irritabilidad o desánimo que duran semanas.",
          "Ansiedad, miedos intensos, evitación de la escuela o de situaciones sociales.",
          "Cambios marcados en el sueño, el apetito o el rendimiento escolar.",
          "Aislamiento, conflictos frecuentes en casa o con pares, situaciones de acoso.",
          "Dificultad para manejar la rabia, los impulsos o el uso de pantallas.",
        ],
      },
      {
        heading: "Cómo es el proceso",
        paragraphs: [
          "La primera consulta incluye a la persona adulta responsable, para entender el motivo de consulta y firmar el consentimiento informado. Después el adolescente tiene su propio espacio de sesión, donde puede hablar con libertad. Con el adolescente trabajamos objetivos concretos y herramientas prácticas para manejar emociones y pensamientos, con materiales y ejercicios adaptados a su edad.",
          "A la familia le devuelvo orientaciones generales sobre el proceso y pautas para acompañar en casa, cuidando la confidencialidad de lo que el adolescente cuenta. Si se coordina con la escuela, el pediatra u otros profesionales, se hace siempre con autorización.",
        ],
      },
      {
        heading: "Qué trabajamos con el adolescente",
        paragraphs: [
          "Según el motivo de consulta, la terapia se enfoca en entender qué le pasa y qué mantiene el problema, y en practicar herramientas concretas que pueda usar fuera del consultorio.",
        ],
        bullets: [
          "Reconocer y regular emociones intensas, como la rabia, la angustia o la tristeza.",
          "Cambiar patrones de pensamiento que alimentan la ansiedad o el desánimo.",
          "Mejorar el sueño, la rutina y el uso de pantallas.",
          "Fortalecer habilidades para comunicarse, poner límites y resolver conflictos con la familia y los pares.",
        ],
      },
      {
        heading: "Qué puede hacer la familia",
        paragraphs: [
          "El acompañamiento de la familia influye en el proceso. Más que controlar, ayuda sostener rutinas previsibles, escuchar sin apurarse a resolver, validar lo que el adolescente siente aunque no se comparta su punto de vista y respetar su espacio de terapia. En las devoluciones trabajamos pautas concretas para cada hogar.",
        ],
      },
      {
        heading: "Confidencialidad y sus límites",
        paragraphs: [
          "Para que un adolescente pueda hablar, necesita saber que su espacio es de confianza. Eso se acuerda desde el inicio, junto con una excepción clara: si existe un riesgo serio para su vida, su integridad o la de otra persona, se informa a los adultos responsables para protegerlo.",
        ],
      },
      {
        heading: "Cuando hay riesgo",
        paragraphs: [
          "Si un adolescente se lastima, habla de querer morir o hay una situación de peligro, no esperes a un turno: llamá al 911 o acudí a la guardia del hospital más cercano, y después coordinamos el seguimiento. El WhatsApp del consultorio no es un servicio de emergencia.",
        ],
      },
      {
        heading: "Modalidad",
        paragraphs: ["{{atencion}}"],
      },
    ],
    faqs: [
      {
        question: "¿Cómo sé si mi hijo o hija necesita un psicólogo?",
        answer: "Si los cambios en su ánimo, su conducta, su sueño o su vida escolar se sostienen por varias semanas o le generan sufrimiento, vale la pena consultar. Una primera sesión sirve también para decidir si hace falta un proceso.",
      },
      {
        question: "¿Los padres reciben información de lo que cuenta el adolescente?",
        answer: "Reciben orientaciones generales sobre el proceso y pautas para acompañar en casa, pero no el detalle de las sesiones. La excepción es el riesgo serio para el adolescente o para terceros.",
      },
      {
        question: "Mi hijo o hija no quiere ir a terapia, ¿qué hago?",
        answer: "Es frecuente. Conviene explicarle para qué sirve, sin presión ni castigo, y ofrecerle una primera sesión para que pueda conocer el espacio. Podemos coordinar cómo presentárselo.",
      },
      {
        question: "¿Se puede hacer terapia con adolescentes por videollamada?",
        answer: "En muchos casos sí, siempre que haya un espacio privado y conexión estable. Lo evaluamos en la primera consulta.",
      },
      {
        question: "¿Cómo pido turno?",
        answer: "Escribime por WhatsApp al {{whatsapp}} o solicitá turno desde la página de inicio.",
      },
    ],
    related: ["psicologo-encarnacion", "terapia-psicologica-online-paraguay"],
  },
];

export function landingPageBySlug(slug: string): LandingPage | undefined {
  return landingPages.find((p) => p.slug === slug);
}

export type LandingContext = { nombre: string; matricula: string; whatsapp: string; mode: ModalityMode; country: string };

/** Frase de modalidad en primera persona (páginas del sitio) o tercera (resúmenes sobre el profesional). */
export function attentionSentence(mode: ModalityMode, country: string, person: "first" | "third" = "first"): string {
  const verb = person === "first" ? "Atiendo" : "Atiende";
  if (mode === "online") return `La atención es por videollamada, desde Encarnación y para todo ${country}.`;
  if (mode === "presencial") return `${verb} en consultorio, en Encarnación.`;
  return `${verb} en Encarnación y por videollamada para todo ${country}.`;
}

/** Reemplaza los marcadores {{...}} del contenido con los datos reales de Configuración. */
export function fill(text: string, ctx: LandingContext): string {
  const values: Record<string, string> = {
    nombre: ctx.nombre,
    matricula: ctx.matricula,
    whatsapp: ctx.whatsapp,
    modalidad: modalityPhrase(ctx.mode),
    atencion: attentionSentence(ctx.mode, ctx.country),
  };
  return text.replace(/\{\{(\w+)\}\}/g, (_, key: string) => values[key] ?? "");
}
