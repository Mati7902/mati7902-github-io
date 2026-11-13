/**
 * Hábitos que cuidan la salud mental: movimiento, descanso y alimentación.
 * Cada pilar tiene un artículo didáctico (con referencias verificables), una rutina básica en dos
 * niveles y un registro diario que suma en Mi Progreso. El contenido es psicoeducación general:
 * no reemplaza la indicación médica ni nutricional individual.
 */

export type PillarKey = "movimiento" | "descanso" | "alimentacion";

export type Habit = {
  id: string;
  title: string;
  detail: string;
  /** Meta sugerida de días por semana. */
  perWeek: number;
};

export type Pillar = {
  key: PillarKey;
  title: string;
  tagline: string;
  /** Artículo: bajada, secciones (texto con párrafos, viñetas «- » y **negrita**) y referencias. */
  article: { lead: string; sections: { title: string; body: string }[]; references: { text: string; url: string }[] };
  routine: { level: string; description: string; habits: Habit[] }[];
  safety: string;
};

export const PILLARS: Pillar[] = [
  {
    key: "movimiento",
    title: "Movimiento",
    tagline: "El ejercicio es una de las herramientas con más evidencia para el ánimo y la ansiedad.",
    article: {
      lead: "Moverse no es solo cuidar el cuerpo. Es una de las intervenciones más estudiadas para la salud mental, con efectos comparables a los de otros tratamientos cuando se sostiene en el tiempo.",
      sections: [
        {
          title: "Qué dice la ciencia",
          body: `Una revisión de revisiones publicada en 2023 en el British Journal of Sports Medicine reunió 97 revisiones con más de 1.000 ensayos y 128.000 participantes. La actividad física redujo los síntomas de **depresión** y de **ansiedad** con un efecto moderado, y el beneficio fue mayor con intensidades moderadas a altas y en programas de hasta 12 semanas.

Un metaanálisis de 2024 en el BMJ, que comparó distintos tipos de ejercicio en personas con depresión, encontró beneficios con **caminar o trotar, el yoga y el entrenamiento de fuerza**, entre otros. No hace falta un tipo "perfecto": sirve el que puedas sostener.

La Organización Mundial de la Salud recomienda para adultos entre **150 y 300 minutos semanales** de actividad moderada (o 75 a 150 de actividad intensa) y ejercicios de fuerza al menos **2 días por semana**. También aclara algo clave: **algo de actividad es mejor que nada**.`,
        },
        {
          title: "Por qué funciona",
          body: `- **Química del ánimo:** el ejercicio modifica neurotransmisores relacionados con el ánimo y la motivación, y aumenta factores que favorecen la plasticidad del cerebro.
- **Regula el estrés:** entrenar es un estrés breve y controlado; con la práctica, el cuerpo aprende a recuperarse más rápido.
- **Mejora el sueño:** quienes se mueven durante el día suelen dormir mejor, y dormir mejor protege el ánimo.
- **Rompe el círculo de la inactividad:** en la depresión, hacer menos lleva a sentirse peor. Moverse es una forma de **activación conductual**: la acción va primero y el ánimo sigue después.
- **Sensación de logro:** cumplir una meta pequeña da evidencia concreta de que podés.`,
        },
        {
          title: "Qué no promete",
          body: `El ejercicio no reemplaza la terapia ni la medicación cuando están indicadas: las complementa. Los resultados aparecen con **constancia**, no en una sesión. Y si un día no podés, no se pierde lo logrado: retomar también cuenta.`,
        },
      ],
      references: [
        { text: "Singh B, et al. Effectiveness of physical activity interventions for improving depression, anxiety and distress: an overview of systematic reviews. Br J Sports Med. 2023.", url: "https://bjsm.bmj.com/content/bjsports/early/2023/07/11/bjsports-2022-106195.full.pdf" },
        { text: "Noetel M, et al. Effect of exercise for depression: systematic review and network meta-analysis of randomised controlled trials. BMJ. 2024;384:e075847.", url: "https://www.bmj.com/content/384/bmj-2023-075847" },
        { text: "Bull FC, et al. World Health Organization 2020 guidelines on physical activity and sedentary behaviour. Br J Sports Med. 2020.", url: "https://pmc.ncbi.nlm.nih.gov/articles/7719906/" },
      ],
    },
    routine: [
      {
        level: "Para empezar",
        description: "Pocas semanas, metas chicas. Lo importante es sostenerlo.",
        habits: [
          { id: "mov-caminar-10", title: "Caminar 10 a 15 minutos", detail: "A paso que te permita hablar, pero no cantar. Puede ser en dos tramos.", perWeek: 4 },
          { id: "mov-pausas", title: "Cortar el tiempo sentado", detail: "Levantarte y moverte 2 a 3 minutos cada hora que estés sentado.", perWeek: 5 },
          { id: "mov-estirar", title: "Estirar 5 minutos", detail: "Cuello, hombros, espalda y piernas, respirando lento.", perWeek: 3 },
        ],
      },
      {
        level: "Para avanzar",
        description: "Cuando lo inicial ya sale casi solo.",
        habits: [
          { id: "mov-caminar-30", title: "Caminar rápido o trotar 30 minutos", detail: "Sumando la semana, te acercás a los 150 minutos que recomienda la OMS.", perWeek: 5 },
          { id: "mov-fuerza", title: "Fuerza 20 minutos", detail: "Sentadillas, flexiones apoyando las rodillas, puente de glúteos y remo con botellas. 2 a 3 series de 8 a 12 repeticiones.", perWeek: 2 },
          { id: "mov-yoga", title: "Yoga o movilidad 20 minutos", detail: "Un video guiado para principiantes alcanza.", perWeek: 2 },
        ],
      },
    ],
    safety: "Si tenés una enfermedad del corazón, presión alta no controlada, dolor en el pecho, mareos al hacer esfuerzo, estás embarazada o tomás medicación que afecte el corazón, consultá a tu médico antes de aumentar la intensidad. Si sentís dolor o falta de aire fuera de lo normal, pará.",
  },
  {
    key: "descanso",
    title: "Descanso",
    tagline: "Dormir mejor mejora el ánimo, la ansiedad y la forma en que pensamos.",
    article: {
      lead: "Sueño y salud mental van en las dos direcciones: cuando estamos mal dormimos peor, y cuando dormimos mal todo se siente más difícil. La buena noticia es que mejorar el sueño mejora la salud mental.",
      sections: [
        {
          title: "Qué dice la ciencia",
          body: `Un metaanálisis de 65 ensayos con más de 8.600 personas, publicado en 2021 en Sleep Medicine Reviews, mostró que **mejorar el sueño reduce la depresión, la ansiedad, la rumiación y el estrés**, con efectos moderados. Además encontró una relación de dosis: **cuanto más mejoraba el sueño, más mejoraba la salud mental**.

Las pautas de higiene del sueño por sí solas tienen un efecto pequeño a moderado. Funcionan mejor **como parte de un plan** que incluye horarios regulares, manejo de las preocupaciones y, cuando hay insomnio, la terapia cognitivo-conductual para el insomnio (TCC-I), que es el tratamiento de primera elección.`,
        },
        {
          title: "Por qué funciona",
          body: `- **Regula las emociones:** durante el sueño el cerebro procesa lo vivido. Con poco sueño reaccionamos más fuerte a lo negativo y nos cuesta más calmarnos.
- **Ordena el reloj interno:** acostarte y levantarte a la misma hora y recibir luz natural a la mañana sincronizan el ritmo de sueño y vigilia.
- **Baja la activación:** una rutina tranquila antes de dormir le avisa al cuerpo que es momento de bajar el ritmo.
- **Rompe la asociación cama-desvelo:** usar la cama solo para dormir ayuda a que el cuerpo vuelva a asociarla con dormirse.`,
        },
        {
          title: "Qué no promete",
          body: `Una mala noche no arruina tu semana: el cuerpo compensa. Si el insomnio dura más de tres meses, roncás fuerte o te despertás ahogándote, o tenés mucho sueño de día, hablalo en sesión o con tu médico: puede necesitar otra evaluación.`,
        },
      ],
      references: [
        { text: "Scott AJ, et al. Improving sleep quality leads to better mental health: a meta-analysis of randomised controlled trials. Sleep Med Rev. 2021;60:101556.", url: "https://pubmed.ncbi.nlm.nih.gov/34607184/" },
        { text: "Chung KF, et al. Sleep hygiene education as a treatment of insomnia: a systematic review and meta-analysis. Fam Pract. 2018;35(4):365-375.", url: "https://pubmed.ncbi.nlm.nih.gov/29194467/" },
      ],
    },
    routine: [
      {
        level: "Para empezar",
        description: "Lo que más impacto tiene: horarios y luz.",
        habits: [
          { id: "des-horario", title: "Levantarme a la misma hora", detail: "También el fin de semana (con una diferencia de una hora como máximo).", perWeek: 6 },
          { id: "des-luz", title: "Luz natural a la mañana", detail: "10 a 15 minutos afuera o junto a una ventana, en la primera hora del día.", perWeek: 5 },
          { id: "des-pantallas", title: "Sin pantallas 30 minutos antes de dormir", detail: "Cambiá el celular por leer, música tranquila o una respiración guiada.", perWeek: 5 },
        ],
      },
      {
        level: "Para avanzar",
        description: "Ajustes que suman cuando lo básico ya está.",
        habits: [
          { id: "des-cafeina", title: "Sin cafeína después de las 14 h", detail: "Incluye café, mate, tereré con yerba, té negro, gaseosas cola y bebidas energizantes.", perWeek: 5 },
          { id: "des-rutina", title: "Rutina para bajar el ritmo", detail: "20 minutos de lo mismo cada noche: luces bajas, ducha tibia, respiración o lectura.", perWeek: 5 },
          { id: "des-cama", title: "Cama solo para dormir", detail: "Si no te dormís en unos 20 minutos, levantate a otro lugar con luz baja y volvé cuando tengas sueño.", perWeek: 5 },
        ],
      },
    ],
    safety: "Si tomás medicación para dormir, no la cambies ni la dejes por tu cuenta: hablalo con quien te la indicó.",
  },
  {
    key: "alimentacion",
    title: "Alimentación",
    tagline: "Lo que comemos también influye en cómo nos sentimos.",
    article: {
      lead: "La relación entre la alimentación y la salud mental es un campo de investigación nuevo y en crecimiento. No se trata de dietas estrictas: se trata de comer de forma regular y variada.",
      sections: [
        {
          title: "Qué dice la ciencia",
          body: `En el ensayo **SMILES** (2017), adultos con depresión que mejoraron su alimentación con el acompañamiento de una nutricionista, siguiendo un patrón tipo mediterráneo, mejoraron más que quienes recibieron solo apoyo social: un tercio alcanzó la remisión frente al 8 % del otro grupo. Fue un estudio pequeño y necesita confirmarse, pero abrió el camino.

Un metaanálisis de 16 ensayos (2019) encontró que **mejorar la alimentación reduce los síntomas depresivos** con un efecto pequeño. En ansiedad no se vio un efecto claro.

En resumen: la alimentación **suma**, sobre todo como parte de un plan que incluya movimiento, descanso y terapia.`,
        },
        {
          title: "Por qué funciona",
          body: `- **Energía estable:** comer en horarios regulares evita bajones de energía que se confunden con desánimo o irritabilidad.
- **Intestino y cerebro:** la fibra de verduras, frutas, legumbres y cereales integrales alimenta a la flora intestinal, que se comunica con el cerebro.
- **Inflamación:** los patrones ricos en vegetales, legumbres, pescado y aceite de oliva se asocian con menos inflamación, relacionada con la depresión.
- **Autocuidado:** preparar y elegir la comida es una forma concreta de cuidarte.`,
        },
        {
          title: "Qué no promete",
          body: `Ningún alimento cura la depresión ni la ansiedad. Acá **no se cuentan calorías ni se busca bajar de peso**. Si tenés una relación difícil con la comida (atracones, restricción, culpa al comer, vómitos), estas pautas no son para vos: lo trabajamos en sesión.`,
        },
      ],
      references: [
        { text: "Jacka FN, et al. A randomised controlled trial of dietary improvement for adults with major depression (the SMILES trial). BMC Med. 2017;15:23.", url: "https://bmcmedicine.biomedcentral.com/articles/10.1186/s12916-017-0791-y" },
        { text: "Firth J, et al. The effects of dietary improvement on symptoms of depression and anxiety: a meta-analysis of randomized controlled trials. Psychosom Med. 2019;81(3):265-280.", url: "https://researchers.westernsydney.edu.au/en/publications/the-effects-of-dietary-improvement-on-symptoms-of-depression-and-/" },
      ],
    },
    routine: [
      {
        level: "Para empezar",
        description: "Regularidad antes que perfección.",
        habits: [
          { id: "ali-horarios", title: "Comidas en horarios regulares", detail: "Desayuno, almuerzo y cena sin saltear comidas largas.", perWeek: 5 },
          { id: "ali-verduras", title: "Verduras o frutas en dos comidas", detail: "Cualquier forma vale: ensalada, sopa, al horno o una fruta de postre.", perWeek: 5 },
          { id: "ali-agua", title: "Tomar agua durante el día", detail: "Tené una botella a mano; el tereré con agua sola también cuenta.", perWeek: 5 },
        ],
      },
      {
        level: "Para avanzar",
        description: "Sumar alimentos que protegen.",
        habits: [
          { id: "ali-legumbres", title: "Legumbres", detail: "Porotos, lentejas o garbanzos en una comida.", perWeek: 3 },
          { id: "ali-pescado", title: "Pescado o frutos secos", detail: "Pescado, o un puñado de maní o nueces sin sal.", perWeek: 2 },
          { id: "ali-atento", title: "Comer sin pantallas", detail: "Una comida al día prestando atención a lo que comés y a cómo te sentís.", perWeek: 4 },
        ],
      },
    ],
    safety: "Si tenés diabetes, una enfermedad renal o cardíaca, alergias o una indicación nutricional, seguí lo que te indicó tu médico o nutricionista.",
  },
];

export const pillarByKey = (key: string) => PILLARS.find((p) => p.key === key);
export const habitById = (id: string) => {
  for (const p of PILLARS) for (const r of p.routine) for (const h of r.habits) if (h.id === id) return { habit: h, pillar: p };
  return undefined;
};
export const ALL_HABIT_IDS = PILLARS.flatMap((p) => p.routine.flatMap((r) => r.habits.map((h) => h.id)));
