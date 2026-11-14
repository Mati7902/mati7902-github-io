"use client";

import { Bell, BellOff, Send } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { deletePushSubscriptionAction, getPushPublicKeyAction, saveReminderPrefsAction, savePushSubscriptionAction, sendTestPushAction } from "@/server/actions/push";

export type ReminderPrefsValue = { mood: boolean; habits: boolean; workbook: boolean; hour: number; days: number[] };

const DAYS = [
  { n: 1, label: "L" },
  { n: 2, label: "M" },
  { n: 3, label: "M" },
  { n: 4, label: "J" },
  { n: 5, label: "V" },
  { n: 6, label: "S" },
  { n: 7, label: "D" },
];
const DAY_NAMES = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];

function b64ToUint8(base64: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

type Support = "checking" | "ok" | "ios-install" | "unsupported";

async function registration(): Promise<ServiceWorkerRegistration> {
  return (await navigator.serviceWorker.getRegistration("/")) ?? (await navigator.serviceWorker.register("/sw.js", { scope: "/" }));
}

/** Activar las notificaciones en este dispositivo y elegir los recordatorios suaves. */
export function PushSettings({ initial, showPrefs = true }: { initial: ReminderPrefsValue; showPrefs?: boolean }) {
  const [support, setSupport] = useState<Support>("checking");
  const [subscribed, setSubscribed] = useState(false);
  const [denied, setDenied] = useState(false);
  const [prefs, setPrefs] = useState(initial);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    const next: Support = ios && !standalone ? "ios-install" : supported ? "ok" : "unsupported";
    const done = (s: Support, sub = false) => {
      setSupport(s);
      setSubscribed(sub);
      setDenied(supported && Notification.permission === "denied");
    };
    if (next !== "ok") return void Promise.resolve().then(() => done(next));
    navigator.serviceWorker
      .getRegistration("/")
      .then((r) => r?.pushManager.getSubscription())
      .then((s) => done("ok", Boolean(s)))
      .catch(() => done("ok"));
  }, []);

  const enable = () =>
    startTransition(async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setDenied(permission === "denied");
          return void toast.error("No diste permiso para las notificaciones.");
        }
        const key = await getPushPublicKeyAction();
        if (!key.ok) return void toast.error(key.error);
        const reg = await registration();
        await navigator.serviceWorker.ready;
        const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToUint8(key.data.key) }));
        const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
        const saved = await savePushSubscriptionAction({ endpoint: json.endpoint, keys: json.keys, userAgent: navigator.userAgent.slice(0, 300) });
        if (!saved.ok) return void toast.error(saved.error);
        setSubscribed(true);
        toast.success("Notificaciones activadas en este dispositivo.");
      } catch {
        toast.error("No se pudieron activar. Probá de nuevo o desde otro navegador.");
      }
    });

  const disable = () =>
    startTransition(async () => {
      const reg = await navigator.serviceWorker.getRegistration("/");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await deletePushSubscriptionAction(sub.endpoint);
        await sub.unsubscribe().catch(() => undefined);
      }
      setSubscribed(false);
      toast.success("Notificaciones desactivadas en este dispositivo.");
    });

  const test = () =>
    startTransition(async () => {
      const r = await sendTestPushAction();
      if (!r.ok) return void toast.error(r.error);
      if (r.data.sent === 0) toast.error("No se pudo enviar. Desactivalas y volvé a activarlas.");
      else toast.success("Enviada. Debería llegarte en unos segundos.");
    });

  const savePrefs = (next: ReminderPrefsValue) => {
    setPrefs(next);
    startTransition(async () => {
      const r = await saveReminderPrefsAction(next);
      if (!r.ok) toast.error(r.error);
    });
  };

  const anyReminder = prefs.mood || prefs.habits || prefs.workbook;

  return (
    <div className="space-y-5">
      <div className="surface-card space-y-3 p-4">
        {support === "checking" ? <p className="text-sm text-muted-foreground">Revisando este dispositivo…</p> : null}
        {support === "ios-install" ? (
          <p className="text-sm">
            En iPhone y iPad las notificaciones funcionan cuando la app está instalada: tocá <b>Compartir</b> y después <b>Agregar a pantalla de inicio</b>. Abrila desde ese ícono y volvé a esta sección.
          </p>
        ) : null}
        {support === "unsupported" ? <p className="text-sm text-muted-foreground">Este navegador no permite notificaciones. Probá con Chrome, Edge, Firefox o Safari actualizado.</p> : null}
        {support === "ok" ? (
          <>
            <p className="text-sm text-muted-foreground">
              {subscribed
                ? "Están activadas en este dispositivo. Te avisamos de tus turnos y de lo que elijas abajo."
                : "Recibí en este dispositivo los recordatorios de turnos y los que elijas abajo. Nunca mostramos detalles de tu tratamiento en la pantalla bloqueada."}
            </p>
            {denied ? <p className="text-sm text-warning-strong">El navegador tiene bloqueadas las notificaciones para este sitio. Habilitalas desde la configuración del navegador y volvé a intentar.</p> : null}
            <div className="flex flex-wrap gap-2">
              {subscribed ? (
                <>
                  <Button type="button" variant="outline" onClick={test} disabled={pending}>
                    <Send aria-hidden /> Enviar una de prueba
                  </Button>
                  <Button type="button" variant="ghost" onClick={disable} disabled={pending}>
                    <BellOff aria-hidden /> Desactivar
                  </Button>
                </>
              ) : (
                <Button type="button" onClick={enable} disabled={pending || denied}>
                  <Bell aria-hidden /> Activar notificaciones
                </Button>
              )}
            </div>
          </>
        ) : null}
      </div>

      {showPrefs ? (
        <fieldset className="space-y-4" disabled={pending}>
          <legend className="text-sm font-medium">Recordatorios suaves (opcionales)</legend>
          {(
            [
              ["mood", "Registrar cómo me siento"],
              ["habits", "Marcar mis hábitos"],
              ["workbook", "Seguir con mi cuadernillo"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center justify-between gap-4 text-sm">
              {label}
              <Switch checked={prefs[key]} onCheckedChange={(v) => savePrefs({ ...prefs, [key]: v })} />
            </label>
          ))}
          {anyReminder ? (
            <div className="space-y-3">
              <label className="flex flex-wrap items-center gap-3 text-sm">
                A las
                <select
                  className="h-10 rounded-lg border border-border bg-card px-2"
                  value={prefs.hour}
                  onChange={(e) => savePrefs({ ...prefs, hour: Number(e.target.value) })}
                >
                  {Array.from({ length: 16 }, (_, i) => i + 7).map((h) => (
                    <option key={h} value={h}>
                      {String(h).padStart(2, "0")}:00
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Días">
                {DAYS.map((d) => {
                  const on = prefs.days.includes(d.n);
                  return (
                    <button
                      key={d.n}
                      type="button"
                      aria-pressed={on}
                      aria-label={DAY_NAMES[d.n - 1]}
                      onClick={() => {
                        const days = on ? prefs.days.filter((x) => x !== d.n) : [...prefs.days, d.n].sort();
                        if (days.length) savePrefs({ ...prefs, days });
                      }}
                      className={`size-10 rounded-full border text-sm font-medium transition-colors ${on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"}`}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">Si ese día ya lo hiciste, no te llega. Llegan como máximo una vez por día.</p>
            </div>
          ) : null}
        </fieldset>
      ) : null}
    </div>
  );
}
