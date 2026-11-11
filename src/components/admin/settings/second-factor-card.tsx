"use client";

import { ShieldCheck, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { confirmSecondFactorAction, disableSecondFactorAction, startSecondFactorAction } from "@/server/actions/mfa";

/** Verificación en dos pasos de la cuenta profesional (app de códigos: Google Authenticator, Authy, 1Password…). */
export function SecondFactorCard({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [setup, setSetup] = useState<{ factorId: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [disabling, setDisabling] = useState(false);

  const start = () =>
    startTransition(async () => {
      const res = await startSecondFactorAction();
      if (!res.ok) return void toast.error(res.error);
      setSetup(res.data);
      setCode("");
    });
  const confirm = () =>
    startTransition(async () => {
      if (!setup) return;
      const res = await confirmSecondFactorAction({ factorId: setup.factorId, code });
      if (!res.ok) return void toast.error(res.error);
      toast.success("Verificación en dos pasos activada.");
      setSetup(null);
      setCode("");
      router.refresh();
    });
  const disable = () =>
    startTransition(async () => {
      const res = await disableSecondFactorAction({ code });
      if (!res.ok) return void toast.error(res.error);
      toast.success("Verificación en dos pasos desactivada.");
      setDisabling(false);
      setCode("");
      router.refresh();
    });

  const codeInput = (
    <Input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000" aria-label="Código de 6 dígitos" className="h-11 w-36 text-center text-lg tracking-[0.3em] tabular-nums" />
  );

  return (
    <div className="space-y-4 rounded-2xl border border-border/70 bg-card p-5">
      <div className="flex items-start gap-3">
        {enabled ? <ShieldCheck className="mt-0.5 size-5 shrink-0 text-success" aria-hidden /> : <ShieldAlert className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden />}
        <div className="space-y-1">
          <p className="font-medium">{enabled ? "Verificación en dos pasos activa" : "Verificación en dos pasos desactivada"}</p>
          <p className="text-sm text-muted-foreground">
            {enabled
              ? "Al ingresar se pide, además de la contraseña, el código de tu app. Sin ese código nadie puede ver datos de pacientes con tu cuenta."
              : "Recomendado: además de la contraseña, se pide un código que cambia cada 30 segundos en tu celular. Protege las historias si alguien consigue tu contraseña."}
          </p>
        </div>
      </div>

      {!enabled && !setup ? (
        <Button type="button" onClick={start} loading={pending}>
          Activar
        </Button>
      ) : null}

      {setup ? (
        <div className="space-y-4 border-t border-divider pt-4">
          <ol className="list-decimal space-y-1 pl-5 text-sm">
            <li>Instalá una app de códigos en tu celular (Google Authenticator, Authy o similar).</li>
            <li>Escaneá este código QR con la app.</li>
            <li>Escribí acá el número de 6 dígitos que te muestra.</li>
          </ol>
          {/* El QR llega como imagen SVG en data: desde Supabase. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={setup.qr} alt="Código QR para la app de códigos" width={176} height={176} className="rounded-xl border border-border/70 bg-white p-2" />
          <p className="text-xs text-muted-foreground">
            ¿No podés escanear? Cargá esta clave a mano: <span className="break-all font-mono text-foreground">{setup.secret}</span>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {codeInput}
            <Button type="button" onClick={confirm} loading={pending} disabled={code.length !== 6}>
              Confirmar
            </Button>
            <Button type="button" variant="ghost" onClick={() => setSetup(null)} disabled={pending}>
              Cancelar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Si perdés el celular, el segundo factor se quita desde Supabase › Authentication › Users, en tu usuario. Guardá ese acceso en un lugar seguro.</p>
        </div>
      ) : null}

      {enabled && !disabling ? (
        <Button type="button" variant="outline" onClick={() => { setDisabling(true); setCode(""); }}>
          Desactivar
        </Button>
      ) : null}
      {enabled && disabling ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-divider pt-4">
          {codeInput}
          <Button type="button" variant="destructive" onClick={disable} loading={pending} disabled={code.length !== 6}>
            Desactivar
          </Button>
          <Button type="button" variant="ghost" onClick={() => setDisabling(false)} disabled={pending}>
            Cancelar
          </Button>
        </div>
      ) : null}
    </div>
  );
}
