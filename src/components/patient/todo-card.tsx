import Link from "next/link";
import { ArrowRight, BookOpen, ClipboardCheck, NotebookPen, Sparkles, type LucideIcon } from "lucide-react";

export type TodoItem = { kind: "ejercicio" | "material" | "test" | "cuadernillo"; title: string; href: string; note?: string | null; due?: string | null };

const ICON: Record<TodoItem["kind"], { icon: LucideIcon; label: string; tone: string }> = {
  ejercicio: { icon: Sparkles, label: "Ejercicio", tone: "bg-warning-soft text-warning-strong" },
  material: { icon: BookOpen, label: "Para leer", tone: "bg-info-soft text-info-strong" },
  test: { icon: ClipboardCheck, label: "Cuestionario", tone: "bg-primary-soft text-primary" },
  cuadernillo: { icon: NotebookPen, label: "Cuadernillo", tone: "bg-success-soft text-mint-700" },
};

/** Todo lo que el psicólogo le sugirió, en un solo lugar y a un toque. */
export function TodoCard({ items }: { items: TodoItem[] }) {
  if (!items.length) return null;
  return (
    <section aria-labelledby="todo-title" className="surface-card space-y-4 p-5">
      <div>
        <h2 id="todo-title" className="font-display text-xl font-medium">
          Lo que te sugirió tu psicólogo
        </h2>
        <p className="text-sm text-muted-foreground">
          {items.length === 1 ? "Tenés 1 cosa para hacer" : `Tenés ${items.length} cosas para hacer`} antes de la próxima sesión. A tu ritmo: lo que no llegues, lo charlan en sesión.
        </p>
      </div>
      <ul className="grid gap-2">
        {items.map((it, i) => {
          const { icon: Icon, label, tone } = ICON[it.kind];
          return (
            <li key={i}>
              <Link href={it.href} className="group flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-3 transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-ring">
                <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${tone}`}>
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs text-muted-foreground">
                    {label}
                    {it.due ? ` · hasta ${it.due}` : ""}
                  </span>
                  <span className="block font-medium">{it.title}</span>
                  {it.note ? <span className="block text-sm text-muted-foreground">«{it.note}»</span> : null}
                </span>
                <ArrowRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
