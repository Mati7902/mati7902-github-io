import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthCard } from "@/components/auth/auth-card";
import { SecondFactorForm } from "@/components/auth/second-factor-form";
import { requireSession, secondFactorPending } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Verificación en dos pasos", robots: { index: false } };

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const session = await requireSession();
  const { next } = await searchParams;
  if (!(await secondFactorPending())) redirect(session.isAdmin ? "/admin" : "/app");
  return (
    <AuthCard title="Verificación en dos pasos" subtitle="Abrí tu app de códigos e ingresá el número de 6 dígitos.">
      <SecondFactorForm next={next} />
    </AuthCard>
  );
}
