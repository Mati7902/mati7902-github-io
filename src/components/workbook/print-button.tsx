"use client";

import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";

export function PrintButton({ label = "Imprimir o guardar PDF" }: { label?: string }) {
  return (
    <Button type="button" onClick={() => window.print()} className="wb-noprint">
      <Printer aria-hidden /> {label}
    </Button>
  );
}
