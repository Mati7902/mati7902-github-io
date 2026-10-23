/**
 * Formación complementaria y publicaciones de "Sobre mí". Cada certificado enlaza a la
 * verificación pública del emisor y cada artículo, a su DOI.
 */
export type Certificate = { title: string; issuer: string; platform: string; date: string; verifyUrl: string };
export type Publication = { title: string; authors: string; journal: string; year: number; doi: string };

export const CERTIFICATES: Certificate[] = [
  {
    title: "Fundamentals of Neuroscience, Part 1: The Electrical Properties of the Neuron",
    issuer: "Harvard University (HarvardX)",
    platform: "edX",
    date: "Julio 2024",
    verifyUrl: "https://courses.edx.org/certificates/6ee90c54486c4a4ea3048fd2ba6e7031",
  },
  {
    title: "Fundamentals of Neuroscience, Part 2: Neurons and Networks",
    issuer: "Harvard University (HarvardX)",
    platform: "edX",
    date: "Octubre 2024",
    verifyUrl: "https://courses.edx.org/certificates/703b39b54202458f91a5302f2ff248c0",
  },
  {
    title: "Fundamentals of Neuroscience, Part 3: The Brain",
    issuer: "Harvard University (HarvardX)",
    platform: "edX",
    date: "Octubre 2024",
    verifyUrl: "https://courses.edx.org/certificates/34b661d36fa64f9a9ce97b2c4dba1a43",
  },
  {
    title: "Introduction to Cognitive Psychology and Neuropsychology",
    issuer: "University of Cambridge, Institute of Continuing Education",
    platform: "edX",
    date: "Junio 2024",
    verifyUrl: "https://courses.edx.org/certificates/ab9a12405ffc4e538762dd96577ec84a",
  },
  {
    title: "Especialización en Neurociencia y Neuroimagen (4 cursos: neurociencia para neuroimagen, principios de fMRI 1 y 2, neurohacking en R)",
    issuer: "Johns Hopkins University",
    platform: "Coursera",
    date: "Julio 2023",
    verifyUrl: "https://www.coursera.org/account/accomplishments/specialization/5Z95H5KC5FDT",
  },
];

export const PUBLICATIONS: Publication[] = [
  {
    title: "Perfil epidemiológico descriptivo de pacientes psiquiátricos atendidos en el Hospital Regional de Encarnación, Paraguay, 2023: estudio observacional de corte transversal",
    authors: "Sánchez Matthias, M. E. y Rolón Wilcke, A. J.",
    journal: "MEDciencia (Universidad Nacional de Itapúa), 4(1)",
    year: 2026,
    doi: "10.70833/medciencia4num1art897",
  },
  {
    title: "Neurobiología de la violencia y la agresión: efectos de la adversidad temprana en el cerebro humano y la salud mental",
    authors: "Sánchez-Matthias, M. E., Insaurralde, A. D. y Cáceres, C.",
    journal: "Anales de la Facultad de Ciencias Médicas (Asunción), 58(3)",
    year: 2025,
    doi: "10.18004/anales/2025.058.03.103",
  },
];
