"use client";

import { Pause, Play, Square, Volume2 } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";

/** Quita la marca de formato simple (negritas, viñetas, títulos) para leer en voz alta. */
export function plainForSpeech(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-•]\s+/gm, "")
    .replace(/\[(.+?)\]\((.+?)\)/g, "$1")
    .replace(/\n{2,}/g, ". ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Una voz en español del dispositivo (prefiere es-419/es-AR/es-PY/es-MX; si no, cualquier es-*). */
export function spanishVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  const prefs = ["es-PY", "es-AR", "es-419", "es-MX", "es-US", "es-ES"];
  for (const p of prefs) {
    const v = voices.find((x) => x.lang.replace("_", "-").toLowerCase() === p.toLowerCase());
    if (v) return v;
  }
  return voices.find((v) => v.lang.toLowerCase().startsWith("es"));
}

const noop = () => () => {};
const isSupported = () => typeof window !== "undefined" && "speechSynthesis" in window;

/**
 * «Escuchar»: lee el texto con la voz del dispositivo (sin enviar nada a internet). Útil para
 * quien se cansa leyendo, tiene baja visión o prefiere escuchar.
 */
export function ReadAloud({ text, label = "Escuchar" }: { text: string; label?: string }) {
  const supported = useSyncExternalStore(noop, isSupported, () => false);
  const [state, setState] = useState<"idle" | "playing" | "paused">("idle");
  const utter = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => () => {
    if (utter.current) window.speechSynthesis.cancel();
  }, []);

  if (!supported) return null;

  const start = () => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(plainForSpeech(text));
    u.lang = "es-419";
    const v = spanishVoice();
    if (v) u.voice = v;
    u.rate = 0.95;
    u.onend = () => setState("idle");
    u.onerror = () => setState("idle");
    utter.current = u;
    window.speechSynthesis.speak(u);
    setState("playing");
  };

  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      {state === "idle" ? (
        <Button type="button" variant="soft" size="sm" onClick={start}>
          <Volume2 aria-hidden /> {label}
        </Button>
      ) : (
        <>
          {state === "playing" ? (
            <Button type="button" variant="soft" size="sm" onClick={() => (window.speechSynthesis.pause(), setState("paused"))}>
              <Pause aria-hidden /> Pausar
            </Button>
          ) : (
            <Button type="button" variant="soft" size="sm" onClick={() => (window.speechSynthesis.resume(), setState("playing"))}>
              <Play aria-hidden /> Seguir
            </Button>
          )}
          <Button type="button" variant="ghost" size="sm" onClick={() => (window.speechSynthesis.cancel(), setState("idle"))}>
            <Square aria-hidden /> Detener
          </Button>
        </>
      )}
    </div>
  );
}
