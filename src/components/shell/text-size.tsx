"use client";

import { useEffect, useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

type Size = "normal" | "grande" | "muy-grande";
const KEY = "tamano-texto";
const SCALE: Record<Size, string> = { normal: "", grande: "112.5%", "muy-grande": "125%" };

/** Antes de pintar: aplica el tamaño de letra guardado (todo el diseño usa rem y escala junto). */
export const TEXT_SIZE_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem("${KEY}");var m={"grande":"112.5%","muy-grande":"125%"};if(m[s])document.documentElement.style.fontSize=m[s]}catch(e){}})();`;

function applySize(s: Size) {
  document.documentElement.style.fontSize = SCALE[s];
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
function read(): Size {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "grande" || v === "muy-grande") return v;
  } catch {
    // Sin almacenamiento: normal.
  }
  return "normal";
}

/** Tamaño de la letra en este dispositivo. */
export function TextSizeToggle() {
  const size = useSyncExternalStore(subscribe, read, () => "normal" as Size);
  useEffect(() => applySize(size), [size]);
  const choose = (s: Size) => {
    try {
      localStorage.setItem(KEY, s);
    } catch {
      applySize(s);
    }
    listeners.forEach((l) => l());
  };
  const options: { value: Size; label: string; cls: string }[] = [
    { value: "normal", label: "Normal", cls: "text-sm" },
    { value: "grande", label: "Grande", cls: "text-base" },
    { value: "muy-grande", label: "Muy grande", cls: "text-lg" },
  ];
  return (
    <div role="radiogroup" aria-label="Tamaño de la letra" className="inline-flex flex-wrap gap-1 rounded-2xl border border-border/70 bg-card p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={size === o.value}
          onClick={() => choose(o.value)}
          className={cn(
            "inline-flex min-h-11 items-center rounded-xl px-3 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            o.cls,
            size === o.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
          )}
        >
          Aa <span className="ml-1.5 text-sm">{o.label}</span>
        </button>
      ))}
    </div>
  );
}
