import { CalendarCheck, Clock, Lock, MapPin, RefreshCw, Video, type LucideIcon } from "lucide-react";

type Props = {
  durationMinutes: number;
  presencial: boolean;
  virtual: boolean;
  allowCancel: boolean;
  allowReschedule: boolean;
  cancelMinHours: number;
};

/**
 * «Tu primera consulta»: lo que la persona se pregunta antes de pedir el primer turno. Los datos
 * (duración, modalidades, plazo para cancelar) salen de la configuración real de la agenda.
 */
export function FirstVisitSection({ durationMinutes, presencial, virtual, allowCancel, allowReschedule, cancelMinHours }: Props) {
  const items: { icon: LucideIcon; title: string; text: string }[] = [
    {
      icon: CalendarCheck,
      title: "Cómo pido el turno",
      text: "Elegís un horario disponible acá abajo, en «Solicitar turno», o escribís por WhatsApp. Te llega la confirmación y un recordatorio antes de la sesión.",
    },
    {
      icon: Clock,
      title: "Qué pasa en la primera sesión",
      text: `Dura alrededor de ${durationMinutes} minutos. Es un espacio para conocernos: me contás qué te trae y qué te gustaría lograr, y pensamos juntos cómo seguir. No hace falta preparar nada.`,
    },
    presencial && virtual
      ? { icon: MapPin, title: "Presencial u online", text: "Podés venir al consultorio o hacerla por videollamada. Si es online, el enlace te aparece en la app el día de la sesión." }
      : virtual
        ? { icon: Video, title: "Online", text: "Es por videollamada. El enlace te aparece en la app el día de la sesión; solo necesitás un lugar tranquilo y buena conexión." }
        : { icon: MapPin, title: "En el consultorio", text: "Te espero en el consultorio. La dirección y cómo llegar están en la confirmación del turno." },
    {
      icon: RefreshCw,
      title: "Si no podés ir",
      text:
        allowCancel || allowReschedule
          ? `Podés ${[allowReschedule ? "cambiar" : null, allowCancel ? "cancelar" : null].filter(Boolean).join(" o ")} el turno desde la app${cancelMinHours > 0 ? ` hasta ${cancelMinHours} horas antes` : ""}. Así ese horario le queda a otra persona.`
          : "Avisame lo antes posible por WhatsApp y buscamos otro horario.",
    },
    {
      icon: Lock,
      title: "Confidencialidad",
      text: "Lo que hablamos queda entre nosotros. En la primera sesión te explico cómo se cuida tu información y cuáles son sus límites.",
    },
  ];
  return (
    <section id="primera-consulta" className="scroll-mt-20">
      <div className="mx-auto max-w-6xl px-5 py-20 lg:px-8">
        <p className="text-sm font-medium uppercase tracking-wider text-accent-strong">Tu primera consulta</p>
        <h2 className="mt-3 max-w-2xl font-display text-3xl font-medium text-balance sm:text-4xl">Lo que conviene saber antes de empezar</h2>
        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => (
            <li key={it.title} className="flex gap-4 rounded-3xl border border-border/70 bg-card p-6">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <it.icon className="size-5" aria-hidden />
              </span>
              <div className="min-w-0 space-y-1.5">
                <h3 className="font-display text-lg font-medium">{it.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{it.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
