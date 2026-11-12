"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

type Mode = "claro" | "oscuro" | "auto";
const KEY = "tema";

/** Script que corre antes de pintar: evita el destello claro al cargar en modo oscuro. */
export const THEME_INIT_SCRIPT = `(function(){try{var m=localStorage.getItem("${KEY}");var d=m==="oscuro"||(m==="auto"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d)}catch(e){}})();`;

function apply(mode: Mode) {
  const dark = mode === "oscuro" || (mode === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}
function readMode(): Mode {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "oscuro" || v === "auto" || v === "claro") return v;
  } catch {
    // Sin almacenamiento: claro.
  }
  return "claro";
}

/** Claro, oscuro o según el dispositivo. Se guarda en este dispositivo. */
export function ThemeToggle() {
  // useSyncExternalStore: el servidor renderiza "claro" y el cliente pasa a lo guardado sin error de hidratación.
  const mode = useSyncExternalStore(subscribe, readMode, () => "claro" as Mode);

  useEffect(() => {
    apply(mode);
    if (mode !== "auto") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("auto");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [mode]);

  const choose = (m: Mode) => {
    try {
      localStorage.setItem(KEY, m);
    } catch {
      // Sin almacenamiento: se aplica solo en esta visita.
      apply(m);
    }
    listeners.forEach((l) => l());
  };

  const options: { value: Mode; label: string; icon: typeof Sun }[] = [
    { value: "claro", label: "Claro", icon: Sun },
    { value: "oscuro", label: "Oscuro", icon: Moon },
    { value: "auto", label: "Según el dispositivo", icon: Monitor },
  ];

  return (
    <div role="radiogroup" aria-label="Apariencia" className="inline-flex flex-wrap gap-1 rounded-2xl border border-border/70 bg-card p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={mode === o.value}
          onClick={() => choose(o.value)}
          className={cn(
            "inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            mode === o.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
          )}
        >
          <o.icon className="size-4" aria-hidden /> {o.label}
        </button>
      ))}
    </div>
  );
}
