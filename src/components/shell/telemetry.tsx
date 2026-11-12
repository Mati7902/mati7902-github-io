"use client";

import { useReportWebVitals } from "next/web-vitals";

/** Envía una métrica técnica sin bloquear la navegación. Nunca incluye contenido ni identidad. */
export function reportTech(kind: string, value: number) {
  try {
    const body = JSON.stringify({ kind, value, path: window.location.pathname, device: window.matchMedia("(max-width: 767px)").matches ? "mobile" : "desktop" });
    if (!navigator.sendBeacon?.("/api/telemetry", new Blob([body], { type: "application/json" }))) {
      void fetch("/api/telemetry", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true });
    }
  } catch {
    // La telemetría nunca debe romper la página.
  }
}

/** Mide Core Web Vitals reales (LCP, INP, CLS…) de quienes usan el sitio. */
export function WebVitals() {
  useReportWebVitals((metric) => {
    if (["LCP", "INP", "CLS", "FCP", "TTFB"].includes(metric.name)) reportTech(metric.name, metric.value);
  });
  return null;
}
