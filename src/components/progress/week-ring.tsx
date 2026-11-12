/** Anillo de la meta semanal y los días con práctica (lunes a domingo). Sin rojo ni "perdiste". */
const DAYS = ["L", "M", "M", "J", "V", "S", "D"];
const DAY_NAMES = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];

export function WeekRing({ done, goal, days, size = 96 }: { done: number; goal: number; days: boolean[]; size?: number }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const ratio = Math.min(1, goal > 0 ? done / goal : 0);
  return (
    <div className="flex items-center gap-5">
      <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={`${done} de ${goal} prácticas esta semana`} className="shrink-0">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--border)" strokeWidth="9" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={ratio >= 1 ? "var(--success)" : "var(--primary)"}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={`${c * ratio} ${c}`}
          transform="rotate(-90 50 50)"
          className="motion-safe:transition-[stroke-dasharray] motion-safe:duration-700"
        />
        <text x="50" y="50" textAnchor="middle" dominantBaseline="central" className="fill-foreground font-display" fontSize="22" fontWeight="600">
          {done}/{goal}
        </text>
      </svg>
      <ul className="flex gap-1.5" aria-label="Días de esta semana con práctica">
        {DAYS.map((d, i) => (
          <li
            key={i}
            className={`flex size-8 items-center justify-center rounded-lg text-xs ${days[i] ? "bg-success-soft font-semibold text-mint-700" : "border border-border/70 text-muted-foreground"}`}
            aria-label={`${DAY_NAMES[i]}: ${days[i] ? "con práctica" : "sin práctica"}`}
          >
            {d}
          </li>
        ))}
      </ul>
    </div>
  );
}
