"use client";

import { useActionState, useId } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import type { ActionResult } from "@/lib/errors";
import { signOutAction } from "@/server/actions/auth";
import { verifySecondFactorAction } from "@/server/actions/mfa";

export function SecondFactorForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(verifySecondFactorAction, null);
  const id = useId();
  const error = state && !state.ok ? state.error : null;

  return (
    <div className="space-y-5">
      <form action={action} className="space-y-5" noValidate>
        {next ? <input type="hidden" name="next" value={next} /> : null}
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <FormField id={`${id}-code`} label="Código de 6 dígitos">
          <Input id={`${id}-code`} name="code" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} autoFocus required className="text-center text-2xl tracking-[0.4em] tabular-nums" />
        </FormField>
        <Button type="submit" size="lg" className="w-full" loading={pending}>
          Verificar e ingresar
        </Button>
      </form>
      <form action={signOutAction}>
        <Button type="submit" variant="ghost" className="w-full">
          Salir y entrar con otra cuenta
        </Button>
      </form>
      <p className="text-center text-xs text-muted-foreground">¿Perdiste el celular? El segundo factor se quita desde Supabase › Authentication › Users, en tu usuario.</p>
    </div>
  );
}
