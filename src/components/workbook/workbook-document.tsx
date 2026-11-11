import { RichText } from "@/components/exercises/rich-text";
import type { ExerciseStep } from "@/lib/exercises/steps";
import type { WorkbookContent } from "@/lib/workbook/rules";

type Props = {
  content: WorkbookContent;
  firstName: string;
  dateLabel: string;
  professional: { name: string; title: string; license: string };
  /** Pasos de cada plantilla, por slug, para armar las hojas de trabajo. */
  steps: Record<string, ExerciseStep[]>;
};

const Lines = ({ n }: { n: number }) => (
  <div className="wb-lines" aria-hidden>
    {Array.from({ length: n }, (_, i) => (
      <span key={i} />
    ))}
  </div>
);

function Worksheet({ step }: { step: ExerciseStep }) {
  switch (step.type) {
    case "info":
    case "timed_info":
      return (
        <div className="wb-info">
          {step.title ? <h4>{step.title}</h4> : null}
          <RichText text={step.content} />
        </div>
      );
    case "text":
      return (
        <div className="wb-q">
          <p>{step.prompt}</p>
          <Lines n={4} />
        </div>
      );
    case "list":
      return (
        <div className="wb-q">
          <p>{step.prompt}</p>
          <ol className="wb-list">
            {Array.from({ length: step.count }, (_, i) => (
              <li key={i}>
                <span />
              </li>
            ))}
          </ol>
        </div>
      );
    case "scale":
      return (
        <div className="wb-q">
          <p>{step.prompt}</p>
          <div className="wb-scale">
            {Array.from({ length: step.max - step.min + 1 }, (_, i) => (
              <span key={i}>{step.min + i}</span>
            ))}
          </div>
          {step.min_label || step.max_label ? (
            <p className="wb-scale-labels">
              <span>{step.min_label}</span>
              <span>{step.max_label}</span>
            </p>
          ) : null}
        </div>
      );
    case "choice":
    case "checklist":
      return (
        <div className="wb-q">
          <p>{step.prompt}</p>
          <ul className="wb-options">
            {step.options.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>
        </div>
      );
    case "emotion":
      return (
        <div className="wb-q">
          <p>{step.prompt}</p>
          <Lines n={2} />
        </div>
      );
    case "reflect":
      return (
        <div className="wb-q">
          <p>{step.title ?? "Para cerrar"}</p>
          <Lines n={3} />
        </div>
      );
    default:
      return null;
  }
}

/**
 * Cuadernillo en formato imprimible (Guardar como PDF desde el navegador). Sale del mismo
 * contenido que la versión digital. La portada lleva solo nombre de pila y fecha.
 */
export function WorkbookDocument({ content, firstName, dateLabel, professional, steps }: Props) {
  return (
    <article className="wb-doc">
      <style>{WB_CSS}</style>
      <section className="wb-page wb-cover">
        <p className="wb-eyebrow">Cuadernillo de trabajo</p>
        <h1>{firstName}</h1>
        <p className="wb-date">{dateLabel}</p>
        <p className="wb-pro">
          {professional.name}
          <br />
          {professional.title} · {professional.license}
        </p>
      </section>

      <section className="wb-page">
        <h2>Bienvenida</h2>
        <p>{content.welcome}</p>
        <h3>Cómo usar este cuadernillo</h3>
        <ul>
          <li>Hacé una actividad por vez, a tu ritmo. Cada una lleva unos minutos.</li>
          <li>No hay respuestas correctas ni incorrectas. Escribí como te salga.</li>
          <li>Traelo a cada sesión: lo que anotes nos ayuda a ver qué te sirve.</li>
          <li>También podés hacer las actividades en la app, en Ejercicios › Mi cuadernillo.</li>
        </ul>
        {content.goals.length ? (
          <>
            <h3>Lo que querés lograr</h3>
            <ul>
              {content.goals.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
          </>
        ) : null}
        <h3>Actividades</h3>
        <ol>
          {content.items.map((i) => (
            <li key={i.slug}>
              {i.title}
              {i.minutes ? ` · ${i.minutes} min` : ""}
            </li>
          ))}
        </ol>
      </section>

      {content.items.map((item, n) => (
        <section key={item.slug} className="wb-page">
          <p className="wb-eyebrow">Actividad {n + 1}</p>
          <h2>{item.title}</h2>
          {item.note ? <p className="wb-note">{item.note}</p> : null}
          {(steps[item.slug] ?? []).map((s) => (
            <Worksheet key={s.id} step={s} />
          ))}
          {(steps[item.slug] ?? []).length === 0 ? (
            <div className="wb-q">
              <p>Esta práctica es guiada: hacela en la app. Anotá cómo te fue:</p>
              <Lines n={5} />
            </div>
          ) : null}
        </section>
      ))}

      <section className="wb-page">
        <h2>Registro emocional de la semana</h2>
        <table className="wb-table">
          <thead>
            <tr>
              <th>Día</th>
              <th>Situación</th>
              <th>Emoción (0-10)</th>
              <th>Qué hice</th>
            </tr>
          </thead>
          <tbody>
            {["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"].map((d) => (
              <tr key={d}>
                <td>{d}</td>
                <td />
                <td />
                <td />
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="wb-page">
        <h2>Reflexión semanal y próxima sesión</h2>
        <div className="wb-q">
          <p>¿Qué aprendí esta semana?</p>
          <Lines n={4} />
        </div>
        <div className="wb-q">
          <p>¿Qué me costó? ¿Qué me ayudó?</p>
          <Lines n={4} />
        </div>
        <div className="wb-q">
          <p>Lo que quiero hablar en la próxima sesión</p>
          <Lines n={4} />
        </div>
        <p className="wb-closing">{content.closing}</p>
        <p className="wb-crisis">Si en algún momento sentís que estás en peligro, no esperes a la sesión: usá «Calmarme» en la app o pedí ayuda de urgencia.</p>
      </section>
    </article>
  );
}

const WB_CSS = `
.wb-doc { --ink:#14303a; --soft:#5b7078; --line:#c9d3d1; --accent:#1f5563; color:var(--ink); font-family: Georgia, "Times New Roman", serif; max-width: 800px; margin: 0 auto; }
.wb-doc h1, .wb-doc h2, .wb-doc h3, .wb-doc h4 { font-weight: 600; color: var(--ink); }
.wb-page { padding: 32px 8px; border-bottom: 1px dashed var(--line); font-family: ui-sans-serif, system-ui, sans-serif; font-size: 15px; line-height: 1.6; }
.wb-page h2 { font-family: Georgia, serif; font-size: 26px; margin: 0 0 12px; }
.wb-page h3 { font-size: 17px; margin: 20px 0 6px; }
.wb-page ul, .wb-page ol { padding-left: 20px; }
.wb-eyebrow { text-transform: uppercase; letter-spacing: .12em; font-size: 11px; color: var(--accent); font-weight: 600; margin: 0 0 6px; }
.wb-cover { min-height: 520px; display: flex; flex-direction: column; justify-content: center; text-align: center; }
.wb-cover h1 { font-family: Georgia, serif; font-size: 48px; margin: 8px 0; }
.wb-date { color: var(--soft); }
.wb-pro { margin-top: 64px; color: var(--soft); font-size: 14px; }
.wb-note { background: #eef4f3; border-radius: 8px; padding: 8px 12px; }
.wb-info { margin: 12px 0; } .wb-info h4 { margin: 0 0 4px; font-size: 15px; }
.wb-q { margin: 16px 0; break-inside: avoid; } .wb-q > p { font-weight: 600; margin: 0 0 6px; }
.wb-lines span { display: block; height: 28px; border-bottom: 1px solid var(--line); }
.wb-list li span { display: inline-block; width: 92%; height: 26px; border-bottom: 1px solid var(--line); vertical-align: bottom; }
.wb-scale { display: flex; gap: 6px; flex-wrap: wrap; } .wb-scale span { width: 30px; height: 30px; border: 1px solid var(--line); border-radius: 50%; display: grid; place-items: center; font-size: 12px; }
.wb-scale-labels { display: flex; justify-content: space-between; font-size: 12px; color: var(--soft); max-width: 400px; }
.wb-options { list-style: none; padding-left: 0; } .wb-options li::before { content: "☐  "; }
.wb-table { width: 100%; border-collapse: collapse; font-size: 13px; } .wb-table th, .wb-table td { border: 1px solid var(--line); padding: 6px; text-align: left; height: 54px; vertical-align: top; } .wb-table th { height: auto; background: #eef4f3; }
.wb-closing { margin-top: 24px; font-style: italic; }
.wb-crisis { margin-top: 16px; font-size: 13px; color: var(--soft); border-top: 1px solid var(--line); padding-top: 8px; }
@media print {
  @page { size: A4; margin: 18mm 16mm; @bottom-center { content: counter(page); font-size: 10px; color: #5b7078; } }
  body { background: #fff !important; }
  .wb-noprint { display: none !important; }
  .wb-page { border: 0; padding: 0; break-after: page; }
  .wb-page:last-child { break-after: auto; }
  .wb-cover { min-height: 240mm; }
}
`;
